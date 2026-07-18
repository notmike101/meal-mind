# /// script
# requires-python = ">=3.11"
# dependencies = ["PyYAML>=6.0", "requests>=2.31"]
# ///

from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from cooklang_schema import (  # noqa: E402
    build_recipe_cooklang,
    parse_cooklang_ingredients,
    parse_ingredient,
    validate_cooklang,
)
from recipe_jsonld import (  # noqa: E402
    extract_json_ld_documents,
    find_recipe_json_ld,
    infer_measured_pantry_ingredients,
    normalize_recipe_json_ld,
    parse_iso_duration_minutes,
)
from recipe_images import cache_recipe_image  # noqa: E402
import recipe_security  # noqa: E402

CONVERTER_PATH = REPO_ROOT / ".agents/skills/hellofresh-scraper/scripts/convert-to-cooklang.py"
CONVERTER_SPEC = importlib.util.spec_from_file_location("hellofresh_convert", CONVERTER_PATH)
if CONVERTER_SPEC is None or CONVERTER_SPEC.loader is None:
    raise RuntimeError("Could not load the HelloFresh CookLang converter")
CONVERTER = importlib.util.module_from_spec(CONVERTER_SPEC)
CONVERTER_SPEC.loader.exec_module(CONVERTER)


HELLOFRESH_RECIPE = {
    "title": "Sweet Soy Honey Chicken with Green Beans & Jasmine Rice",
    "description": "A fast sweet and savory chicken dinner.",
    "author": "Michelle Doll Olson",
    "source": "https://www.hellofresh.com/recipes/sweet-soy-honey-chicken-65de5296d860e00c933db202",
    "servings": 2,
    "meal_types": ["dinner"],
    "total_time_minutes": 20,
    "tags": ["East Asian"],
    "nutrition": {"calories": "590 kcal", "proteinContent": "38 g"},
    "ingredients": [
        "10 ounce Chopped Chicken Breast",
        "8 ounce Green Beans",
        "½ cup Jasmine Rice",
        "4 tablespoon Sweet Soy Glaze",
        "2 teaspoon Honey",
        "1 tablespoon Sesame Seeds",
        "2 unit Scallions",
        "1 teaspoon Sriracha",
        "1 ounce Ginger Paste",
        "teaspoon (tsp) Salt",
        "1 tablespoon (tbsp) Cooking Oil",
        "teaspoon (tsp) Black Pepper",
    ],
    "instructions": [
        "Adjust rack to top position and preheat oven to 425 degrees. In a small pot, combine rice, ¾ cup water (1½ cups for 4 servings), and a big pinch of salt. Cook until rice is tender, 15-18 minutes.",
        "While rice cooks, trim green beans. Toss on a baking sheet with a drizzle of oil, salt, and pepper. Roast until tender, 12-15 minutes.",
        "Thinly slice scallions. In a small bowl, combine ginger paste, sweet soy glaze, honey, 2 TBSP water (3 TBSP for 4 servings), and Sriracha.",
        "Open package of chicken* and season. Heat oil in a large pan. Cook chicken until browned, 3-5 minutes.",
        "Add scallion whites. Cook until fragrant, 1 minute. Pour in soy honey sauce and cook, 2-3 minutes.",
        "Fluff rice with a fork. Divide rice, green beans, and chicken between plates. Garnish with scallion greens and sesame seeds.",
    ],
}


