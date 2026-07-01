from __future__ import annotations

import asyncio
import inspect
import re
import time
from collections.abc import Awaitable, Callable
from typing import Any

from app.models.schemas import AnalysisResult, BatchItem, EmotionEnum, EmotionScore

import nltk
try:
    nltk.data.find('sentiment/vader_lexicon.zip')
except (LookupError, AttributeError):
    try:
        nltk.download('vader_lexicon', quiet=True)
    except Exception:
        pass

from nltk.sentiment.vader import SentimentIntensityAnalyzer
from textblob import TextBlob
from app.services.ml_classifier import SentixMLClassifier

try:
    vader_analyzer = SentimentIntensityAnalyzer()
except Exception:
    vader_analyzer = None

ml_classifier = SentixMLClassifier()



STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "but",
    "by",
    "for",
    "from",
    "has",
    "have",
    "i",
    "in",
    "is",
    "it",
    "its",
    "my",
    "of",
    "on",
    "or",
    "that",
    "the",
    "this",
    "to",
    "was",
    "we",
    "with",
    "you",
    "your",
}

JOY_WORDS = {
    "amazing", "awesome", "brilliant", "crisp", "excellent", "fantastic", "great", 
    "impressive", "love", "perfect", "reliable", "smooth", "stunning", "wonderful", 
    "bright", "fast", "sleek", "like", "likes", "liked", "good", "nice", "fine", 
    "happy", "pleased", "recommend", "recommended", "glad", "delighted", "loved", 
    "loves", "superb", "outstanding", "best", "perfectly", "well"
}
ANGER_WORDS = {
    "angry", "annoying", "bad", "broken", "buggy", "defective", "frustrating", 
    "horrible", "laggy", "poor", "slow", "terrible", "weak", "hate", "hated", 
    "hating", "dislike", "disliked", "annoyed", "mad", "worst"
}
SADNESS_WORDS = {
    "disappointed", "disappointing", "dull", "flat", "mediocre", "regret", "sad", 
    "underwhelming", "worse", "unhappy", "depressed", "sorry", "pity"
}
FEAR_WORDS = {"afraid", "anxious", "concerned", "fragile", "risky", "uncertain", "worried"}
SURPRISE_WORDS = {"astonishing", "unexpected", "remarkable", "surprising", "shock", "shocked", "wow"}
DISGUST_WORDS = {"dirty", "gross", "nasty", "offensive", "repulsive", "smelly", "ugh"}


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9']+", text.lower())


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def _build_raw_emotion_scores(tokens: list[str], custom_keywords: list[str] | None = None) -> dict[EmotionEnum, float]:
    # Baselines are balanced to ensure neutral sentiment outputs exactly 0.0:
    # positive = JOY (0.5) + 0.4 * SURPRISE (0.5) = 0.7
    # negative = ANGER (0.175) + SADNESS (0.175) + FEAR (0.175) + DISGUST (0.175) = 0.7
    # positive - negative = 0.0
    scores = {
        EmotionEnum.JOY: 0.5,
        EmotionEnum.ANGER: 0.175,
        EmotionEnum.SADNESS: 0.175,
        EmotionEnum.FEAR: 0.175,
        EmotionEnum.SURPRISE: 0.5,
        EmotionEnum.DISGUST: 0.175,
        EmotionEnum.NEUTRAL: 0.6,
    }

    for token in tokens:
        if token in JOY_WORDS:
            scores[EmotionEnum.JOY] += 1.8
            scores[EmotionEnum.SURPRISE] += 0.2
        if token in ANGER_WORDS:
            scores[EmotionEnum.ANGER] += 1.7
        if token in SADNESS_WORDS:
            scores[EmotionEnum.SADNESS] += 1.5
        if token in FEAR_WORDS:
            scores[EmotionEnum.FEAR] += 1.4
        if token in SURPRISE_WORDS:
            scores[EmotionEnum.SURPRISE] += 1.6
        if token in DISGUST_WORDS:
            scores[EmotionEnum.DISGUST] += 1.5

    for keyword in custom_keywords or []:
        normalized = keyword.lower().strip()
        if not normalized:
            continue
        if normalized in tokens:
            scores[EmotionEnum.JOY] += 0.8
            scores[EmotionEnum.NEUTRAL] += 0.15

    return scores


def _normalize_emotion_scores(raw_scores: dict[EmotionEnum, float]) -> list[EmotionScore]:
    total = sum(raw_scores.values()) or 1.0
    return [EmotionScore(emotion=emotion, score=_clamp(score / total, 0.0, 1.0)) for emotion, score in raw_scores.items()]


def _extract_tags(tokens: list[str], custom_keywords: list[str] | None = None) -> list[str]:
    tags: list[str] = []

    for token in tokens:
        if token in STOPWORDS or len(token) < 3:
            continue
        if token not in tags:
            tags.append(token)
        if len(tags) == 5:
            break

    for keyword in custom_keywords or []:
        normalized = keyword.lower().strip()
        if normalized and normalized not in tags:
            tags.append(normalized)
        if len(tags) == 5:
            break

    return tags or ["review"]


