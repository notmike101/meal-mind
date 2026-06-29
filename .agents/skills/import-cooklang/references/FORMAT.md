# CookLang Format Reference

## Frontmatter (YAML)

    ---
    id: recipe-slug
    title: Recipe Name
    description: Short description from source page.
    servings: 2
    mealTypes: [lunch, dinner]
    tags: [quick, easy, vegetarian]
    prep time: 10 minutes
    cook time: 25 minutes
    time required: 35 minutes
    difficulty: easy
    cuisine: American
    source: https://original-url.com/recipe
    author: Source Name
    nutrition:
      calories: "450"
      fat: "18g"
      protein: "32g"
      carbohydrate: "28g"
    utensils:
      - skillet
      - cutting board
    ---

### Ingredients — `@ingredient{amount}` syntax

- Amount can include `%` separator for unit (e.g., `1%cup`, `2%tsp`)
- Multi-word names supported: `@white rice{1%cup}`, `@chicken breast{1%lb}`
- Preparation in parentheses: `@onion, diced{(finely chopped)}`

### Cookware — `#cookware{}` syntax

    Heat a #skillet{} over medium heat.
    Use a #baking sheet{}, #pot{}, or #steamer basket{}.

### Timers — `~timer{name}{duration%unit}` syntax

    Bake for ~potatoes{20-25%minutes}.
    Microwave until melted, about ~{30%seconds}.
    Simmer until tender, ~soup{30%minutes}.

### Steps — separate with blank lines

Each paragraph is one step. Use `\` for line breaks within a step:

    Cook @white rice{1%cup} in a #pot{} according to package instructions.

    Season @chicken breast{1%lb} with @garlic powder{1%tsp}, @paprika{1%tsp}, and salt.

    Serve over the rice with fresh cilantro.

### Custom metadata keys (project convention)

These are not in the official CookLang spec but used by meal-mind apps:

- `nutrition:` — nested dict with per-serving nutritional data
- `utensils:` — list of cookware/utensil names needed
- `source:` — original URL for traceability