#!/usr/bin/env python3
"""Convert normalized recipe JSON into MealMind-compatible CookLang."""

# /// script
# requires-python = ">=3.11"
# dependencies = ["PyYAML>=6.0"]
# ///

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[3]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from cooklang_schema import build_recipe_cooklang, parse_ingredient, slugify  # noqa: E402
from recipe_jsonld import infer_meal_types, parse_iso_duration_minutes, parse_servings  # noqa: E402


def _as_string_list(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value] if value.strip() else []
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()]
    return []


def extract_quantity_and_name(ingredient: str) -> tuple[str, str, str]:
    """Compatibility wrapper for callers of the original converter helper."""
    parsed = parse_ingredient(ingredient)
    return parsed.quantity, parsed.unit, parsed.name


def format_ingredient_for_cooklang(raw: str) -> dict[str, str]:
    parsed = parse_ingredient(raw)
    return {
        "raw": raw,
        "quantity": parsed.quantity,
        "unit": parsed.unit,
        "name": parsed.name,
        "amount_str": parsed.amount,
    }


def _normalize_input(
    recipe_data: dict[str, Any],
    source_url: str = "",
    meal_type: str | None = None,
) -> dict[str, Any]:
    """Accept both the new normalized extractor output and its legacy field names."""
    normalized = dict(recipe_data)
    normalized["title"] = str(recipe_data.get("title") or recipe_data.get("name") or "Untitled Recipe")
    normalized["servings"] = parse_servings(
        recipe_data.get("servings", recipe_data.get("yield")),
    )
    normalized["meal_types"] = (
        [meal_type]
        if meal_type
        else _as_string_list(
            recipe_data.get("meal_types")
            or recipe_data.get("mealTypes")
            or infer_meal_types(recipe_data.get("category"))
        )
    )
    normalized["source"] = source_url or str(recipe_data.get("source") or recipe_data.get("source_url") or "")
    normalized["prep_time_minutes"] = recipe_data.get("prep_time_minutes")
    normalized["cook_time_minutes"] = recipe_data.get("cook_time_minutes")
    normalized["total_time_minutes"] = recipe_data.get("total_time_minutes")
    if normalized["prep_time_minutes"] is None:
        normalized["prep_time_minutes"] = parse_iso_duration_minutes(recipe_data.get("prep_time"))
    if normalized["cook_time_minutes"] is None:
        normalized["cook_time_minutes"] = parse_iso_duration_minutes(recipe_data.get("cook_time"))
    if normalized["total_time_minutes"] is None:
        normalized["total_time_minutes"] = parse_iso_duration_minutes(recipe_data.get("total_time"))
    if normalized["total_time_minutes"] is None and (
        normalized["prep_time_minutes"] is not None or normalized["cook_time_minutes"] is not None
    ):
        normalized["total_time_minutes"] = (normalized["prep_time_minutes"] or 0) + (
            normalized["cook_time_minutes"] or 0
        )
    normalized["ingredients"] = _as_string_list(
        recipe_data.get("ingredients") or recipe_data.get("recipeIngredient")
    )
    normalized["instructions"] = _as_string_list(recipe_data.get("instructions"))
    normalized["tags"] = _as_string_list(recipe_data.get("tags"))
    return normalized


def build_cooklang(
    recipe_data: dict[str, Any],
    source_url: str = "",
    meal_type: str | None = None,
) -> str:
    normalized = _normalize_input(recipe_data, source_url, meal_type)
    return build_recipe_cooklang(normalized)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", help="Normalized recipe JSON path, or '-' for stdin")
    parser.add_argument("--output", help="CookLang output path")
    parser.add_argument("--meal-type", choices=("lunch", "dinner"))
    parser.add_argument("--force", action="store_true", help="Replace an existing output file")
    args = parser.parse_args()

    try:
        if args.input == "-":
            recipe_data = json.load(sys.stdin)
        else:
            recipe_data = json.loads(Path(args.input).read_text(encoding="utf-8"))
        content = build_cooklang(recipe_data, meal_type=args.meal_type)
        output_path = Path(args.output or f"recipes/{slugify(str(recipe_data.get('title') or 'recipe'))}.cook")
        if output_path.exists() and not args.force:
            raise FileExistsError(f"Output already exists: {output_path}. Pass --force to replace it.")
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(content, encoding="utf-8", newline="\n")
        print(f"Written to {output_path}", file=sys.stderr)
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
