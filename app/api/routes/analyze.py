from __future__ import annotations

import asyncio
import inspect

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status

from app.api.dependencies import enforce_rate_limit
from app.models.schemas import BatchAnalysisRequest, BatchAnalysisResponse, SingleAnalysisRequest, BatchStatsRequest, BatchStatsResponse, TopicCluster, ForecastPoint
from app.services.llm_service import SentixLLMService
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.decomposition import LatentDirichletAllocation
import numpy as np
import io
import base64
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

def generate_eda_visualizations(results: list) -> dict[str, str]:
    plots = {
        "distribution_plot": "",
        "correlation_heatmap": "",
        "confusion_matrix": ""
    }
    if not results:
        return plots

    ratings = []
    day_diffs = []
    helpful_yes = []
    total_votes = []
    polarities = []
    true_sentiments = []
    pred_sentiments = []

    for r in results:
        meta = r.metadata or {}
        # Safely extract numeric fields
        try:
            rat_val = meta.get("overall") or meta.get("Rating")
            if rat_val is not None:
                ratings.append(float(rat_val))
        except Exception:
            pass

        try:
            dd_val = meta.get("day_diff")
            if dd_val is not None:
                day_diffs.append(float(dd_val))
        except Exception:
            pass

        try:
            hy_val = meta.get("helpful_yes")
            if hy_val is not None:
                helpful_yes.append(float(hy_val))
        except Exception:
            pass

        try:
            tv_val = meta.get("total_vote")
            if tv_val is not None:
                total_votes.append(float(tv_val))
        except Exception:
            pass

        try:
            pol_val = meta.get("Polarity")
            if pol_val is not None:
                polarities.append(float(pol_val))
        except Exception:
            pass

        true_s = meta.get("Sentiment") or meta.get("sentiment")
        if true_s is not None:
            true_sentiments.append(str(true_s).strip())

        pred_sentiments.append(r.sentiment)

    # 1. Distribution Plot (Ratings and Polarity)
    try:
        fig, axes = plt.subplots(1, 2, figsize=(10, 4))
        # Left plot: Ratings
        if ratings:
            axes[0].hist(ratings, bins=5, color='#00ff88', edgecolor='#14161a', alpha=0.8)
            axes[0].set_title("Distribution of Ratings", color='#e2e8f0', fontsize=12)
            axes[0].set_xlabel("Stars", color='#64748b')
            axes[0].set_ylabel("Count", color='#64748b')
        else:
            axes[0].text(0.5, 0.5, "No rating data available", color='#64748b', ha='center', va='center')
        
        # Right plot: Polarity
        if polarities:
            axes[1].hist(polarities, bins=10, color='#38bdf8', edgecolor='#14161a', alpha=0.8)
            axes[1].set_title("Distribution of Polarity", color='#e2e8f0', fontsize=12)
            axes[1].set_xlabel("Polarity Score", color='#64748b')
            axes[1].set_ylabel("Count", color='#64748b')
        else:
            axes[1].text(0.5, 0.5, "No polarity data available", color='#64748b', ha='center', va='center')

        for ax in axes:
            ax.set_facecolor('#14161a')
            ax.spines['bottom'].set_color('#2a2d33')
            ax.spines['top'].set_color('#2a2d33')
            ax.spines['left'].set_color('#2a2d33')
            ax.spines['right'].set_color('#2a2d33')
            ax.tick_params(colors='#e2e8f0')
            ax.grid(color='#2a2d33', linestyle='--', alpha=0.5)

        fig.patch.set_facecolor('#0a0a0a')
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', facecolor=fig.get_facecolor(), edgecolor='none', dpi=100)
        buf.seek(0)
        plots["distribution_plot"] = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
    except Exception:
        pass

    # 2. Correlation Heatmap
    try:
        data_dict = {}
        if ratings:
            data_dict["Rating"] = ratings
        if polarities:
            data_dict["True Polarity"] = polarities
        if day_diffs:
            data_dict["Day Diff"] = day_diffs
        if helpful_yes:
            data_dict["Helpful Yes"] = helpful_yes
        data_dict["Pred Sentiment"] = pred_sentiments

        min_len = min(len(v) for v in data_dict.values())
        if min_len >= 3:
            aligned_data = {k: v[:min_len] for k, v in data_dict.items()}
            df = pd.DataFrame(aligned_data)
            corr = df.corr()

            fig, ax = plt.subplots(figsize=(6, 5))
            cax = ax.matshow(corr, cmap='viridis', vmin=-1, vmax=1)
            fig.colorbar(cax)

            ax.set_xticks(np.arange(len(corr.columns)))
            ax.set_yticks(np.arange(len(corr.columns)))
            ax.set_xticklabels(corr.columns, rotation=45, ha='left', color='#e2e8f0')
            ax.set_yticklabels(corr.columns, color='#e2e8f0')

            for i in range(len(corr.columns)):
                for j in range(len(corr.columns)):
                    val = corr.iloc[i, j]
                    ax.text(j, i, f"{val:.2f}", ha='center', va='center', 
                            color='black' if abs(val) > 0.5 else 'white', fontweight='bold')

            ax.set_title("Numeric Correlation Matrix", color='#e2e8f0', fontsize=12, pad=20)
            fig.patch.set_facecolor('#0a0a0a')
            ax.set_facecolor('#14161a')
            plt.tight_layout()

            buf = io.BytesIO()
            plt.savefig(buf, format='png', facecolor=fig.get_facecolor(), edgecolor='none', dpi=100)
            buf.seek(0)
            plots["correlation_heatmap"] = base64.b64encode(buf.read()).decode('utf-8')
            plt.close(fig)
    except Exception:
        pass

    # 3. Confusion Matrix
    try:
        y_true = []
        y_pred = []
        for r in results:
            meta = r.metadata or {}
            true_s = meta.get("Sentiment") or meta.get("sentiment")
            if true_s:
                true_s = str(true_s).strip().capitalize()
                if true_s in ["Positive", "Negative"]:
                    y_true.append(1 if true_s == "Positive" else 0)
                    y_pred.append(1 if r.sentiment >= 0 else 0)

        if len(y_true) > 0:
            tp = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 1)
            fp = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 1)
            fn = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 0)
            tn = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 0)

            cm = np.array([[tn, fp], [fn, tp]])

            fig, ax = plt.subplots(figsize=(5, 4))
            ax.matshow(cm, cmap='Greens', alpha=0.3)

            for i in range(2):
                for j in range(2):
                    ax.text(j, i, str(cm[i, j]), va='center', ha='center', fontsize=14, color='#cbd5e1', fontweight='bold')

            ax.set_xticks([0, 1])
            ax.set_yticks([0, 1])
            ax.set_xticklabels(['Negative', 'Positive'], color='#e2e8f0')
            ax.set_yticklabels(['Negative', 'Positive'], color='#e2e8f0')
            ax.set_xlabel('Predicted Sentiment', color='#e2e8f0', labelpad=10)
            ax.set_ylabel('Actual Sentiment (True Label)', color='#e2e8f0', labelpad=10)
            ax.set_title('Supervised ML Confusion Matrix', color='#e2e8f0', fontsize=12, pad=20)
            
            fig.patch.set_facecolor('#0a0a0a')
            ax.set_facecolor('#14161a')
            plt.tight_layout()

            buf = io.BytesIO()
            plt.savefig(buf, format='png', facecolor=fig.get_facecolor(), edgecolor='none', dpi=100)
            buf.seek(0)
            plots["confusion_matrix"] = base64.b64encode(buf.read()).decode('utf-8')
            plt.close(fig)
        else:
            fig, ax = plt.subplots(figsize=(5, 4))
            ax.text(0.5, 0.5, "No true sentiment labels found in dataset\nto construct Confusion Matrix.", color='#64748b', ha='center', va='center')
            fig.patch.set_facecolor('#0a0a0a')
            ax.set_facecolor('#14161a')
            plt.tight_layout()
            buf = io.BytesIO()
            plt.savefig(buf, format='png', facecolor=fig.get_facecolor(), edgecolor='none', dpi=100)
            buf.seek(0)
            plots["confusion_matrix"] = base64.b64encode(buf.read()).decode('utf-8')
            plt.close(fig)
    except Exception:
        pass

    return plots


