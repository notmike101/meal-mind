"""Shared JSON-LD extraction and normalization helpers for recipe importers."""

from __future__ import annotations

import json
import re
from fractions import Fraction
from html import unescape
from html.parser import HTMLParser
from typing import Any, Iterable
from urllib.parse import urldefrag


class _JsonLdParser(HTMLParser):
    """Collect JSON-LD script bodies without parsing the rest of the DOM."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=False)
        self._capturing = False
        self._chunks: list[str] = []
        self.documents: list[Any] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "script":
            return
        attributes = {key.lower(): (value or "") for key, value in attrs}
        if attributes.get("type", "").lower() == "application/ld+json":
            self._capturing = True
            self._chunks = []

    def handle_data(self, data: str) -> None:
        if self._capturing:
            self._chunks.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() != "script" or not self._capturing:
            return
        self._capturing = False
        payload = "".join(self._chunks).strip()
        self._chunks = []
        if not payload:
            return
        try:
            self.documents.append(json.loads(payload))
        except (json.JSONDecodeError, TypeError):
            return


class _TextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def clean_html_text(value: Any) -> str:
    """Convert a small HTML fragment or scalar value to collapsed plain text."""
    if value is None:
        return ""
    text = str(value)
    parser = _TextParser()
    try:
        parser.feed(text)
        parser.close()
        text = " ".join(parser.parts)
    except Exception:
        text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", unescape(text)).strip()
    return re.sub(r"\s+([,.;:!?])", r"\1", text)


def extract_json_ld_documents(html: str) -> list[Any]:
    """Extract decoded JSON-LD documents from HTML in linear time."""
    parser = _JsonLdParser()
    parser.feed(html)
    parser.close()
    return parser.documents


def iter_json_ld_nodes(value: Any) -> Iterable[dict[str, Any]]:
    """Yield root objects plus objects nested in JSON-LD arrays and @graph."""
    if isinstance(value, list):
        for item in value:
            yield from iter_json_ld_nodes(item)
        return
    if not isinstance(value, dict):
        return
    yield value
    graph = value.get("@graph")
    if isinstance(graph, (dict, list)):
        yield from iter_json_ld_nodes(graph)


def json_ld_type_is(value: Any, expected: str) -> bool:
    types = value if isinstance(value, list) else [value]
    return any(isinstance(item, str) and item.lower() == expected.lower() for item in types)


def find_recipe_json_ld(documents: Iterable[Any]) -> dict[str, Any] | None:
    for document in documents:
        for node in iter_json_ld_nodes(document):
            if json_ld_type_is(node.get("@type"), "Recipe"):
                return node
    return None


def parse_iso_duration_minutes(value: Any) -> int | None:
    """Parse ISO-8601 or human-readable durations to whole minutes."""
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return max(0, round(value))
    text = str(value).strip()
    iso = re.fullmatch(
        r"P(?:(?P<days>\d+)D)?(?:T(?:(?P<hours>\d+)H)?(?:(?P<minutes>\d+)M)?)?",
        text,
        flags=re.IGNORECASE,
    )
    if iso:
        total = (
            int(iso.group("days") or 0) * 24 * 60
            + int(iso.group("hours") or 0) * 60
            + int(iso.group("minutes") or 0)
        )
        return total or None

    hours = re.search(r"(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b", text, re.IGNORECASE)
    minutes = re.search(r"(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m)\b", text, re.IGNORECASE)
    if hours or minutes:
        return round(float(hours.group(1)) * 60 if hours else 0) + round(
            float(minutes.group(1)) if minutes else 0
        )
    return int(text) if text.isdigit() else None


def parse_servings(value: Any, default: int = 2) -> int:
    if isinstance(value, (int, float)) and value > 0:
        return int(value)
    match = re.search(r"\d+", str(value or ""))
    return max(1, int(match.group(0))) if match else default


def _string_list(value: Any) -> list[str]:
    if isinstance(value, str):
        cleaned = clean_html_text(value)
        return [cleaned] if cleaned else []
    if isinstance(value, list):
        return [cleaned for item in value if (cleaned := clean_html_text(item))]
    return []


def flatten_instructions(value: Any) -> list[str]:
    """Flatten Recipe/HowToSection instruction shapes into ordered step text."""
    if isinstance(value, str):
        cleaned = clean_html_text(value)
        return [cleaned] if cleaned else []
    if isinstance(value, list):
        steps: list[str] = []
        for item in value:
            steps.extend(flatten_instructions(item))
        return steps
    if not isinstance(value, dict):
        return []

    for key in ("itemListElement", "steps", "recipeInstructions"):
        nested = value.get(key)
        if nested:
            return flatten_instructions(nested)

    text = clean_html_text(value.get("text") or value.get("description"))
    if text:
        return [text]
    name = clean_html_text(value.get("name"))
    return [name] if name else []


def _author_name(value: Any) -> str:
    if isinstance(value, str):
        return clean_html_text(value)
    if isinstance(value, dict):
        return clean_html_text(value.get("name"))
    if isinstance(value, list):
        names = [_author_name(item) for item in value]
        return ", ".join(name for name in names if name)
    return ""


def _image_url(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        return str(value.get("url") or value.get("contentUrl") or "")
    if isinstance(value, list) and value:
        return _image_url(value[0])
    return ""


def infer_meal_types(category: Any, override: str | None = None) -> list[str]:
    if override in {"lunch", "dinner"}:
        return [override]
    categories = " ".join(_string_list(category)).lower()
    if "lunch" in categories:
        return ["lunch"]
    return ["dinner"]


def _fraction_value(value: str) -> Fraction:
    unicode_fractions = {
        "¼": "1/4",
        "½": "1/2",
        "¾": "3/4",
        "⅓": "1/3",
        "⅔": "2/3",
        "⅛": "1/8",
        "⅜": "3/8",
        "⅝": "5/8",
        "⅞": "7/8",
    }
    text = value.strip()
    for symbol, replacement in unicode_fractions.items():
        if symbol in text:
            text = text.replace(symbol, f" {replacement}").strip()
    if " " in text:
        whole, fraction = text.split(maxsplit=1)
        return Fraction(whole) + Fraction(fraction)
    return Fraction(text)


def _format_fraction(value: Fraction) -> str:
    if value.denominator == 1:
        return str(value.numerator)
    whole, numerator = divmod(value.numerator, value.denominator)
    fraction = f"{numerator}/{value.denominator}"
    return f"{whole} {fraction}" if whole else fraction


def infer_measured_pantry_ingredients(
    instructions: list[str], source_ingredients: list[str]
) -> list[dict[str, Any]]:
    """Infer explicitly measured pantry staples omitted from source JSON-LD."""
    pantry_names = (
        "black pepper",
        "olive oil",
        "vegetable oil",
        "cooking oil",
        "butter",
        "pepper",
        "salt",
        "sugar",
    )
    measurable_unit = r"(?:tablespoons?|tbsp|teaspoons?|tsp|cups?|ounces?|oz)"
    missing_names = []
    for name in pantry_names:
        matching_sources = [
            ingredient
            for ingredient in source_ingredients
            if re.search(rf"\b{re.escape(name)}\b", ingredient, re.IGNORECASE)
        ]
        if not matching_sources or not any(
            re.search(rf"\b{measurable_unit}\b", ingredient, re.IGNORECASE)
            for ingredient in matching_sources
        ):
            missing_names.append(name)
    if not missing_names:
        return []

    unit_aliases = {
        "tablespoon": "tbsp",
        "tablespoons": "tbsp",
        "tbsp": "tbsp",
        "teaspoon": "tsp",
        "teaspoons": "tsp",
        "tsp": "tsp",
        "cup": "cup",
        "cups": "cup",
        "ounce": "oz",
        "ounces": "oz",
        "oz": "oz",
    }
    quantities: dict[tuple[str, str], Fraction] = {}
    uses: dict[tuple[str, str], list[str]] = {}
    units_by_name: dict[str, set[str]] = {}
    amount = r"(?:\d+\s+\d+/\d+|\d+/\d+|\d+(?:\.\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])"
    units = "|".join(sorted((re.escape(unit) for unit in unit_aliases), key=len, reverse=True))
    names = "|".join(sorted((re.escape(name) for name in missing_names), key=len, reverse=True))
    pattern = re.compile(
        rf"\b(?P<amount>{amount})\s+(?P<unit>{units})\s+(?P<name>{names})\b",
        re.IGNORECASE,
    )

    for instruction in instructions:
        cleaned = re.sub(
            r"\s*\([^)]*\bfor\s+\d+\s+servings?[^)]*\)",
            "",
            instruction,
            flags=re.IGNORECASE,
        )
        for match in pattern.finditer(cleaned):
            name = match.group("name").lower()
            unit = unit_aliases[match.group("unit").lower()]
            try:
                value = _fraction_value(match.group("amount"))
            except (ValueError, ZeroDivisionError):
                continue
            quantities[(name, unit)] = quantities.get((name, unit), Fraction()) + value
            uses.setdefault((name, unit), []).append(_format_fraction(value))
            units_by_name.setdefault(name, set()).add(unit)

    inferred: list[dict[str, Any]] = []
    for (name, unit), quantity in quantities.items():
        if len(units_by_name[name]) != 1:
            continue
        inferred.append(
            {
                "name": name,
                "quantity": _format_fraction(quantity),
                "unit": unit,
                "uses": [
                    {"quantity": use_quantity, "unit": unit}
                    for use_quantity in uses[(name, unit)]
                ],
            }
        )
    return inferred


def normalize_recipe_json_ld(
    recipe_data: dict[str, Any],
    source_url: str = "",
    meal_type_override: str | None = None,
) -> dict[str, Any]:
    """Normalize Schema.org Recipe JSON-LD for the CookLang formatter."""
    title = clean_html_text(recipe_data.get("name"))
    if not title:
        raise ValueError("Recipe JSON-LD is missing a name")

    category = recipe_data.get("recipeCategory")
    cuisine = recipe_data.get("recipeCuisine")
    tags = list(dict.fromkeys(_string_list(cuisine) + _string_list(category)))
    raw_source = source_url or str(recipe_data.get("url") or recipe_data.get("@id") or "")
    source = urldefrag(raw_source)[0]
    prep_minutes = parse_iso_duration_minutes(recipe_data.get("prepTime"))
    cook_minutes = parse_iso_duration_minutes(recipe_data.get("cookTime"))
    total_minutes = parse_iso_duration_minutes(recipe_data.get("totalTime"))
    if total_minutes is None and (prep_minutes is not None or cook_minutes is not None):
        total_minutes = (prep_minutes or 0) + (cook_minutes or 0)

    nutrition = recipe_data.get("nutrition")
    if isinstance(nutrition, dict):
        nutrition = {key: value for key, value in nutrition.items() if key != "@type"}
    else:
        nutrition = {}

    rating = recipe_data.get("aggregateRating")
    rating = rating if isinstance(rating, dict) else {}
    ingredients = recipe_data.get("recipeIngredient")
    ingredients = _string_list(ingredients)
    instructions = flatten_instructions(recipe_data.get("recipeInstructions"))

    return {
        "title": title,
        "description": clean_html_text(recipe_data.get("description")),
        "author": _author_name(recipe_data.get("author")),
        "source": source,
        "servings": parse_servings(recipe_data.get("recipeYield")),
        "meal_types": infer_meal_types(category, meal_type_override),
        "total_time_minutes": total_minutes,
        "prep_time_minutes": prep_minutes,
        "cook_time_minutes": cook_minutes,
        "total_time": recipe_data.get("totalTime") or "",
        "prep_time": recipe_data.get("prepTime") or "",
        "cook_time": recipe_data.get("cookTime") or "",
        "yield": recipe_data.get("recipeYield") or "",
        "category": category or "",
        "cuisine": cuisine or "",
        "tags": tags,
        "image_url": _image_url(recipe_data.get("image")),
        "rating_value": rating.get("ratingValue", ""),
        "rating_count": rating.get("ratingCount", ""),
        "ingredients": ingredients,
        "inferred_ingredients": infer_measured_pantry_ingredients(instructions, ingredients),
        "instructions": instructions,
        "nutrition": nutrition,
    }