class JsonLdTests(unittest.TestCase):
    def test_extracts_recipe_from_array_and_graph_and_flattens_sections(self) -> None:
        html = """
        <html><script type="application/ld+json">
        [{"@context":"https://schema.org","@graph":[
          {"@type":"WebPage","name":"Page"},
          {"@type":["Thing","Recipe"],"name":"Nested Soup","recipeYield":"4 servings",
           "image":{"url":"https://images.example.test/soup.webp"},
           "totalTime":"PT1H5M","recipeCategory":["Lunch"],
           "recipeIngredient":["1 cup Lentils"],
           "recipeInstructions":[{"@type":"HowToSection","itemListElement":[
             {"@type":"HowToStep","text":"Cook <strong>lentils</strong>."}
           ]}]}
        ]}]
        </script></html>
        """
        recipe_ld = find_recipe_json_ld(extract_json_ld_documents(html))
        self.assertIsNotNone(recipe_ld)
        normalized = normalize_recipe_json_ld(recipe_ld or {}, "https://example.test/soup#recipe")
        self.assertEqual(normalized["title"], "Nested Soup")
        self.assertEqual(normalized["servings"], 4)
        self.assertEqual(normalized["total_time_minutes"], 65)
        self.assertEqual(normalized["meal_types"], ["lunch"])
        self.assertEqual(normalized["instructions"], ["Cook lentils."])
        self.assertEqual(normalized["source"], "https://example.test/soup")
        self.assertEqual(normalized["image_url"], "https://images.example.test/soup.webp")

    def test_large_html_extraction_is_linear(self) -> None:
        html = "<html><body>" + ("x" * 1_000_000) + """
        <script type="application/ld+json">{"@type":"Recipe","name":"Fast"}</script>
        </body></html>
        """
        started = time.perf_counter()
        recipe = find_recipe_json_ld(extract_json_ld_documents(html))
        self.assertEqual(recipe and recipe.get("name"), "Fast")
        self.assertLess(time.perf_counter() - started, 2.0)

    def test_duration_parsing(self) -> None:
        self.assertEqual(parse_iso_duration_minutes("PT20M"), 20)
        self.assertEqual(parse_iso_duration_minutes("PT1H15M"), 75)
        self.assertEqual(parse_iso_duration_minutes("1 hour 30 minutes"), 90)

    def test_infers_and_aggregates_measured_butter_only(self) -> None:
        inferred = infer_measured_pantry_ingredients(
            [
                "Place 1 TBSP butter (2 TBSP for 4 servings) in a bowl.",
                "Toss with 1 TBSP butter, salt, pepper, and a drizzle of olive oil.",
            ],
            ["12 ounce Potatoes"],
        )
        self.assertEqual(
            inferred,
            [
                {
                    "name": "butter",
                    "quantity": "2",
                    "unit": "tbsp",
                    "uses": [
                        {"quantity": "1", "unit": "tbsp"},
                        {"quantity": "1", "unit": "tbsp"},
                    ],
                }
            ],
        )

    def test_infers_measured_butter_when_source_omits_its_unit(self) -> None:
        inferred = infer_measured_pantry_ingredients(
            ["Melt 2 TBSP butter.", "Add 2 TBSP butter."],
            ["4 Butter"],
        )
        self.assertEqual(inferred[0]["quantity"], "4")
        self.assertEqual(len(inferred[0]["uses"]), 2)


