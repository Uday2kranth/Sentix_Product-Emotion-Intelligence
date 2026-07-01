from __future__ import annotations

from typing import Any

from app.models.schemas import AnalysisResult, BatchItem
from app.services.analysis import SentixLLMService
from app.services.column_mapping import suggest_column_mapping


class LLMService:
    def __init__(self) -> None:
        self._analysis = SentixLLMService()

    async def analyze_single(self, text: str, metadata: dict[str, Any] | None = None) -> AnalysisResult:
        return await self._analysis.analyze_text(text, metadata=metadata)

    async def analyze_batch(self, items: list[BatchItem], progress_callback=None) -> list[AnalysisResult]:
        return await self._analysis.analyze_batch(items, progress_callback=progress_callback)

    async def suggest_columns(self, headers: list[str]) -> dict[str, str | None]:
        return suggest_column_mapping(headers)


llm_service = LLMService()
