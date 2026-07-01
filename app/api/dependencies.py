from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from time import monotonic

from fastapi import HTTPException, Request, status

from app.core.config import get_settings


@dataclass(slots=True)
class RateLimitConfig:
    max_requests: int
    window_seconds: int


_REQUEST_LOG: dict[str, deque[float]] = defaultdict(deque)


def rate_limit_config() -> RateLimitConfig:
    settings = get_settings()
    return RateLimitConfig(max_requests=settings.rate_limit_max_requests, window_seconds=settings.rate_limit_window_seconds)


async def enforce_rate_limit(request: Request) -> None:
    settings = rate_limit_config()
    client_ip = request.client.host if request.client else "anonymous"
    now = monotonic()
    bucket = _REQUEST_LOG[client_ip]

    while bucket and now - bucket[0] > settings.window_seconds:
        bucket.popleft()

    if len(bucket) >= settings.max_requests:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded. Please try again later.")

    bucket.append(now)