def _sentiment_from_scores(raw_scores: dict[EmotionEnum, float]) -> float:
    positive = raw_scores[EmotionEnum.JOY] + (0.4 * raw_scores[EmotionEnum.SURPRISE])
    negative = raw_scores[EmotionEnum.ANGER] + raw_scores[EmotionEnum.SADNESS] + raw_scores[EmotionEnum.FEAR] + raw_scores[EmotionEnum.DISGUST]
    denominator = max(1.0, positive + negative)
    sentiment = (positive - negative) / denominator
    return round(_clamp(sentiment, -1.0, 1.0), 3)


def _primary_emotion(raw_scores: dict[EmotionEnum, float]) -> EmotionEnum:
    return max(raw_scores, key=raw_scores.get)


def _confidence_score(tokens: list[str], raw_scores: dict[EmotionEnum, float]) -> float:
    dominant = max(raw_scores.values())
    richness = min(1.0, len(set(tokens)) / 18.0)
    confidence = 0.55 + (0.35 * dominant / max(sum(raw_scores.values()), 1.0)) + (0.1 * richness)
    return round(_clamp(confidence, 0.0, 1.0), 3)


def _summary(text: str, emotion: EmotionEnum, sentiment: float, tags: list[str]) -> str:
    tone = "positive" if sentiment > 0.15 else "negative" if sentiment < -0.15 else "mixed"
    focus = ", ".join(tags[:3]) if tags else "the product"
    return f"{tone.capitalize()} review with a {emotion.value.lower()} signal, centered on {focus}."


def build_demo_analysis_result(
    id: str,
    text: str,
    metadata: dict[str, Any] | None = None,
    custom_keywords: list[str] | None = None,
) -> AnalysisResult:
    tokens = _tokenize(text)
    raw_scores = _build_raw_emotion_scores(tokens, custom_keywords=custom_keywords)
    emotions = _normalize_emotion_scores(raw_scores)
    primary = _primary_emotion(raw_scores)
    rule_sentiment = _sentiment_from_scores(raw_scores)
    tags = _extract_tags(tokens, custom_keywords=custom_keywords)

    # Calculate VADER compound sentiment
    vader_compound = 0.0
    if vader_analyzer is not None:
        try:
            vader_scores = vader_analyzer.polarity_scores(text)
            vader_compound = float(vader_scores.get("compound", 0.0))
        except Exception:
            pass

    # Calculate Subjectivity using TextBlob
    subjectivity = 0.0
    try:
        blob = TextBlob(text)
        subjectivity = float(blob.sentiment.subjectivity)
    except Exception:
        pass

    # Calculate ML model sentiment prediction
    ml_sentiment = 0.0
    try:
        ml_sentiment = float(ml_classifier.predict(text))
    except Exception:
        pass

    # Blend them: VADER is highly reliable, ML sentiment is trained on synthetic corpus, and rule_sentiment is our keyword-based fallback.
    if vader_analyzer is not None:
        sentiment = 0.45 * vader_compound + 0.35 * ml_sentiment + 0.20 * rule_sentiment
    else:
        sentiment = 0.50 * ml_sentiment + 0.50 * rule_sentiment

    sentiment = round(_clamp(sentiment, -1.0, 1.0), 3)

    return AnalysisResult(
        id=id,
        text=text,
        sentiment=sentiment,
        primaryEmotion=primary,
        emotions=emotions,
        tags=tags,
        summary=_summary(text, primary, sentiment, tags),
        confidenceScore=_confidence_score(tokens, raw_scores),
        timestamp=int(time.time()),
        metadata=metadata,
        subjectivity=subjectivity,
        vaderCompound=vader_compound,
        mlSentiment=ml_sentiment,
    )


class SentixLLMService:
    async def analyze_text(self, text: str, metadata: dict[str, Any] | None = None) -> AnalysisResult:
        if not text.strip():
            raise ValueError("Text is required")

        # Run CPU-bound logic in a background thread to prevent event loop blocking
        return await asyncio.to_thread(
            build_demo_analysis_result,
            id="single-1",
            text=text,
            metadata=metadata,
            custom_keywords=None
        )

    async def analyze_batch(
        self,
        items: list[BatchItem],
        progress_callback: Callable[[int, int, AnalysisResult], Awaitable[None] | None] | None = None,
    ) -> list[AnalysisResult]:
        async def run_item(index: int, item: BatchItem) -> tuple[int, AnalysisResult]:
            result = await self.analyze_text(
                item.text,
                metadata=item.metadata | {"batchIndex": index},
            )
            result.id = item.id or f"row-{index + 1}"
            return index, result

        semaphore = asyncio.Semaphore(8)

        async def guarded_run(index: int, item: BatchItem) -> tuple[int, AnalysisResult]:
            async with semaphore:
                return await run_item(index, item)

        tasks = [asyncio.create_task(guarded_run(index, item)) for index, item in enumerate(items)]
        ordered_results: list[tuple[int, AnalysisResult]] = []
        completed = 0

        for future in asyncio.as_completed(tasks):
            index, result = await future
            ordered_results.append((index, result))
            completed += 1
            if progress_callback is not None:
                callback_result = progress_callback(completed, len(items), result)
                if inspect.isawaitable(callback_result):
                    await callback_result

        ordered_results.sort(key=lambda item: item[0])
        return [result for _, result in ordered_results]