router = APIRouter(prefix="/analyze", tags=["analyze"])
service = SentixLLMService()


@router.post("/single", response_model=dict)
async def analyze_single(request: SingleAnalysisRequest, _: None = Depends(enforce_rate_limit)) -> dict:
    if not request.text.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Text is required.")

    result = await service.analyze_text(request.text, request.metadata)
    return result.model_dump(mode="json")


@router.post("/batch", response_model=list[dict])
async def analyze_batch(request: BatchAnalysisRequest, _: None = Depends(enforce_rate_limit)) -> list[dict]:
    if not request.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one batch item is required.")

    results = await service.analyze_batch(request.items)
    return [result.model_dump(mode="json") for result in results]


@router.websocket("/batch/ws")
async def analyze_batch_stream(websocket: WebSocket) -> None:
    await websocket.accept()

    try:
        payload = await websocket.receive_json()
        request = BatchAnalysisRequest.model_validate(payload)

        async def progress_callback(completed: int, total: int, latest_result) -> None:
            await websocket.send_json(
                {
                    "type": "progress",
                    "completed": completed,
                    "total": total,
                    "latestResult": latest_result.model_dump(mode="json"),
                }
            )

        results = await service.analyze_batch(request.items, progress_callback=progress_callback)
        await websocket.send_json({"type": "complete", "results": [result.model_dump(mode="json") for result in results]})
    except WebSocketDisconnect:
        return
    except Exception as exc:  # pragma: no cover - best-effort websocket fallback
        if websocket.client_state.name == "CONNECTED":
            await websocket.send_json({"type": "error", "message": str(exc)})


