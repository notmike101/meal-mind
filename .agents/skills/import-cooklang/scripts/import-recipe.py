# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "requests>=2.31",
#   "lxml>=5.0",
#   "PyYAML>=6.0",
# ]
# ///

"""Import a public recipe URL into MealMind's CookLang format."""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path
from typing import Any

import requests
from lxml import etree

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
    parser = etree.HTMLParser(recover=True)
    tree = etree.fromstring(html.encode("utf-8"), parser)
    if tree is None:
        return None

    title_values = tree.xpath("//h1[1]//text()") or tree.xpath("//meta[@property='og:title']/@content")
    title = clean_html_text(" ".join(str(value) for value in title_values))
    if not title:
        return None

    description_values = tree.xpath("//meta[@name='description']/@content") or tree.xpath(
        "//meta[@property='og:description']/@content"
    )
    description = clean_html_text(description_values[0]) if description_values else ""
    lowercase = "translate(@class,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')"
    ingredient_nodes = tree.xpath(
        f"//*[contains({lowercase},'ingredient')]//li"
        f" | //*[contains({lowercase},'ingredient')][self::li]"
    )
    instruction_nodes = tree.xpath(
        f"//*[contains({lowercase},'instruction')]//li"
        f" | //*[contains({lowercase},'step')][self::li or self::p]"
    )
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
