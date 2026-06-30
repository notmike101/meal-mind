# /// script
# requires-python = ">=3.11"
# dependencies = ["requests>=2.31", "PyYAML>=6.0"]
# ///

"""Backfill local recipe images from CookLang source metadata."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import requests
import yaml

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from recipe_images import cache_recipe_image  # noqa: E402
from recipe_jsonld import extract_json_ld_documents, find_recipe_json_ld, normalize_recipe_json_ld  # noqa: E402

FRONTMATTER_PATTERN = re.compile(
    r"\A---\r?\n(?P<yaml>.*?)\r?\n---(?P<body>\r?\n[\s\S]*)\Z",
    re.DOTALL,
)


def backfill_recipe_image(recipe_path: Path, recipe_root: Path) -> str:
    content = recipe_path.read_text(encoding="utf-8")
    match = FRONTMATTER_PATTERN.match(content)
    if not match:
        return "invalid"
    metadata = yaml.safe_load(match.group("yaml")) or {}
    if not isinstance(metadata, dict) or not metadata.get("id"):
        return "invalid"
    if metadata.get("image"):
        return "existing"
    source = str(metadata.get("source") or "").strip()
    if not source:
        return "no-source"

    response = requests.get(
        source,
        headers={"User-Agent": "MealMind recipe image backfill/1.0"},
        timeout=30,
    )
    response.raise_for_status()
    recipe_data = find_recipe_json_ld(extract_json_ld_documents(response.text))
    if not recipe_data:
        return "no-image"
    normalized = normalize_recipe_json_ld(recipe_data, source)
    image_url = str(normalized.get("image_url") or "").strip()
    if not image_url:
        return "no-image"

    image = cache_recipe_image(image_url, recipe_root, str(metadata["id"]))
    if not image:
        return "no-image"
    yaml_text = match.group("yaml").rstrip() + f"\nimage: {image}\n"
    recipe_path.write_text(f"---\n{yaml_text}---{match.group('body')}", encoding="utf-8", newline="\n")
    return "cached"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("recipe_root", nargs="?", default="recipes")
    args = parser.parse_args()
    recipe_root = Path(args.recipe_root).resolve()
    counts: dict[str, int] = {}
    for recipe_path in sorted(recipe_root.rglob("*.cook")):
        try:
            result = backfill_recipe_image(recipe_path, recipe_root)
        except Exception as error:
            result = "failed"
            print(f"WARNING: {recipe_path}: {error}", file=sys.stderr)
        counts[result] = counts.get(result, 0) + 1
    summary = ", ".join(f"{key}={value}" for key, value in sorted(counts.items())) or "no recipes"
    print(f"Recipe image backfill complete: {summary}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
