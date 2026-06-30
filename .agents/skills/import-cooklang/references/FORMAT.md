# MealMind CookLang Format

MealMind recipes use CookLang YAML frontmatter and inline recipe markup. MealMind adds required application metadata and uses relation syntax supported by the repository's current `@cooklang/cooklang` parser.

## Frontmatter

```yaml
---
id: recipe-slug
title: Recipe Name
description: Short description from the source page.
servings: 2
mealTypes:
- dinner
time required: 35 minutes
prep time: 10 minutes
cook time: 25 minutes
tags:
- quick
- easy
source: https://example.com/recipe
image: images/recipe-slug.jpg
author: Source Name
nutrition:
  calories: 450 kcal
  protein: 32 g
---
```

Required MealMind fields are `id`, `title`, `servings`, and `mealTypes`. The `id` must use lowercase kebab-case. `mealTypes` must be a non-empty list containing only `lunch` or `dinner`; omitting it makes the recipe invalid. Keep ingredients and cookware in the instruction body. The skill validator rejects an `ingredients:` frontmatter list.

`image` is optional. It must be a recipe-root-relative JPEG, PNG, or WebP path using forward slashes; absolute paths and `..` traversal are invalid.

## Ingredients

Use `@ingredient{quantity%unit}`. Multi-word names require braces even when the amount is
empty.

```cooklang
Cook @white rice{1%cup} with @salt{}.
Season @chicken breast{10%oz} with @black pepper{}.
```

The `%` separator is required when a quantity has a unit. Prefer ASCII fractions such as
`1/2%cup` in generated files.

When one ingredient is measured in multiple steps, define its first use and reference later uses with the relation modifier supported by MealMind's current parser:

```cooklang
Melt @butter{1%tbsp}.

Toss the vegetables with @&butter{1%tbsp}.
```

For the default servings MealMind lists 2 tbsp butter while preserving 1 tbsp in each instruction. Scaling by two changes both step uses to 2 tbsp and the grouped total to 4 tbsp. This `@&name{}` relation is a current parser feature; it is not documented as part of the public core syntax.

## Cookware

Use `#cookware{}` for multi-word cookware names.

```cooklang
Heat a #large pan{} and prepare a #baking sheet{}.
```

## Timers

Use `~{duration%unit}` for unnamed timers or `~name{duration%unit}` for named timers.

```cooklang
Simmer for ~{15%minutes}.
Bake for ~potatoes{20-25%minutes}.
```

## Steps and preparation notes

Separate each step with one blank line. Ingredient preparation notes follow the marker.

```cooklang
Dice @onion{1}(finely chopped) and add it to a #large pan{}.

Simmer until tender, ~{20%minutes}.
```

Generated files end with a newline. See the official [CookLang specification](https://cooklang.org/docs/spec/)
and [metadata conventions](https://cooklang.org/docs/conventions/) for the underlying syntax.

## Validation invariants

- Include `id`, `title`, `servings`, and valid `mealTypes` frontmatter.
- Put every source ingredient in exactly one definition marker; use references only for additional measured uses.
- Separate quantities from units with `%`, for example `1/2%cup`.
- Keep ingredients out of frontmatter and preserve one blank line between steps.
- End the file with a newline and require both Python generator tests and MealMind parser tests to pass.
