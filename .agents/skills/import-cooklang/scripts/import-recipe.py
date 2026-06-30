# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "requests>=2.31",
# ]
# ///

"""Import a public recipe URL into MealMind's CookLang format."""

from __future__ import annotations

import argparse
import os
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

import requests


class _HtmlStripper(HTMLParser):
    """Convert HTML to plain text, preserving <li> boundaries for step extraction."""

    def __init__(self):
        super().__init__()
        self._parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self._parts.append(data)

    def get_text(self) -> str:
        return " ".join(self._parts)


def _html_to_text(html: str) -> str:
    """Strip HTML tags and extract clean text."""
    try:
        from xml.etree import ElementTree as ET  # type: ignore[import]

        tree = ET.fromstring("<root>" + html + "</root>")

        lines = []
        for li in tree.xpath(".//li"):
            text = "".join(li.itertext()).strip()
            if text:
                lines.append(re.sub(r"\s+", " ", text))

        if not lines:
            text = "".join(tree.itertext()).strip()
            for line in text.split("\n"):
                cleaned = re.sub(r"\s+", " ", line).strip()
                if cleaned:
                    lines.append(cleaned)

        return "\n".join(lines)
    except Exception:
        full = re.sub(r"<[^>]+>", " ", html)
        return "\n".join(re.sub(r"\s+", " ", line).strip() for line in full.split("\n") if line.strip())


def _extract_text_from_nodes(html: str, tag: str, attr_name: str | None = None, attr_value: str | None = None) -> list[str]:
    """Extract text from matching tags using xml.etree.ElementTree."""
    try:
        tree = ET.fromstring("<root>" + html + "</root>")

        xpath_parts = [tag]
        if attr_name and attr_value:
            xpath_parts.append(f"[@{attr_name}='{attr_value}']")
        xpath_parts.append("//text()")

        results = []
        for el in tree.xpath("".join(xpath_parts)):
            text = el.strip() if isinstance(el, str) else "".join(el.itertext()).strip()
            if text:
                results.append(text)

        return results
    except Exception:
        return []


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[3]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from cooklang_schema import build_recipe_cooklang, slugify  # noqa: E402
from recipe_jsonld import (  # noqa: E402
    clean_html_text,
    extract_json_ld_documents,
    find_recipe_json_ld,
    infer_meal_types,
    normalize_recipe_json_ld,
)
from recipe_images import cache_recipe_image  # noqa: E402


class RecipeExtractor:
    """Extract and normalize recipe data from JSON-LD or a basic DOM fallback."""

    def __init__(self, url: str, meal_type: str | None = None):
        self.url = url
        self.meal_type = meal_type
        self.html: str | None = None

    def fetch(self) -> str:
        if self.html is None:
            response = requests.get(
                self.url,
                headers={"User-Agent": "MealMind recipe importer/1.0"},
                timeout=30,
            )
            response.raise_for_status()
            self.html = response.text
        return self.html

    def extract_jsonld(self) -> dict[str, Any] | None:
        documents = extract_json_ld_documents(self.fetch())
        return find_recipe_json_ld(documents)

    def extract_from_jsonld(self, data: dict[str, Any]) -> dict[str, Any]:
        return normalize_recipe_json_ld(data, self.url, self.meal_type)


def _text_list(nodes: list[Any]) -> list[str]:
    values = []
    for node in nodes:
        value = clean_html_text(node.text_content() if hasattr(node, "text_content") else node)
        if value and value not in values:
            values.append(value)
    return values


