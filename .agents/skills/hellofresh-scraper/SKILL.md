---
name: hellofresh-scraper
description: Extract normalized recipe data from one or more public HelloFresh recipe URLs and convert it into strictly validated MealMind-compatible CookLang, including required metadata, ingredients, instructions, nutrition, ratings, author, tags, timers, cookware, and measured pantry uses. Use when a user asks to extract, scrape, save, convert, or batch-import HelloFresh recipes.
---

# HelloFresh Recipe Scraper

Extract normalized recipe data from a HelloFresh page's Schema.org JSON-LD and convert it into MealMind-compatible CookLang.

## Workflow

### Step 1: Run the extraction script

```bash
cd D:\meal-mind && uv run .agents/skills/hellofresh-scraper/scripts/extract-recipe.py "https://www.hellofresh.com/recipes/<slug-or-id>" --pretty
```

To save output to a file instead of printing:

```bash
cd D:\meal-mind && uv run .agents/skills/hellofresh-scraper/scripts/extract-recipe.py "https://www.hellofresh.com/recipes/<slug-or-id>" --output recipes/tmp/hellofresh-extract.json
```

### Step 2: Convert extracted JSON to CookLang .cook files

Run the converter (pipe from extraction or pass a file):

```bash
# Pipe mode — one-liner for a single recipe
cd D:\meal-mind && uv run .agents/skills/hellofresh-scraper/scripts/extract-recipe.py "https://www.hellofresh.com/recipes/<slug>" --pretty | uv run .agents/skills/hellofresh-scraper/scripts/convert-to-cooklang.py - --output recipes/<filename>.cook

# File mode — convert a previously saved JSON file
cd D:\meal-mind && uv run .agents/skills/hellofresh-scraper/scripts/convert-to-cooklang.py recipes/tmp/hellofresh-extract.json --output recipes/my-recipe.cook
```

The converter validates before writing and produces:
- **Frontmatter**: required MealMind fields, canonical minute strings, source, author, tags, and nutrition
- **Ingredients**: one inline `@ingredient{quantity%unit}` marker per source ingredient
- **Steps**: standard `#cookware{}` and `~{duration%unit}` markers with alternate-serving notes removed
- **Completeness fallback**: an opening gather step if source wording cannot be matched safely
- **Measured pantry staples**: omitted staples such as butter are inferred from explicit step quantities; repeated uses are emitted as CookLang references so totals and step amounts scale together

Both scripts accept `--meal-type lunch|dinner`; HelloFresh recipes otherwise default to dinner.

The converter refuses to overwrite an existing output file. Pass `--force` only when the user explicitly wants that file replaced.

### Step 3: Review and validate

Open the generated `.cook` file and verify `id`, `title`, `servings`, and `mealTypes` are present. Never accept a file without `mealTypes` because MealMind rejects it. Then run:

```powershell
uv run tests/python/test_recipe_generation.py
npx vitest run packages/domain/src/recipes.test.ts
```

Do not move or commit an output unless both validation layers pass.

## Gotchas

- **Ingredient quantities** — JSON-LD is the source of truth for generated CookLang quantities; review unusual source wording before committing.
- **Ratings and images** — Normalized JSON preserves available rating and image fields; MealMind CookLang frontmatter intentionally keeps only metadata consumed by the app.
- **Unmeasured pantry staples** — Drizzles, pinches, and "to taste" ingredients remain plain text because the source provides no scalable quantity.
- **Some recipes have empty `cuisine` or `prepTime`/`cookTime` fields** — These are optional in Schema.org Recipe and may be absent on certain HelloFresh pages.
- **Image URLs use HelloFresh CDN with query params** — They include `f_auto,fl_lossy,q_auto,w_1200` etc. for responsive delivery; strip or keep as-is depending on whether you need the original resolution.
- **No authentication required** — All recipe data is publicly available in the server-side rendered HTML.

## See also

- [import-cooklang](../import-cooklang/SKILL.md) — Convert extracted recipes into CookLang `.cook` format for meal-mind storage
- [CookLang format reference](../import-cooklang/references/FORMAT.md) — syntax and MealMind metadata requirements
