"""Safe local caching helpers for recipe images."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import requests

MAX_IMAGE_BYTES = 10 * 1024 * 1024
CONTENT_TYPE_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def cache_recipe_image(
    image_url: str,
    output_dir: str | os.PathLike[str],
    recipe_id: str,
    *,
    session: Any = requests,
) -> str | None:
    """Download a supported image and return its recipe-root-relative path."""
    parsed = urlparse(image_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None

    response = session.get(
        image_url,
        headers={"User-Agent": "MealMind recipe importer/1.0"},
        timeout=30,
        stream=True,
    )
    response.raise_for_status()
    content_type = response.headers.get("content-type", "").split(";", 1)[0].strip().lower()
    extension = CONTENT_TYPE_EXTENSIONS.get(content_type)
    if not extension:
        return None

    images_dir = Path(output_dir) / "images"
    images_dir.mkdir(parents=True, exist_ok=True)
    destination = images_dir / f"{recipe_id}{extension}"
    temporary = destination.with_suffix(destination.suffix + ".part")
    size = 0
    try:
        with temporary.open("wb") as image_file:
            for chunk in response.iter_content(chunk_size=64 * 1024):
                if not chunk:
                    continue
                size += len(chunk)
                if size > MAX_IMAGE_BYTES:
                    raise ValueError("Recipe image exceeds the 10 MB limit")
                image_file.write(chunk)
        if size == 0:
            raise ValueError("Recipe image is empty")
        temporary.replace(destination)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise
    finally:
        close = getattr(response, "close", None)
        if callable(close):
            close()

    return destination.relative_to(Path(output_dir)).as_posix()