def _scrape_from_dom(
    html: str, url: str, meal_type: str | None = None
) -> dict[str, Any] | None:
    """Small fallback for static pages without Recipe JSON-LD."""
    try:
        tree = ET.fromstring("<root>" + html + "</root>")
    except Exception:
        return None

    title_values = _extract_text_from_nodes(html, "h1") or _extract_text_from_nodes(
        html, "meta", "property", "og:title"
    )
    title = clean_html_text(" ".join(title_values))
    if not title:
        return None

    description_values = _extract_text_from_nodes(html, "meta", "name", "description") or _extract_text_from_nodes(
        html, "meta", "property", "og:description"
    )
    description = clean_html_text(description_values[0]) if description_values else ""
    image_values = _extract_text_from_nodes(html, "meta", "property", "og:image")

    # Find ingredient and instruction sections by class attribute
    lowercase_class = "@*[translate(name(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')]"
    try:
        ingredient_nodes = tree.xpath(
            f"//*[contains({lowercase_class}, 'ingredient')]//li | //*[contains({lowercase_class}, 'ingredient')][self::li]"
        )
        instruction_nodes = tree.xpath(
            f"//*[contains({lowercase_class}, 'instruction')]//li | //*[contains({lowercase_class}, 'step')][self::li or self::p]"
        )
    except Exception:
        ingredient_nodes = []
        instruction_nodes = []

    ingredients = _text_list(ingredient_nodes)
    instructions = _text_list(instruction_nodes)
    if not ingredients or not instructions:
        return None

    body_text = clean_html_text(" ".join(tree.xpath("//body//text()")))
    servings_match = re.search(r"(\d+)\s+servings?", body_text, flags=re.IGNORECASE)
    return {
        "title": title,
        "description": description,
        "source": url,
        "servings": int(servings_match.group(1)) if servings_match else 2,
        "meal_types": infer_meal_types("", meal_type),
        "tags": [],
        "ingredients": ingredients,
        "instructions": instructions,
        "nutrition": {},
        "image_url": str(image_values[0]).strip() if image_values else "",
    }


def _next_recipe_path(output_dir: str | os.PathLike[str], base_id: str) -> tuple[Path, str]:
    directory = Path(output_dir)
    candidate_id = base_id
    counter = 0
    while (directory / f"{candidate_id}.cook").exists():
        counter += 1
        candidate_id = f"{base_id}-{counter}"
    return directory / f"{candidate_id}.cook", candidate_id


def _save_recipe(recipe: dict[str, Any], output_dir: str = "recipes") -> dict[str, Any]:
    base_id = slugify(str(recipe["title"]))
    filepath, recipe_id = _next_recipe_path(output_dir, base_id)
    image_url = str(recipe.get("image_url") or "").strip()
    if image_url:
        try:
            image = cache_recipe_image(image_url, output_dir, recipe_id)
            if image:
                recipe = {**recipe, "image": image}
        except Exception as error:
            print(f"WARNING: Could not cache recipe image: {error}", file=sys.stderr)
    content = build_recipe_cooklang(recipe, recipe_id=recipe_id)

    filepath.parent.mkdir(parents=True, exist_ok=True)
    filepath.write_text(content, encoding="utf-8", newline="\n")
    print(f"Saved recipe to {filepath}")
    return {**recipe, "id": recipe_id, "path": str(filepath)}


def import_recipe_from_url(
    url: str,
    output_dir: str = "recipes",
    meal_type: str | None = None,
) -> dict[str, Any] | None:
    extractor = RecipeExtractor(url, meal_type)
    json_ld = extractor.extract_jsonld()
    if json_ld:
        print(f"Extracted Recipe JSON-LD from {url}")
        return _save_recipe(extractor.extract_from_jsonld(json_ld), output_dir)

    print("No Recipe JSON-LD found; attempting DOM scraping...")
    recipe = _scrape_from_dom(extractor.fetch(), url, meal_type)
    if recipe:
        return _save_recipe(recipe, output_dir)

    print(f"Could not extract recipe data from {url}", file=sys.stderr)
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url", help="Public recipe URL")
    parser.add_argument("output_dir", nargs="?", default="recipes")
    parser.add_argument("--meal-type", choices=("lunch", "dinner"))
    args = parser.parse_args()
    try:
        result = import_recipe_from_url(args.url, args.output_dir, args.meal_type)
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    return 0 if result else 1


if __name__ == "__main__":
    raise SystemExit(main())
