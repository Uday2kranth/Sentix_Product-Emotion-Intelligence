from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


class EmotionEnum(str, Enum):
    JOY = "JOY"
    ANGER = "ANGER"
    SADNESS = "SADNESS"
    FEAR = "FEAR"
    SURPRISE = "SURPRISE"
    DISGUST = "DISGUST"
    NEUTRAL = "NEUTRAL"


class EmotionScore(BaseModel):
    emotion: EmotionEnum
    score: float = Field(..., ge=0, le=1)


class AnalysisResult(BaseModel):
    id: str
    text: str
    sentiment: float = Field(..., ge=-1, le=1)
    primaryEmotion: EmotionEnum
    emotions: list[EmotionScore]
    tags: list[str]
    summary: str
    confidenceScore: float = Field(..., ge=0, le=1)
    timestamp: int
    metadata: dict[str, Any] | None = None
    subjectivity: float | None = None
    vaderCompound: float | None = None
    mlSentiment: float | None = None



class SingleAnalysisRequest(BaseModel):
    text: str
    metadata: dict[str, Any] | None = None


class BatchItem(BaseModel):
    id: str | None = None
    text: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class BatchAnalysisRequest(BaseModel):
    items: list[BatchItem]


class BatchAnalysisResponse(BaseModel):
    results: list[AnalysisResult]


class ColumnSuggestionRequest(BaseModel):
    headers: list[str]


class ColumnSuggestionResponse(BaseModel):
    reviewColumn: str | None = None
    productName: str | None = None
    brand: str | None = None
    modelNumber: str | None = None


class BatchStatsRequest(BaseModel):
    results: list[AnalysisResult]


class TopicCluster(BaseModel):
    topicId: int
    keywords: list[str]
    percentage: float
    count: int


class ForecastPoint(BaseModel):
    index: int
    sentiment: float
    isForecast: bool


class BatchStatsResponse(BaseModel):
    topics: list[TopicCluster]
    forecast: list[ForecastPoint]
    eda_plots: dict[str, str] | None = None