class CooklangGenerationTests(unittest.TestCase):
    def test_rejects_missing_mealmind_metadata(self) -> None:
        content = """---
id: missing-meal-types
title: Missing Meal Types
servings: 2
---

Cook @rice{1%cup}.
"""
        self.assertIn("Frontmatter missing 'mealTypes' field", validate_cooklang(content))

    def test_normalizes_quantities_and_fractions(self) -> None:
        cases = {
            "½ cup Jasmine Rice": ("1/2", "cup", "jasmine rice"),
            "1 1/2 cups Flour": ("1 1/2", "cup", "flour"),
            "10 ounces Chicken": ("10", "oz", "chicken"),
            "2 large Eggs": ("2", "", "large eggs"),
            "1-2 pounds Potatoes": ("1-2", "lb", "potatoes"),
            "2 units Scallions": ("2", "piece", "scallions"),
            "teaspoon (tsp) Salt": ("", "", "salt"),
        }
        for source, expected in cases.items():
            with self.subTest(source=source):
                parsed = parse_ingredient(source)
                self.assertEqual((parsed.quantity, parsed.unit, parsed.name), expected)

    def test_generates_complete_unique_hellofresh_recipe(self) -> None:
        content = build_recipe_cooklang({**HELLOFRESH_RECIPE, "image": "images/sweet-soy.webp"})
        metadata = yaml.safe_load(content.split("---", 2)[1])
        ingredients = parse_cooklang_ingredients(content)
        names = [ingredient["name"] for ingredient in ingredients]

        self.assertEqual(validate_cooklang(content), [])
        self.assertEqual(metadata["source"], HELLOFRESH_RECIPE["source"])
        self.assertEqual(metadata["image"], "images/sweet-soy.webp")
        self.assertEqual(metadata["time required"], "20 minutes")
        self.assertEqual(metadata["cook time"], "20 minutes")
        self.assertNotIn("ingredients", metadata)
        self.assertEqual(len(ingredients), 12)
        self.assertEqual(len(names), len(set(names)))
        self.assertEqual(names.count("green beans"), 1)
        self.assertTrue(all(" " not in item["amount"] or "%" in item["amount"] for item in ingredients))
        self.assertNotIn("for 4 servings", content)
        self.assertNotIn("chicken*", content)
        self.assertIn("@jasmine rice{1/2%cup}", content)
        self.assertIn("~{1%minute}", content)
        self.assertIn("#baking sheet{}", content)
        body = content.split("---", 2)[2].strip()
        self.assertEqual(len(body.split("\n\n")), 6)
        self.assertTrue(content.endswith("\n"))

    def test_adds_gather_step_for_unmatched_ingredient(self) -> None:
        content = build_recipe_cooklang(
            {
                "title": "Unmatched Test",
                "servings": 2,
                "meal_types": ["dinner"],
                "ingredients": ["1 cup Unicorn Dust"],
                "instructions": ["Bake until done."],
            }
        )
        body = content.split("---", 2)[2].strip()
        self.assertTrue(body.startswith("Gather @unicorn dust{1%cup}."))
        self.assertEqual(len(parse_cooklang_ingredients(content)), 1)

    def test_splits_bullets_and_matches_compound_ingredient_alias(self) -> None:
        content = build_recipe_cooklang(
            {
                "title": "BBQ Potatoes",
                "servings": 2,
                "meal_types": ["dinner"],
                "ingredients": ["12 ounce Potatoes", "1 tablespoon Sweet and Smoky BBQ Seasoning"],
                "instructions": [
                    "• Melt 1 TBSP butter. • Dice potatoes and toss with 1 TBSP butter and half the BBQ Seasoning; roast for 20 minutes."
                ],
            }
        )
        body = content.split("---", 2)[2].strip()
        self.assertNotIn("•", body)
        self.assertEqual(len(body.split("\n\n")), 2)
        self.assertIn("half the @sweet and smoky bbq seasoning{1%tbsp}", body)
        self.assertNotIn("BBQ @sweet", body)
        self.assertIn("Melt @butter{1%tbsp}.", body)
        self.assertIn("toss with @&butter{1%tbsp}", body)

    def test_marks_each_measured_use_when_source_butter_has_no_unit(self) -> None:
        content = build_recipe_cooklang(
            {
                "title": "Repeated Butter",
                "servings": 2,
                "meal_types": ["dinner"],
                "ingredients": ["4 Butter", "1 cup Rice"],
                "instructions": [
                    "Melt 2 TBSP butter and add rice.",
                    "Finish with 2 TBSP butter.",
                ],
            }
        )
        self.assertIn("@butter{2%tbsp}", content)
        self.assertIn("@&butter{2%tbsp}", content)
        self.assertNotIn("2 TBSP @butter", content)

    def test_marks_unicode_fraction_pantry_uses_for_scaling(self) -> None:
        content = build_recipe_cooklang(
            {
                "title": "Unicode Salt",
                "servings": 2,
                "meal_types": ["dinner"],
                "ingredients": ["Salt", "1 cup Rice"],
                "instructions": [
                    "Mix rice with ½ tsp salt and slice vegetables into ¼-inch pieces.",
                    "Finish with ¼ tsp salt and 1½ cups water.",
                ],
            }
        )
        self.assertIn("@salt{1/2%tsp}", content)
        self.assertIn("@&salt{1/4%tsp}", content)
        self.assertIn("1/4-inch pieces", content)
        self.assertIn("1 1/2 cups water", content)
        self.assertNotIn("½ tsp salt", content)
        self.assertEqual(validate_cooklang(content), [])

    def test_leaves_unmeasured_pantry_wording_as_prose(self) -> None:
        content = build_recipe_cooklang(
            {
                "title": "Unmeasured Pantry",
                "servings": 2,
                "meal_types": ["dinner"],
                "ingredients": ["1 cup Rice"],
                "instructions": ["Cook rice with a pinch of salt, pepper, and sugar to taste."],
            }
        )
        self.assertIn("a pinch of salt, pepper, and sugar to taste", content)
        self.assertNotIn("@salt", content)
        self.assertNotIn("@pepper", content)
        self.assertNotIn("@sugar", content)

    def test_hellofresh_converter_normalizes_scalar_legacy_fields(self) -> None:
        content = CONVERTER.build_cooklang(
            {
                "title": "Scalar Legacy Recipe",
                "servings": "2 servings",
                "mealTypes": "dinner",
                "ingredients": "1 cup Rice",
                "instructions": "Cook rice in a pot for 10 minutes.",
                "tags": "easy",
            }
        )
        metadata = yaml.safe_load(content.split("---", 2)[1])
        self.assertEqual(metadata["mealTypes"], ["dinner"])
        self.assertEqual(metadata["tags"], ["easy"])
        self.assertIn("@rice{1%cup}", content)
        self.assertEqual(validate_cooklang(content), [])

    def test_hellofresh_converter_requires_force_to_overwrite(self) -> None:
        recipe = {
            "title": "Overwrite Test",
            "servings": 2,
            "meal_types": ["dinner"],
            "ingredients": ["1 cup Rice"],
            "instructions": ["Cook rice."],
        }
        with tempfile.TemporaryDirectory() as temporary_directory:
            input_path = Path(temporary_directory) / "recipe.json"
            output_path = Path(temporary_directory) / "recipe.cook"
            input_path.write_text(json.dumps(recipe), encoding="utf-8")
            output_path.write_text("keep me", encoding="utf-8")
            command = [
                sys.executable,
                str(CONVERTER_PATH),
                str(input_path),
                "--output",
                str(output_path),
            ]

            rejected = subprocess.run(command, capture_output=True, text=True, check=False)
            self.assertNotEqual(rejected.returncode, 0)
            self.assertIn("Pass --force", rejected.stderr)
            self.assertEqual(output_path.read_text(encoding="utf-8"), "keep me")

            accepted = subprocess.run(command + ["--force"], capture_output=True, text=True, check=False)
            self.assertEqual(accepted.returncode, 0, accepted.stderr)
            self.assertIn("mealTypes", output_path.read_text(encoding="utf-8"))


