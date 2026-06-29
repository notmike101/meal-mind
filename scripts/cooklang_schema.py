import re, yaml
from pathlib import Path


def parse_cooklang_ingredients(text: str) -> list[dict]:
    """Extract @ingredient{amount} markers from step text."""
    return []


def parse_cooklang_cookware(text: str) -> list[str]:
    """Extract #cookware{} markers from step text."""
    return []


def parse_cooklang_timers(text: str) -> list[dict]:
    """Extract ~timer{name}{duration%unit} markers from step text."""
    return []


def validate_cooklang(content: str) -> list[str]:
    """Validate a .cook file string. Returns list of error messages (empty if valid)."""
    errors = []
    parts = content.split("---")
    if len(parts) < 3:
        errors.append("Missing YAML frontmatter delimiters")
        return errors
    try:
        fm = yaml.safe_load(parts[1]) or {}
    except yaml.YAMLError as e:
        errors.append(f"Invalid frontmatter YAML: {e}")
        return errors
    if "id" not in fm:
        errors.append("Frontmatter missing 'id' field")
    if "title" not in fm:
        errors.append("Frontmatter missing 'title' field")
    body = parts[-1] if len(parts) > 2 else ""
    bad_ingredients = re.findall(r'@[^\s{]+\{[^\}]*\}', body)
    for m in bad_ingredients:
        name = m.split("{")[0][1:]
        if not re.match(r'^[a-zA-Z0-9 _\-]+$', name):
            errors.append(f"Invalid ingredient marker: {m}")
    return errors


def format_cooklang(frontmatter: dict, steps_text: str) -> str:
    """Format frontmatter dict + step text into valid .cook output."""
    fm_str = yaml.dump(frontmatter, default_flow_style=False, allow_unicode=True).strip()
    return f"---\n{fm_str}\n---\n{steps_text}"


def build_frontmatter(title: str, description: str = "", servings=2,
                      meal_types=None, tags=None, prep_time="", cook_time="",
                      difficulty="", cuisine="", source_url="", author="",
                      nutrition=None, utensils=None) -> dict:
    """Construct CookLang-compatible YAML frontmatter from extracted data."""
    fm = {
        "title": title,
        "description": description,
        "servings": servings,
    }
    if meal_types:
        fm["mealTypes"] = meal_types
    if tags is not None:
        fm["tags"] = tags
    if prep_time:
        fm["prep time"] = prep_time
    if cook_time:
        fm["cook time"] = cook_time
    combined = ""
    if prep_time and cook_time:
        combined = f"{prep_time} + {cook_time}"
    elif cook_time:
        combined = cook_time
    elif prep_time:
        combined = prep_time
    if combined:
        fm["time required"] = combined
    if difficulty:
        fm["difficulty"] = difficulty
    if cuisine:
        fm["cuisine"] = cuisine
    if source_url:
        fm["source"] = source_url
    if author:
        fm["author"] = author
    if nutrition:
        fm["nutrition"] = nutrition
    if utensils:
        fm["utensils"] = utensils
    return fm


def slugify(title: str) -> str:
    """Convert recipe title to filesystem-safe lowercase slug ID."""
    slug = re.sub(r'[^a-zA-Z0-9\s-]', '', title).strip().lower()
    slug = re.sub(r'[\s]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug.strip('-')
