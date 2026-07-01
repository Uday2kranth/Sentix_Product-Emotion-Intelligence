from __future__ import annotations

from dataclasses import dataclass
import re


@dataclass(slots=True)
class HeaderMatchRule:
    field: str
    keywords: tuple[str, ...]


REVIEW_RULE = HeaderMatchRule(
    field="reviewColumn",
    keywords=("review", "comment", "feedback", "opinion", "content", "text", "message", "remark"),
)
PRODUCT_RULE = HeaderMatchRule(
    field="productName",
    keywords=("product", "product name", "item", "item name", "device", "device name", "title", "product title"),
)
BRAND_RULE = HeaderMatchRule(
    field="brand",
    keywords=("brand", "manufacturer", "maker", "label"),
)
MODEL_RULE = HeaderMatchRule(
    field="modelNumber",
    keywords=("model", "sku", "part", "serial", "number", "no"),
)


def _normalize(header: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", header.lower()).strip()


def _score_header(header: str, keywords: tuple[str, ...]) -> int:
    normalized = _normalize(header)
    score = 0
    for keyword in keywords:
        if normalized == keyword:
            score += 4
        elif keyword in normalized:
            score += 2
        elif any(part == keyword for part in normalized.split()):
            score += 1
    return score


def _best_match(headers: list[str], keywords: tuple[str, ...], minimum_score: int = 2) -> str | None:
    best_header: str | None = None
    best_score = minimum_score - 1

    for header in headers:
        score = _score_header(header, keywords)
        if score > best_score:
            best_score = score
            best_header = header

    return best_header if best_score >= minimum_score else None


def suggest_column_mapping(headers: list[str]) -> dict[str, str | None]:
    return {
        REVIEW_RULE.field: _best_match(headers, REVIEW_RULE.keywords, minimum_score=2),
        PRODUCT_RULE.field: _best_match(headers, PRODUCT_RULE.keywords, minimum_score=2),
        BRAND_RULE.field: _best_match(headers, BRAND_RULE.keywords, minimum_score=2),
        MODEL_RULE.field: _best_match(headers, MODEL_RULE.keywords, minimum_score=2),
    }