class RecipeImageTests(unittest.TestCase):
    def test_caches_supported_images_under_the_recipe_root(self) -> None:
        class Response:
            headers = {"content-type": "image/webp; charset=binary"}

            def raise_for_status(self) -> None:
                return None

            def iter_content(self, chunk_size: int):
                del chunk_size
                return iter([b"recipe-image"])

            def close(self) -> None:
                return None

        class Session:
            @staticmethod
            def get(*args, **kwargs):
                del args, kwargs
                return Response()

        with tempfile.TemporaryDirectory() as temporary_directory:
            relative = cache_recipe_image(
                "https://images.example.test/recipe",
                temporary_directory,
                "test-recipe",
                session=Session,
            )
            self.assertEqual(relative, "images/test-recipe.webp")
            self.assertEqual(
                (Path(temporary_directory) / "images/test-recipe.webp").read_bytes(),
                b"recipe-image",
            )


class RecipeSecurityTests(unittest.TestCase):
    def test_rejects_credentials_and_private_hosts(self) -> None:
        with self.assertRaisesRegex(ValueError, "credentials"):
            recipe_security.validate_public_url("https://user:pass@example.com/recipe")
        with self.assertRaisesRegex(ValueError, "public host"):
            recipe_security.validate_public_url("http://127.0.0.1/recipe")

    def test_follows_only_bounded_safe_redirects(self) -> None:
        class Response:
            def __init__(self, status_code: int, location: str | None = None):
                self.status_code = status_code
                self.headers = {"location": location} if location else {}

            def close(self) -> None:
                return None

        class Session:
            def __init__(self):
                self.responses = iter(
                    [
                        Response(302, "https://public.example.test/final"),
                        Response(200),
                    ]
                )

            def get(self, *args, **kwargs):
                del args, kwargs
                return next(self.responses)

        response = recipe_security.safe_request("https://public.example.test/start", session=Session())
        self.assertEqual(response.status_code, 200)

    def test_limits_recipe_html_body_size(self) -> None:
        class Response:
            headers = {}
            encoding = "utf-8"

            def raise_for_status(self) -> None:
                return None

            def iter_content(self, chunk_size: int):
                del chunk_size
                return iter([b"x" * (recipe_security.MAX_RECIPE_HTML_BYTES + 1)])

            def close(self) -> None:
                return None

        with patch.object(recipe_security, "safe_request", return_value=Response()):
            with self.assertRaisesRegex(ValueError, "5 MB"):
                recipe_security.fetch_recipe_html("https://public.example.test/recipe")


if __name__ == "__main__":
    unittest.main()
