"""CookLang formatting and validation shared by recipe import skills."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

import yaml

try:
    from recipe_jsonld import infer_measured_pantry_ingredients, parse_iso_duration_minutes
except ModuleNotFoundError:  # Supports `from scripts.cooklang_schema import ...`.
    from scripts.recipe_jsonld import infer_measured_pantry_ingredients, parse_iso_duration_minutes


UNICODE_FRACTIONS = {
    "¼": "1/4",
    "½": "1/2",
    "¾": "3/4",
    "⅐": "1/7",
    "⅑": "1/9",
    "⅒": "1/10",
    "⅓": "1/3",
    "⅔": "2/3",
    "⅕": "1/5",
    "⅖": "2/5",
    "⅗": "3/5",
    "⅘": "4/5",
    "⅙": "1/6",
    "⅚": "5/6",
    "⅛": "1/8",
    "⅜": "3/8",
    "⅝": "5/8",
    "⅞": "7/8",
}

UNIT_ALIASES = {
    "ounce": "oz",
    "ounces": "oz",
    "oz": "oz",
    "pound": "lb",
    "pounds": "lb",
    "lbs": "lb",
    "lb": "lb",
    "cup": "cup",
    "cups": "cup",
    "tablespoon": "tbsp",
    "tablespoons": "tbsp",
    "tbsp": "tbsp",
    "teaspoon": "tsp",
    "teaspoons": "tsp",
    "tsp": "tsp",
    "gram": "g",
    "grams": "g",
    "g": "g",
    "kilogram": "kg",
    "kilograms": "kg",
    "kg": "kg",
    "milliliter": "ml",
    "milliliters": "ml",
    "millilitre": "ml",
    "millilitres": "ml",
    "ml": "ml",
    "liter": "l",
    "liters": "l",
    "litre": "l",
    "litres": "l",
    "l": "l",
    "piece": "piece",
    "pieces": "piece",
    "unit": "piece",
    "units": "piece",
    "clove": "clove",
    "cloves": "clove",
    "slice": "slice",
    "slices": "slice",
    "can": "can",
    "cans": "can",
    "package": "package",
    "packages": "package",
    "packet": "packet",
    "packets": "packet",
    "bag": "bag",
    "bags": "bag",
    "bunch": "bunch",
    "bunches": "bunch",
    "sprig": "sprig",
    "sprigs": "sprig",
    "head": "head",
    "heads": "head",
    "pinch": "pinch",
    "pinches": "pinch",
    "dash": "dash",
    "dashes": "dash",
}

PREPARATION_WORDS = {
    "boneless",
    "canned",
    "chopped",
    "cooking",
    "crushed",
    "cubed",
    "diced",
    "dried",
    "fresh",
    "frozen",
    "grated",
    "ground",
    "lean",
    "minced",
    "peeled",
    "roasted",
    "shredded",
    "skinless",
    "sliced",
    "trimmed",
    "whole",
}

COOKWARE_TERMS = (
    "baking sheet",
    "sheet pan",
    "casserole dish",
    "baking dish",
    "cutting board",
    "frying pan",
    "large skillet",
    "small skillet",
    "skillet",
    "saucepan",
    "large pan",
    "small pan",
    "large pot",
    "small pot",
    "large bowl",
    "small bowl",
    "colander",
    "strainer",
    "spatula",
    "whisk",
    "tongs",
    "knife",
    "oven",
    "bowl",
    "fork",
    "pan",
    "pot",
)


@dataclass(frozen=True)
class IngredientData:
    raw: str
    name: str
    quantity: str = ""
    unit: str = ""

    @property
    def amount(self) -> str:
        if self.quantity and self.unit:
            return f"{self.quantity}%{self.unit}"
        return self.quantity

    @property
    def marker(self) -> str:
        return f"@{self.name}{{{self.amount}}}"


def normalize_fraction_text(value: str) -> str:
    result = value
    for fraction, ascii_value in UNICODE_FRACTIONS.items():
        result = re.sub(rf"(\d){re.escape(fraction)}", rf"\1 {ascii_value}", result)
        result = result.replace(fraction, ascii_value)
    return re.sub(r"\s+", " ", result).strip()


def slugify(title: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9\s-]", "", title).strip().lower()
    slug = re.sub(r"[\s]+", "-", slug)
    return re.sub(r"-+", "-", slug).strip("-") or "recipe"


def _clean_ingredient_source(raw: str) -> str:
    text = normalize_fraction_text(raw.strip())
    text = re.sub(r"\s*\([^)]*(?:contains?|allergen|servings?|for\s+\d+)[^)]*\)", "", text, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", text).strip(" -,:;")


def parse_ingredient(raw: str) -> IngredientData:
    """Parse a common recipe ingredient string into a CookLang component."""
    text = _clean_ingredient_source(raw)
    if not text:
        raise ValueError("Ingredient is empty")

    atom = r"(?:\d+\s+\d+/\d+|\d+/\d+|\d+(?:\.\d+)?|\.\d+)"
    number = rf"(?:{atom})(?:\s*[-–—]\s*(?:{atom}))?"
    unit_names = "|".join(sorted((re.escape(unit) for unit in UNIT_ALIASES), key=len, reverse=True))
    quantified = re.match(
        rf"^(?P<quantity>{number})\s*(?P<unit>{unit_names})\b\s*(?:\([^)]*\)\s*)?(?P<name>.+)$",
        text,
        flags=re.IGNORECASE,
    )
    if quantified:
        quantity = re.sub(
            r"\s*[-–—]\s*",
            "-",
            normalize_fraction_text(quantified.group("quantity")),
        )
        unit = UNIT_ALIASES[quantified.group("unit").lower()]
        name = quantified.group("name")
    else:
        bare_unit = re.match(
            rf"^(?P<unit>{unit_names})\b\s*(?:\([^)]*\)\s*)?(?P<name>.+)$",
            text,
            flags=re.IGNORECASE,
        )
        quantity_only = re.match(
            rf"^(?P<quantity>{number})\s+(?P<name>.+)$",
            text,
            flags=re.IGNORECASE,
        )
        if quantity_only and not bare_unit:
            quantity = re.sub(
                r"\s*[-–—]\s*",
                "-",
                normalize_fraction_text(quantity_only.group("quantity")),
            )
            unit = ""
            name = quantity_only.group("name")
        else:
            quantity = ""
            unit = ""
            name = bare_unit.group("name") if bare_unit else text

    name = re.sub(r"\s*\([^)]*\)\s*", " ", name)
    name = re.sub(r"\s+", " ", name).strip(" -,:;").lower()
    if not name:
        raise ValueError(f"Could not determine ingredient name from {raw!r}")
    return IngredientData(raw=raw, name=name, quantity=quantity, unit=unit)


def _ingredient_candidates(ingredient: IngredientData) -> list[str]:
    words = ingredient.name.split()
    without_preparation = [word for word in words if word not in PREPARATION_WORDS]
    candidates = [ingredient.name]
    if without_preparation and without_preparation != words:
        candidates.append(" ".join(without_preparation))
    stop_words = {"and", "of", "or", "the", "with"}
    for size in range(len(without_preparation) - 1, 1, -1):
        for start in range(0, len(without_preparation) - size + 1):
            phrase_words = without_preparation[start : start + size]
            if phrase_words[0] in stop_words or phrase_words[-1] in stop_words:
                continue
            candidates.append(" ".join(phrase_words))
    if len(without_preparation) > 1:
        candidates.extend(without_preparation)
    return sorted(
        {candidate for candidate in candidates if len(candidate) >= 3},
        key=lambda candidate: (-len(candidate), candidate),
    )


def clean_instruction_text(text: str) -> str:
    text = normalize_fraction_text(re.sub(r"\*", "", str(text)))
    text = re.sub(r"\s*\([^)]*\bfor\s+\d+\s+servings?[^)]*\)", "", text, flags=re.IGNORECASE)
    text = re.sub(
        r"[;,]\s*\d+(?:\s+\d+/\d+|/\d+|\.\d+)?\s+[a-zA-Z]+\s+for\s+\d+\s+servings?",
        "",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(r"\s+", " ", text).strip()
    return re.sub(r"\s+([,.;:])", r"\1", text)


def _replace_first_unmarked(text: str, candidate: str, placeholder: str) -> tuple[str, bool]:
    """Replace the first unmarked occurrence of *candidate* in *text*.

    Handles three cases so that quantities embedded in step text are consumed
    rather than left behind as duplicate annotations:

    1. CookLang marker already present (e.g. ``@butter{2%tbsp}``) → remove it
       entirely (the correct marker is injected from the source ingredient).
    2. Quantity prefix + name (e.g. ``1 TBSP butter``) → replace both with
       the CookLang placeholder so only the single authoritative marker remains.
    3. Bare name (e.g. ``butter``) → standard replacement.

    Returns ``(updated_text, matched)``.
    """
    escaped = re.escape(candidate)

    # ── Case A: a CookLang marker appears right before the candidate ────────
    # Matches ``@name{…} name`` (the marker is followed by the same bare word).
    marker_pattern = rf"(?<![\w\{{])@\S+{{[^}}]+}}\s+{escaped}(?![\w])"
    replaced, count = re.subn(marker_pattern, placeholder, text, count=1, flags=re.IGNORECASE)
    if count:
        return replaced, True

    # ── Case B: optional quantity prefix + candidate ────────────────────────
    # Quantity: integer / fraction / decimal (with optional range).
    # NB: the entire atom alternation must be wrapped in a single group so
    # that \b and everything after it applies to BOTH alternatives.
    atom = r"(?:\d+\s+\d+/\d+|\d+/\d+|\d+(?:\.\d+)?)|(?:[¼½¾⅓⅔⅛⅜⅝⅞])"
    qty_prefix = rf"\b(?:{atom})(?:\s*[-–—]\s*(?:(?:{atom})))?\s+[a-zA-Z]+\s+"
    combined_pattern = re.compile(
        rf"(?<![\w]){qty_prefix}{escaped}(?![\w])",
        re.IGNORECASE,
    )
    replaced, count = combined_pattern.subn(placeholder, text, count=1)
    if count:
        return replaced, True

    # ── Case C: bare candidate word (original behaviour) ────────────────────
    pattern = re.compile(rf"(?<![\w]){escaped}(?![\w])", re.IGNORECASE)
    replaced, count = pattern.subn(placeholder, text, count=1)
    return replaced, count == 1


def mark_ingredients_in_steps(
    steps: list[str], ingredients: list[IngredientData]
) -> tuple[list[str], list[IngredientData]]:
    marked = list(steps)
    replacements: dict[str, str] = {}
    unmatched: list[IngredientData] = []

    for index, ingredient in enumerate(sorted(ingredients, key=lambda item: -len(item.name))):
        placeholder = f"\x00INGREDIENT_{index}\x00"
        found = False
        for candidate in _ingredient_candidates(ingredient):
            for step_index, step in enumerate(marked):
                updated, did_replace = _replace_first_unmarked(step, candidate, placeholder)
                if did_replace:
                    marked[step_index] = updated
                    replacements[placeholder] = ingredient.marker
                    found = True
                    break
            if found:
                break
        if not found:
            unmatched.append(ingredient)

    for index, step in enumerate(marked):
        for placeholder, marker in replacements.items():
            step = step.replace(placeholder, marker)
        marked[index] = step
    return marked, unmatched


def mark_inferred_ingredient_uses(
    steps: list[str], inferred: list[dict[str, Any]]
) -> tuple[list[str], list[IngredientData]]:
    """Mark every measured pantry use, referencing later uses to the first."""
    marked = list(steps)
    expected: list[IngredientData] = []
    for ingredient in inferred:
        name = str(ingredient.get("name") or "").strip().lower()
        uses = ingredient.get("uses") or []
        if not name or not isinstance(uses, list):
            raise ValueError("Invalid inferred ingredient usage data")
        for use_index, use in enumerate(uses):
            if not isinstance(use, dict):
                raise ValueError(f"Invalid inferred usage for {name!r}")
            quantity = str(use.get("quantity") or "").strip()
            unit = str(use.get("unit") or "").strip().lower()
            if not quantity or not unit:
                raise ValueError(f"Inferred usage for {name!r} is missing a quantity or unit")
            unit_variants = [source for source, normalized in UNIT_ALIASES.items() if normalized == unit]
            unit_pattern = "|".join(sorted((re.escape(value) for value in unit_variants), key=len, reverse=True))
            quantity_pattern = re.escape(quantity).replace(r"\ ", r"\s+")
            pattern = re.compile(
                rf"(?<![\w]){quantity_pattern}\s+(?:{unit_pattern})\s+{re.escape(name)}(?![\w])",
                re.IGNORECASE,
            )
            marker = f"@{'&' if use_index else ''}{name}{{{quantity}%{unit}}}"
            found = False
            for step_index, step in enumerate(marked):
                updated, count = pattern.subn(marker, step, count=1)
                if count:
                    marked[step_index] = updated
                    found = True
                    break
            if not found:
                raise ValueError(f"Could not mark inferred {quantity} {unit} use of {name!r}")
            expected.append(IngredientData(raw=marker, name=name, quantity=quantity, unit=unit))
    return marked, expected


def mark_timers_in_steps(steps: list[str]) -> list[str]:
    units = {
        "second": "second",
        "seconds": "seconds",
        "sec": "seconds",
        "secs": "seconds",
        "minute": "minute",
        "minutes": "minutes",
        "min": "minutes",
        "mins": "minutes",
        "hour": "hour",
        "hours": "hours",
        "hr": "hours",
        "hrs": "hours",
    }
    pattern = re.compile(
        r"(?<![@#~{])\b(?P<duration>\d+(?:\.\d+)?(?:\s*[-–—]\s*\d+(?:\.\d+)?)?)\s+"
        r"(?P<unit>seconds?|secs?|minutes?|mins?|hours?|hrs?)\b",
        re.IGNORECASE,
    )

    def replace(match: re.Match[str]) -> str:
        duration = re.sub(r"\s*[-–—]\s*", "-", match.group("duration"))
        unit = units[match.group("unit").lower()]
        if duration == "1":
            unit = unit.rstrip("s")
        return f"~{{{duration}%{unit}}}"

    return [pattern.sub(replace, step) for step in steps]


def mark_cookware_in_steps(steps: list[str]) -> list[str]:
    marked = list(steps)
    occupied_terms: set[str] = set()
    for index, term in enumerate(sorted(COOKWARE_TERMS, key=lambda value: -len(value))):
        root = term.split()[-1]
        if root in occupied_terms:
            continue
        placeholder = f"\x00COOKWARE_{index}\x00"
        found = False
        for step_index, step in enumerate(marked):
            updated, did_replace = _replace_first_unmarked(step, term, placeholder)
            if did_replace:
                marked[step_index] = updated
                found = True
                occupied_terms.add(root)
                break
        if found:
            for step_index, step in enumerate(marked):
                marked[step_index] = step.replace(placeholder, f"#{term}{{}}")
    return marked


def _normalize_nutrition(nutrition: Any) -> dict[str, str]:
    if not isinstance(nutrition, dict):
        return {}
    aliases = {
        "calories": "calories",
        "fat": "fat",
        "totalFat": "fat",
        "fatContent": "fat",
        "saturatedFat": "sat fat",
        "saturatedFatContent": "sat fat",
        "carbohydrate": "carbohydrate",
        "totalCarbohydrate": "carbohydrate",
        "carbohydrateContent": "carbohydrate",
        "sugar": "sugar",
        "sugars": "sugar",
        "sugarContent": "sugar",
        "protein": "protein",
        "proteinContent": "protein",
        "fiber": "fiber",
        "dietaryFiber": "fiber",
        "fiberContent": "fiber",
        "cholesterol": "cholesterol",
        "cholesterolContent": "cholesterol",
        "sodium": "sodium",
        "sodiumContent": "sodium",
        "potassiumContent": "potassium",
        "calciumContent": "calcium",
        "ironContent": "iron",
    }
    result: dict[str, str] = {}
    for source_key, output_key in aliases.items():
        value = nutrition.get(source_key)
        if value not in (None, "") and output_key not in result:
            result[output_key] = str(value).strip()
    return result


def build_frontmatter(
    title: str,
    description: str = "",
    servings: int = 2,
    meal_types: list[str] | None = None,
    tags: list[str] | None = None,
    prep_time: Any = "",
    cook_time: Any = "",
    difficulty: str = "",
    cuisine: str = "",
    source_url: str = "",
    author: str = "",
    nutrition: Any = None,
    image: str = "",
    utensils: list[str] | None = None,
    ingredients: list[str] | None = None,
    *,
    recipe_id: str | None = None,
    total_time_minutes: int | None = None,
    prep_time_minutes: int | None = None,
    cook_time_minutes: int | None = None,
) -> dict[str, Any]:
    """Construct ordered YAML metadata consumed by MealMind and CookLang."""
    del utensils, ingredients  # Cookware and ingredients belong in CookLang steps.
    prep_minutes = prep_time_minutes or parse_iso_duration_minutes(prep_time)
    cook_minutes = cook_time_minutes or parse_iso_duration_minutes(cook_time)
    total_minutes = total_time_minutes
    if total_minutes is None and (prep_minutes is not None or cook_minutes is not None):
        total_minutes = (prep_minutes or 0) + (cook_minutes or 0)
    if total_minutes and prep_minutes is None and cook_minutes is None:
        cook_minutes = total_minutes

    fm: dict[str, Any] = {
        "id": recipe_id or slugify(title),
        "title": title,
    }
    if description:
        fm["description"] = description
    fm["servings"] = int(servings or 2)
    fm["mealTypes"] = meal_types or ["dinner"]
    if total_minutes:
        fm["time required"] = f"{total_minutes} minutes"
    if prep_minutes:
        fm["prep time"] = f"{prep_minutes} minutes"
    if cook_minutes:
        fm["cook time"] = f"{cook_minutes} minutes"
    if tags:
        fm["tags"] = list(dict.fromkeys(str(tag) for tag in tags if str(tag).strip()))
    if difficulty:
        fm["difficulty"] = difficulty
    if cuisine:
        fm["cuisine"] = cuisine
    if source_url:
        fm["source"] = source_url
    if image:
        fm["image"] = image
    if author:
        fm["author"] = author
    normalized_nutrition = _normalize_nutrition(nutrition)
    if normalized_nutrition:
        fm["nutrition"] = normalized_nutrition
    return fm


def format_cooklang(frontmatter: dict[str, Any], steps_text: str | list[str]) -> str:
    steps = steps_text if isinstance(steps_text, list) else re.split(r"\n\s*\n", steps_text.strip())
    steps = [step.strip() for step in steps if step and step.strip()]
    fm_str = yaml.safe_dump(
        frontmatter,
        sort_keys=False,
        allow_unicode=True,
        default_flow_style=False,
        width=88,
    ).strip()
    body = "\n\n".join(steps)
    return f"---\n{fm_str}\n---\n\n{body}\n"


def build_recipe_cooklang(recipe: dict[str, Any], recipe_id: str | None = None) -> str:
    raw_ingredients = recipe.get("ingredients") or []
    ingredients = [parse_ingredient(str(raw)) for raw in raw_ingredients if str(raw).strip()]
    raw_steps = recipe.get("instructions") or recipe.get("steps") or recipe.get("steps_text") or []
    if isinstance(raw_steps, str):
        raw_steps = re.split(r"\n\s*\n", raw_steps)
    inferred_input = recipe.get("inferred_ingredients")
    if inferred_input is None:
        inferred_input = infer_measured_pantry_ingredients(
            [str(step) for step in raw_steps],
            [str(ingredient) for ingredient in raw_ingredients],
        )
    legacy_inferred_ingredients = [
        parse_ingredient(str(raw))
        for raw in inferred_input
        if not isinstance(raw, dict) and str(raw).strip()
    ]
    structured_inferred_ingredients = [
        raw for raw in inferred_input if isinstance(raw, dict)
    ]
    inferred_names = {
        str(raw.get("name") or "").strip().lower()
        for raw in structured_inferred_ingredients
    }
    ingredients = [ingredient for ingredient in ingredients if ingredient.name not in inferred_names]
    if not ingredients and not structured_inferred_ingredients:
        raise ValueError("Recipe has no ingredients")
    step_fragments = [
        fragment
        for step in raw_steps
        for fragment in re.split(r"\s*[•▪●]\s*", str(step))
        if fragment.strip()
    ]
    steps = [clean_instruction_text(step) for step in step_fragments if clean_instruction_text(step)]
    if not steps:
        raise ValueError("Recipe has no instructions")

    steps, unmatched = mark_ingredients_in_steps(steps, ingredients)
    steps, inferred_ingredient_uses = mark_inferred_ingredient_uses(
        steps,
        structured_inferred_ingredients,
    )
    gather_ingredients = unmatched + legacy_inferred_ingredients
    if gather_ingredients:
        gather = "Gather " + ", ".join(item.marker for item in gather_ingredients) + "."
        steps.insert(0, gather)
    steps = mark_timers_in_steps(steps)
    steps = mark_cookware_in_steps(steps)

    frontmatter = build_frontmatter(
        title=str(recipe.get("title") or "Untitled Recipe"),
        description=str(recipe.get("description") or ""),
        servings=int(recipe.get("servings") or 2),
        meal_types=list(recipe.get("meal_types") or recipe.get("mealTypes") or ["dinner"]),
        tags=list(recipe.get("tags") or []),
        difficulty=str(recipe.get("difficulty") or ""),
        cuisine=str(recipe.get("cuisine") or ""),
        source_url=str(recipe.get("source") or recipe.get("source_url") or ""),
        author=str(recipe.get("author") or ""),
        nutrition=recipe.get("nutrition"),
        image=str(recipe.get("image") or ""),
        recipe_id=recipe_id,
        total_time_minutes=recipe.get("total_time_minutes"),
        prep_time_minutes=recipe.get("prep_time_minutes"),
        cook_time_minutes=recipe.get("cook_time_minutes"),
        prep_time=recipe.get("prep_time", ""),
        cook_time=recipe.get("cook_time", ""),
    )
    content = format_cooklang(frontmatter, steps)
    errors = validate_cooklang(
        content,
        expected_ingredients=ingredients + legacy_inferred_ingredients + inferred_ingredient_uses,
    )
    if errors:
        raise ValueError("Invalid generated CookLang: " + "; ".join(errors))
    return content


def _split_frontmatter(content: str) -> tuple[dict[str, Any], str, list[str]]:
    errors: list[str] = []
    match = re.match(r"^---\r?\n(?P<yaml>.*?)\r?\n---\r?\n(?P<body>[\s\S]*)$", content, re.DOTALL)
    if not match:
        return {}, "", ["Missing or malformed YAML frontmatter delimiters"]
    try:
        frontmatter = yaml.safe_load(match.group("yaml")) or {}
    except yaml.YAMLError as error:
        return {}, match.group("body"), [f"Invalid frontmatter YAML: {error}"]
    if not isinstance(frontmatter, dict):
        errors.append("Frontmatter must be a YAML mapping")
        frontmatter = {}
    return frontmatter, match.group("body"), errors


def parse_cooklang_ingredients(text: str) -> list[dict[str, str]]:
    pattern = re.compile(r"@(?P<modifier>[&?+\-]?)(?P<name>[^@#~{}\r\n]+?)\{(?P<amount>[^{}]*)\}")
    result = []
    for match in pattern.finditer(text):
        amount = match.group("amount").strip()
        quantity, separator, unit = amount.partition("%")
        result.append(
            {
                "name": match.group("name").strip(),
                "modifier": match.group("modifier"),
                "amount": amount,
                "quantity": quantity.strip(),
                "unit": unit.strip() if separator else "",
            }
        )
    return result


def parse_cooklang_cookware(text: str) -> list[str]:
    return [match.strip() for match in re.findall(r"#([^#@~{}\r\n]+?)\{\}", text)]


def parse_cooklang_timers(text: str) -> list[dict[str, str]]:
    result = []
    for name, amount in re.findall(r"~([^@#~{}\r\n]*)\{([^{}]+)\}", text):
        duration, separator, unit = amount.partition("%")
        result.append({"name": name.strip(), "duration": duration.strip(), "unit": unit.strip() if separator else ""})
    return result


def validate_cooklang(
    content: str, expected_ingredients: list[IngredientData] | None = None
) -> list[str]:
    frontmatter, body, errors = _split_frontmatter(content)
    for key in ("id", "title", "servings", "mealTypes"):
        if key not in frontmatter:
            errors.append(f"Frontmatter missing {key!r} field")
    recipe_id = frontmatter.get("id")
    if recipe_id and not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", str(recipe_id)):
        errors.append("Frontmatter 'id' must use lowercase kebab-case")
    meal_types = frontmatter.get("mealTypes")
    if meal_types is not None and (
        not isinstance(meal_types, list)
        or not meal_types
        or any(value not in {"lunch", "dinner"} for value in meal_types)
    ):
        errors.append("Frontmatter 'mealTypes' must be a non-empty lunch/dinner list")
    if "ingredients" in frontmatter:
        errors.append("Ingredients must be CookLang markers in steps, not frontmatter metadata")
    if not body.strip():
        errors.append("Recipe has no instruction steps")

    parsed_ingredients = parse_cooklang_ingredients(body)
    if not parsed_ingredients:
        errors.append("Recipe has no CookLang ingredient markers")
    for ingredient in parsed_ingredients:
        amount = ingredient["amount"]
        if amount and " " in amount and "%" not in amount:
            errors.append(f"Ingredient {ingredient['name']!r} must separate quantity and unit with '%'")
    for timer in parse_cooklang_timers(body):
        if not timer["duration"] or not timer["unit"]:
            errors.append("Timers must use ~{duration%unit} syntax")
    if expected_ingredients is not None:
        expected_names = {item.name for item in expected_ingredients}
        actual_names = {item["name"] for item in parsed_ingredients}
        if not expected_names.issubset(actual_names):
            errors.append("Generated ingredient markers do not match the source ingredient list")
    return errors
