"""Network safety helpers for server-side recipe imports."""

from __future__ import annotations

import ipaddress
import socket
from html import unescape
from typing import Any
from urllib.parse import urljoin, urlparse

import requests

MAX_RECIPE_HTML_BYTES = 5 * 1024 * 1024
MAX_REDIRECTS = 5


def validate_public_url(url: str, *, resolve_host: bool = True) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("Recipe URL must use HTTP or HTTPS.")
    if parsed.username or parsed.password:
        raise ValueError("Recipe URLs with embedded credentials are not allowed.")
    if not parsed.hostname:
        raise ValueError("Recipe URL must include a hostname.")

    if resolve_host:
        try:
            addresses = socket.getaddrinfo(parsed.hostname, parsed.port or (443 if parsed.scheme == "https" else 80), type=socket.SOCK_STREAM)
        except OSError as error:
            raise ValueError("Recipe host could not be resolved.") from error
        for address in addresses:
            ip = ipaddress.ip_address(address[4][0])
            if not ip.is_global:
                raise ValueError("Recipe URL must point to a public host.")

    return url


def _is_real_requests_session(session: Any) -> bool:
    return session is requests or isinstance(session, requests.Session)


def safe_request(
    url: str,
    *,
    session: Any = requests,
    headers: dict[str, str] | None = None,
    timeout: int = 30,
    stream: bool = False,
) -> requests.Response:
    current = url
    for _ in range(MAX_REDIRECTS + 1):
        validate_public_url(current, resolve_host=_is_real_requests_session(session))
        response = session.get(
            current,
            headers=headers,
            timeout=timeout,
            stream=stream,
            allow_redirects=False,
        )
        status_code = int(getattr(response, "status_code", 200))
        if status_code in {301, 302, 303, 307, 308}:
            location = response.headers.get("location")
            close = getattr(response, "close", None)
            if callable(close):
                close()
            if not location:
                raise ValueError("Recipe source returned a redirect without a location.")
            current = urljoin(current, location)
            continue
        return response
    raise ValueError("Recipe source redirected too many times.")


def fetch_recipe_html(url: str) -> str:
    response = safe_request(
        url,
        headers={"User-Agent": "MealMind recipe importer/1.0"},
        stream=True,
    )
    response.raise_for_status()
    content_length = response.headers.get("content-length")
    if content_length and int(content_length) > MAX_RECIPE_HTML_BYTES:
        response.close()
        raise ValueError("Recipe page exceeds the 5 MB limit.")

    chunks: list[bytes] = []
    size = 0
    try:
        for chunk in response.iter_content(chunk_size=64 * 1024):
            if not chunk:
                continue
            size += len(chunk)
            if size > MAX_RECIPE_HTML_BYTES:
                raise ValueError("Recipe page exceeds the 5 MB limit.")
            chunks.append(chunk)
    finally:
        response.close()
    encoding = response.encoding or "utf-8"
    return unescape(b"".join(chunks).decode(encoding, errors="replace"))