def _compute_batch_stats_sync(request: BatchStatsRequest) -> dict:
    results = request.results
    if not results:
        return {"topics": [], "forecast": []}

    # 1. Topic Modeling (LDA)
    texts = [r.text for r in results if r.text and r.text.strip()]
    topics = []

    if len(texts) >= 3:
        try:
            # Fit TF-IDF/Count vectorizer and run LDA
            vectorizer = CountVectorizer(stop_words="english", max_features=100)
            X = vectorizer.fit_transform(texts)

            n_components = min(3, len(texts))
            lda = LatentDirichletAllocation(n_components=n_components, random_state=42)
            doc_topic_dist = lda.fit_transform(X)

            feature_names = vectorizer.get_feature_names_out()
            dominant_topics = np.argmax(doc_topic_dist, axis=1)

            for topic_idx in range(n_components):
                topic_doc_indices = np.where(dominant_topics == topic_idx)[0]
                count = len(topic_doc_indices)
                percentage = float(count / len(texts)) if len(texts) > 0 else 0.0

                # Get top 5 words
                topic_words_idx = lda.components_[topic_idx].argsort()[:-6:-1]
                keywords = [feature_names[i] for i in topic_words_idx]

                topics.append(
                    TopicCluster(
                        topicId=topic_idx + 1,
                        keywords=keywords,
                        percentage=percentage,
                        count=count,
                    )
                )
        except Exception:
            pass

    # Fallback to default topic if not enough reviews or processing fails
    if not topics:
        topics = [
            TopicCluster(
                topicId=1,
                keywords=["review", "product", "quality"],
                percentage=1.0,
                count=len(results),
            )
        ]

    # 2. Sentiment Forecasting
    # Sort results by timestamp (or index)
    sorted_results = sorted(results, key=lambda x: x.timestamp or 0)

    history_points = []
    for idx, r in enumerate(sorted_results):
        history_points.append(
            ForecastPoint(index=idx + 1, sentiment=r.sentiment, isForecast=False)
        )

    forecast_points = []
    if len(history_points) >= 2:
        try:
            x = np.array([pt.index for pt in history_points])
            y = np.array([pt.sentiment for pt in history_points])

            # Fit y = mx + c
            A = np.vstack([x, np.ones(len(x))]).T
            m, c = np.linalg.lstsq(A, y, rcond=None)[0]

            last_idx = history_points[-1].index
            for step in range(1, 4):
                next_idx = last_idx + step
                pred_y = float(m * next_idx + c)
                pred_y = max(-1.0, min(1.0, pred_y))
                forecast_points.append(
                    ForecastPoint(
                        index=next_idx, sentiment=round(pred_y, 3), isForecast=True
                    )
                )
        except Exception:
            pass

    eda_plots = generate_eda_visualizations(results)

    return {
        "topics": [t.model_dump() for t in topics],
        "forecast": [hp.model_dump() for hp in history_points]
        + [fp.model_dump() for fp in forecast_points],
        "eda_plots": eda_plots,
    }


@router.post("/batch-stats", response_model=BatchStatsResponse)
async def get_batch_stats(request: BatchStatsRequest) -> dict:
    return await asyncio.to_thread(_compute_batch_stats_sync, request)


