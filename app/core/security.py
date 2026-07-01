from __future__ import annotations

from fastapi import Request


def get_client_ip(request: Request) -> str:
    if request.client and request.client.host:
        return request.client.host
    return "anonymous"
