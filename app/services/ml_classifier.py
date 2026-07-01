from __future__ import annotations

import os
import re
from typing import Any
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# Default synthetic corpus for out-of-the-box training and fallback
DEFAULT_TRAINING_CORPUS = [
    # Positive reviews
    ("Excellent product! Very reliable and works perfectly.", 1),
    ("Amazing battery life and very fast performance. Love it!", 1),
    ("Sleek design, beautiful screen, and outstanding quality.", 1),
    ("Best purchase I have made in a long time. Highly recommend.", 1),
    ("Super easy to set up and very quiet. Works like a charm.", 1),
    ("Brilliant sound quality and very comfortable to wear.", 1),
    ("Exceeded my expectations. Exceptional customer support as well.", 1),
    ("Very durable and high-quality materials. Outstanding value.", 1),
    ("Smooth operation and beautiful aesthetic. Perfectly fits.", 1),
    ("Fast delivery and works great. 5 stars!", 1),
    ("Wonderful experience, very pleased with the build quality.", 1),
    ("Impressive features, works smoothly without any issues.", 1),
    ("Absolutely love this laptop. Highly responsive and light.", 1),
    ("Great design, clear display, and highly satisfying.", 1),
    ("Top notch material, very stable and reliable.", 1),
    
    # Negative reviews
    ("Worst product ever. Arrived defective and broken.", 0),
    ("Terrible battery life and extremely slow. Avoid at all costs.", 0),
    ("Very poor quality and cheap plastic build. Disappointed.", 0),
    ("Waste of money. It stopped working after two days.", 0),
    ("Laggy performance and very loud fan noise. Frustrating.", 0),
    ("Awful sound quality, static noise, and uncomfortable design.", 0),
    ("Terrible customer support. They refused to refund my money.", 0),
    ("Fragile build, broke immediately. Not worth the high price.", 0),
    ("Extremely disappointed. Glitchy software and constant crashes.", 0),
    ("Slow shipping and the item did not work. Horrible purchase.", 0),
    ("Underwhelming performance, flat screen, very weak materials.", 0),
    ("Defective charge port, constant connection drops. Broken.", 0),
    ("The charger got extremely hot and burned out. Dangerous.", 0),
    ("Terrible build, hard to use, and completely useless instructions.", 0),
    ("Very low quality, scratchy material, returned it immediately.", 0),
]

class SentixMLClassifier:
    def __init__(self, model_dir: str = None) -> None:
        if model_dir is None:
            # Default to backend/app/resources/
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            self.model_dir = os.path.join(base_dir, "resources")
        else:
            self.model_dir = model_dir
            
        self.model_path = os.path.join(self.model_dir, "sentix_ml_model.joblib")
        self.vectorizer: TfidfVectorizer | None = None
        self.classifier: LogisticRegression | None = None
        
        # Load or initialize the model
        self.load_or_train()

    def _preprocess(self, text: str) -> str:
        # Lowercase and clean text
        text = text.lower().strip()
        text = re.sub(r"[^a-z0-9'\s]", "", text)
        return text

    def load_or_train(self) -> None:
        """Loads model from disk, or trains on default synthetic data if missing."""
        if os.path.exists(self.model_path):
            try:
                data = joblib.load(self.model_path)
                self.vectorizer = data["vectorizer"]
                self.classifier = data["classifier"]
                return
            except Exception:
                # Fallback to train if load fails
                pass
                
        # Train and save default model
        self.train_default_model()

    def train_default_model(self) -> None:
        """Trains on default corpus and saves the model."""
        texts = [item[0] for item in DEFAULT_TRAINING_CORPUS]
        labels = [item[1] for item in DEFAULT_TRAINING_CORPUS]
        self.train(texts, labels)

    def train(self, texts: list[str], labels: list[int]) -> None:
        """Trains the TF-IDF + LogisticRegression model and serializes it."""
        if not os.path.exists(self.model_dir):
            os.makedirs(self.model_dir, exist_ok=True)
            
        preprocessed = [self._preprocess(t) for t in texts]
        
        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1)
        X = self.vectorizer.fit_transform(preprocessed)
        
        self.classifier = LogisticRegression(C=1.0)
        self.classifier.fit(X, labels)
        
        # Save model
        joblib.dump(
            {"vectorizer": self.vectorizer, "classifier": self.classifier},
            self.model_path
        )

    def predict(self, text: str) -> float:
        """Predicts sentiment polarity score between -1.0 and +1.0."""
        if not text.strip() or self.vectorizer is None or self.classifier is None:
            return 0.0
            
        clean_text = self._preprocess(text)
        X = self.vectorizer.transform([clean_text])
        
        # Get probability of positive class (class 1)
        prob = self.classifier.predict_proba(X)[0][1]
        
        # Map [0, 1] probability range to [-1.0, 1.0] polarity score
        sentiment = 2.0 * prob - 1.0
        return round(sentiment, 3)
