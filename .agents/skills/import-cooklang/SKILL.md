---
name: import-cooklang
description: Import one or more public recipe URLs into MealMind-compatible CookLang .cook files using Recipe JSON-LD with a static DOM fallback, required metadata, inline ingredients, cookware, timers, measured pantry uses, and strict output validation. Use when a user asks to import, save, add, or batch-import recipe URLs into MealMind.
---

# Import CookLang Recipes

Import recipes from any website URL into the `recipes/` directory as valid `.cook` files with MealMind metadata and inline CookLang ingredients, cookware, and timers.

## Prerequisites

Run from `D:\meal-mind`. Ensure `uv` is available; PEP 723 metadata installs the Python dependencies automatically.

## Workflow

### Step 1: Run the import script

    cd D:\meal-mind && uv run .agents/skills/import-cooklang/scripts/import-recipe.py "https://example.com/recipe/slug" recipes

The script attempts extraction in priority order:
1. **Recipe JSON-LD** — supports direct objects, arrays, and `@graph` payloads
2. **DOM scraping fallback** — handles simple static ingredient and instruction lists
3. **Reports failure** — if both strategies fail, use browser tools for manual extraction

When the source exposes a supported recipe image, the importer caches it under `recipes/images/`
and writes a relative `image` path in frontmatter. Image download failures are warnings and do not
prevent a valid recipe from being saved.

Override the inferred/default meal type when needed:

    cd D:\meal-mind && uv run .agents/skills/import-cooklang/scripts/import-recipe.py "https://example.com/recipe/slug" recipes --meal-type lunch

### Step 2: Review the output

    Get-Content recipes/<recipe-slug>.cook

Verify frontmatter has `id`, `title`, `servings`, and a non-empty `mealTypes` list containing only `lunch` or `dinner`. Never omit `mealTypes`; MealMind rejects the recipe. Steps must contain one marker per source ingredient using `@ingredient{quantity%unit}`. See [CookLang format reference](references/FORMAT.md).

When a measured pantry staple is omitted from the page's ingredient data, verify each use is
marked separately. The first use defines it and later uses reference it, for example
`@butter{1%tbsp}` followed by `@&butter{1%tbsp}`. MealMind groups these into the total while
CookLang scales every step amount.

### Step 3: Validate

    uv run --with PyYAML python -c "from pathlib import Path; from scripts.cooklang_schema import validate_cooklang; print(validate_cooklang(Path(r'recipes/<recipe-slug>.cook').read_text(encoding='utf-8')))"

The result should be `[]`. Run the complete generator test suite with:

    uv run tests/python/test_recipe_generation.py

Then run MealMind's parser regression test:

    npx vitest run packages/domain/src/recipes.test.ts

Do not move or commit an output that fails either validation layer. `build_recipe_cooklang()` validates before either importer writes a file.

## Gotchas

- **Unmatched ingredient wording** — If an ingredient name cannot be matched to an instruction, the generator adds it to a short opening gather step so MealMind's shopping list remains complete.
- **Measured pantry staples** — Explicitly measured butter, oil, salt, pepper, and sugar omitted by source metadata are inferred from steps. Repeated same-unit uses become CookLang references and scale together.
- **Unmeasured pantry staples** — Drizzles, pinches, and "to taste" amounts remain plain text because there is no defensible quantity to scale.
- **JS-rendered pages** — Most recipe sites emit JSON-LD in the initial HTML, but some load content via JavaScript. If JSON-LD is missing, the DOM scraping fallback handles static content only.
- **Existing filenames** — The importer creates `-1`, `-2`, and subsequent suffixes instead of overwriting an existing recipe.
- **Recipe images** — Only JPEG, PNG, and WebP files up to 10 MB are cached. App rendering never fetches remote image URLs.

## See also

- [CookLang format reference](references/FORMAT.md) — detailed syntax for ingredients, cookware, timers, frontmatter
