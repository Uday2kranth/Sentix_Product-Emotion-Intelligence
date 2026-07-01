from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies import enforce_rate_limit
from app.models.schemas import ColumnSuggestionRequest, ColumnSuggestionResponse
from app.services.column_mapping import suggest_column_mapping


router = APIRouter(prefix="/dataset", tags=["dataset"])


@router.post("/suggest-columns", response_model=ColumnSuggestionResponse)
async def suggest_columns(request: ColumnSuggestionRequest, _: None = Depends(enforce_rate_limit)) -> ColumnSuggestionResponse:
    return ColumnSuggestionResponse(**suggest_column_mapping(request.headers))
