---
name: import-cooklang
description: Import recipes from any URL into CookLang .cook format — extracts metadata, ingredients, and steps via Recipe JSON-LD parsing. Use when the user provides a recipe URL and asks to import, save, or add it as a CookLang file for meal-mind.
license: MIT
compatibility: Requires Python 3.11+, uv, and internet access. Dependencies (requests, lxml, PyYAML) are declared inline via PEP 723.
metadata:
  author: Mike / Hermes Agent
---

# Import CookLang Recipes

Import recipes from any website URL into the `recipes/` directory as valid `.cook` (CookLang) files with full metadata, ingredients, steps, nutrition, and utensils extracted automatically.

## Trigger conditions

Use this skill when:
- The user provides a recipe URL and asks to "import", "save", or "add" it as a CookLang file
- The user wants to batch-import multiple recipes from a list of URLs
- You need to convert an existing recipe source into `.cook` format for the meal-mind vault

## Prerequisites

Ensure `uv` is available. The script declares its Python dependencies inline via PEP 723 — `uv run` will install them automatically.

## Workflow

### Step 1: Run the import script

    cd D:\meal-mind && uv run .agents/skills/import-cooklang/scripts/import-recipe.py "https://example.com/recipe/slug" recipes

The script attempts extraction in priority order:
1. **Recipe JSON-LD** — works on HelloFresh, AllRecipes, FoodNetwork, BonAppetit, Epicurious, Tasty (90%+ of recipe sites)
2. **DOM scraping fallback** — lxml-based HTML parsing for sites without structured data
3. **Reports failure** — if both strategies fail, the agent falls back to browser tools

### Step 2: Review the output

    cat recipes/<recipe-slug>.cook

Verify frontmatter has `id`, `title`, `description`, `servings`, `tags`. Steps should contain `@ingredient{amount}` markers. See [CookLang format reference](references/FORMAT.md) for syntax details.

### Step 3: Validate (optional)

    from scripts.cooklang_schema import validate_cooklang
    with open('recipes/<recipe-slug>.cook') as f:
        errors = validate_cooklang(f.read())
    print(errors)  # should be []

## Gotchas

- **HelloFresh ingredient quantities differ between JSON-LD and DOM** — The script uses JSON-LD for metadata; step text may need manual refinement if quantities don't match the rendered page.
- **JS-rendered pages** — Most recipe sites emit JSON-LD in the initial HTML, but some load content via JavaScript. If JSON-LD is missing, the DOM scraping fallback handles static content only.
- **No `--dry-run` flag yet** — The script writes directly to disk. Pass a test output dir (e.g., `recipes/tmp`) if you want to review before committing.

## See also

- [CookLang format reference](references/FORMAT.md) — detailed syntax for ingredients, cookware, timers, frontmatter