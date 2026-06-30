#!/usr/bin/env python3
"""Extract normalized recipe data from a HelloFresh Recipe JSON-LD block."""

# /// script
# requires-python = ">=3.11"
# dependencies = ["requests>=2.31"]
# ///

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import requests

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[3]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from recipe_jsonld import extract_json_ld_documents, find_recipe_json_ld, normalize_recipe_json_ld  # noqa: E402


def fetch_html(url: str, timeout: int = 30) -> str:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/125.0.0.0 Safari/537.36"
        )
    }
    response = requests.get(url, headers=headers, timeout=timeout)
    response.raise_for_status()
    return response.text


def extract_json_ld(html: str) -> list[dict[str, Any]]:
    """Compatibility wrapper returning flattened JSON-LD objects."""
    from recipe_jsonld import iter_json_ld_nodes

    return [node for document in extract_json_ld_documents(html) for node in iter_json_ld_nodes(document)]


def parse_recipe_ld(
    recipe_data: dict[str, Any],
    source_url: str = "",
    meal_type: str | None = None,
) -> dict[str, Any]:
    return normalize_recipe_json_ld(recipe_data, source_url, meal_type)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url", help="HelloFresh recipe URL")
    parser.add_argument("--output", help="Write normalized JSON to this path")
    parser.add_argument("--pretty", action="store_true")
    parser.add_argument("--meal-type", choices=("lunch", "dinner"))
    args = parser.parse_args()

    try:
        html = fetch_html(args.url)
        recipe_ld = find_recipe_json_ld(extract_json_ld_documents(html))
        if recipe_ld is None:
            print("ERROR: No Recipe JSON-LD found", file=sys.stderr)
            return 1
        result = parse_recipe_ld(recipe_ld, args.url, args.meal_type)
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1

    output = json.dumps(result, indent=2 if args.pretty else None, ensure_ascii=False) + "\n"
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(output, encoding="utf-8", newline="\n")
        print(f"Written to {output_path}", file=sys.stderr)
    else:
        sys.stdout.write(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
