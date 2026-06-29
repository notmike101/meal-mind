# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "requests>=2.31",
#   "lxml>=5.0",
#   "PyYAML>=6.0",
# ]
# ///

import json, re, sys, os, subprocess, tempfile, unicodedata
from pathlib import Path

# Import shared schema from project scripts/ (repo root)
import sys, os
from pathlib import Path
_script_dir = Path(__file__).resolve().parent  # .../.agents/skills/import-cooklang/scripts/
_repo_root = _script_dir.parents[3]  # up through .agents/, skills/, import-cooklang/ to repo root
sys.path.insert(0, str(_repo_root / 'scripts'))
from cooklang_schema import build_frontmatter, slugify, validate_cooklang, format_cooklang

class RecipeExtractor:
    """Extract recipe data from a URL using multiple strategies."""
    
    def __init__(self, url: str):
        self.url = url
        self.html = None
    
    def fetch(self) -> str:
        if not self.html:
            import requests
            response = requests.get(self.url, timeout=30)
            response.raise_for_status()
            self.html = response.text
        return self.html
    
    def extract_jsonld(self) -> dict | None:
        """Extract the first Recipe-type JSON-LD block from HTML."""
        html = self.fetch()
        from lxml import etree
        parser = etree.HTMLParser(recover=True)
        tree = etree.fromstring(html, parser)
        scripts = tree.xpath('//script[@type="application/ld+json"]/text()')
        
        for script_text in scripts:
            try:
                data = json.loads(script_text)
                if isinstance(data, dict):
                    candidates = [data]
                elif isinstance(data, list):
                    candidates = data
                else:
                    continue
                
                for candidate in candidates:
                    if not isinstance(candidate, dict):
                        continue
                    t = candidate.get('@type', '')
                    if (isinstance(t, str) and t == 'Recipe') or \
                       (isinstance(t, list) and 'Recipe' in t):
                        return candidate
            except (json.JSONDecodeError, ValueError):
                continue
        return None
    
    def extract_from_jsonld(self, data: dict) -> dict | None:
        """Convert a JSON-LD Recipe object to our internal recipe dict."""
        recipe = {}
        
        # Title
        if isinstance(data.get('name'), str):
            recipe['title'] = data['name'].strip()
        elif isinstance(data.get('@id'), str):
            recipe['title'] = 'Unknown Recipe'
        else:
            return None
        
        # Description
        if isinstance(data.get('description'), str):
            recipe['description'] = data['description'].strip()
        
        # Servings / yield
        servings = data.get('recipeYield')
        if isinstance(servings, int) and servings > 0:
            recipe['servings'] = servings
        elif isinstance(servings, str):
            m = re.search(r'(\d+)', servings)
            if m:
                recipe['servings'] = int(m.group(1))
        
        # Time parsing (ISO 8601 duration like PT35M -> "35 minutes")
        def parse_iso_duration(val):
            if not val or not isinstance(val, str):
                return ""
            m = re.match(r'PT(?:(\d+)H)?(?:?(\d+)M)?', val)
            if not m:
                # Try simpler patterns
                h = re.search(r'(\d+)\s*hour', val, re.IGNORECASE)
                mi = re.search(r'(\d+)\s*(?:min|minute)', val, re.IGNORECASE)
                parts = []
                if h:
                    parts.append(f"{h.group(1)} hour{'s' if int(h.group(1)) > 1 else ''}")
                if mi:
                    parts.append(f"{mi.group(1)} minute{'s' if int(mi.group(1)) > 1 else ''}")
                return ' + '.join(parts) if parts else val.strip()
            h, m2 = m.groups()
            parts = []
            if h and int(h) > 0:
                parts.append(f"{h} hour{'s' if int(h) > 1 else ''}")
            if m2 and int(m2) > 0:
                parts.append(f"{m2} minute{'s' if int(m2) > 1 else ''}")
            return ' + '.join(parts) if parts else ""
        
        prep = data.get('prepTime')
        cook = data.get('cookTime')
        recipe['prep_time'] = parse_iso_duration(prep)
        recipe['cook_time'] = parse_iso_duration(cook)
        
        # Instructions (string or HowToStep array)
        instructions = data.get('recipeInstructions')
        if isinstance(instructions, str):
            recipe['steps_text'] = self._parse_instructions([instructions])
        elif isinstance(instructions, list):
            steps = []
            for instr in instructions:
                if isinstance(instr, dict):
                    text = instr.get('text', '')
                    step_num = instr.get('name', '')  # e.g., "Step 1"
                    if text:
                        cleaned = re.sub(r'^[\s•\-–—]+', '', text).strip()
                        steps.append(cleaned)
                elif isinstance(instr, str):
                    cleaned = re.sub(r'^[\s•\-–—]+', instr).strip()
                    if cleaned:
                        steps.append(cleaned)
            recipe['steps_text'] = '\n\n'.join(steps)
        else:
            recipe['steps_text'] = ''
        
        # Ingredients (from Recipe JSON-LD standard field)
        ingredients = data.get('recipeIngredient', [])
        if isinstance(ingredients, list):
            for ing in ingredients:
                if isinstance(ing, str):
                    # Try to add @ingredient{} markers to steps
                    pass  # We'll handle this during step text processing
        
        # Nutrition
        nutrition_data = data.get('nutrition')
        if isinstance(nutrition_data, dict):
            nutrition = {}
            for key in ['calories', 'totalFat', 'protein', 'totalCarbohydrate', 'saturatedFat']:
                json_key = {'totalFat': 'fat', 'totalCarbohydrate': 'carbohydrate'}.get(key, key)
                val = nutrition_data.get(key) or nutrition_data.get(json_key)
                if isinstance(val, str):
                    nutrition[json_key] = val
            recipe['nutrition'] = nutrition
        
        # Author / chef
        author = data.get('author')
        if isinstance(author, dict):
            recipe['author'] = author.get('name', '')
        elif isinstance(author, str):
            recipe['author'] = author
        
        # Cuisine (from custom properties or category)
        cuisine = data.get('recipeCategory')
        if isinstance(cuisine, list) and len(cuisine) > 0:
            recipe['cuisine'] = cuisine[0] if isinstance(cuisine[0], str) else ''
        
        # Tags / categories
        tags = data.get('recipeCategory')
        if isinstance(tags, list):
            recipe['tags'] = [t for t in tags if isinstance(t, str)]
        
        recipe['source_url'] = data.get('@id', self.url) or self.url
        
        return recipe
    
    def _parse_instructions(self, instructions) -> list[str]:
        """Parse recipeInstructions into step strings."""
        if not instructions:
            return []
        steps = []
        for instr in instructions:
            if isinstance(instr, dict):
                text = instr.get('text', '')
                if text:
                    cleaned = re.sub(r'^[\s•\-–—]+', '', text).strip()
                    steps.append(cleaned)
            elif isinstance(instr, str):
                cleaned = re.sub(r'^[\s•\-–—]+', instr).strip()
                if cleaned:
                    steps.append(cleaned)
        return steps

def import_recipe_from_url(url: str, output_dir: str = 'recipes') -> dict | None:
    """Main entry point: fetch a URL and write a .cook file."""
    extractor = RecipeExtractor(url)
    
    # Strategy 1: JSON-LD extraction (most reliable)
    jsonld = extractor.extract_jsonld()
    if jsonld:
        print(f"Extracted Recipe JSON-LD from {url}")
        recipe = extractor.extract_from_jsonld(jsonld)
        return _save_recipe(recipe, output_dir)
    
    # Strategy 2: DOM scraping fallback
    print("No JSON-LD found; attempting DOM scraping...")
    html = extractor.fetch()
    recipe = _scrape_from_dom(html, url)
    if recipe:
        return _save_recipe(recipe, output_dir)
    
    # Strategy 3: Report failure for manual extraction
    print(f"Could not extract structured data from {url}")
    print("Please provide the URL and let me use browser tools for manual extraction.")
    return None

def _scrape_from_dom(html: str, url: str) -> dict | None:
    """Fallback DOM-based scraping using lxml."""
    from lxml import etree
    parser = etree.HTMLParser(recover=True)
    tree = etree.fromstring(html, parser)
    
    recipe = {}
    
    # Title: look for h1 or meta og:title
    title_el = tree.xpath('//h1[contains(@class, "title") or contains(@class, "recipe-title")]')
    if not title_el:
        og_title = tree.xpath('//meta[@property="og:title"]/@content')
        if og_title:
            title_el_text = [og_title[0]]
        else:
            h1s = tree.xpath('//h1/text()')
            if h1s:
                title_el_text = [h1s[0].strip()]
            else:
                return None
    else:
        title_el_text = [title_el[0].text_content().strip()]
    
    recipe['title'] = title_el_text[0] if title_el_text else 'Unknown Recipe'
    
    # Description from meta description or og:description
    desc = tree.xpath('//meta[@name="description"]/@content')
    if not desc:
        desc = tree.xpath('//meta[@property="og:description"]/@content')
    recipe['description'] = desc[0].strip() if desc else ''
    
    # Ingredients from various class patterns
    ingredients = []
    for cls in ['ingredient', 'ingredients', 'rec-ingredient']:
        els = tree.xpath(f'//*[contains(@class, "{cls}")]/li/text()')
        if els:
            ingredients.extend([e.strip() for e in els])
    
    # Steps from ol/ul with class patterns
    steps = []
    for cls in ['step', 'instruction', 'recipe-step']:
        els = tree.xpath(f'//*[contains(@class, "{cls}")]/p/text() | //*[@class="{cls}"]/text()')
        if els:
            cleaned = [e.strip() for e in els if e.strip()]
            steps.extend(cleaned)
    
    # If we got some data, return it
    if recipe.get('title') and (ingredients or steps):
        recipe['steps_text'] = '\n\n'.join(steps) if steps else ' '.join(ingredients)
        recipe['servings'] = 2  # default
        
        # Try to extract servings from page text
        body = tree.xpath('//body/text()')
        if body:
            body_text = ' '.join(body)
            m = re.search(r'(\d+)\s*serving', body_text, re.IGNORECASE)
            if m:
                recipe['servings'] = int(m.group(1))
        
        return recipe
    
    return None

def _save_recipe(recipe: dict, output_dir: str = 'recipes') -> dict | None:
    """Write recipe dict to a .cook file in the output directory."""
    recipe_id = slugify(recipe['title'])
    filename = f"{recipe_id}.cook"
    
    filepath = os.path.join(output_dir, filename)
    counter = 1
    while os.path.exists(filepath):
        filename = f"{recipe_id}-{counter}.cook"
        filepath = os.path.join(output_dir, filename)
        recipe_id = f"{recipe_id}-{counter}"
        counter += 1
    
    fm = build_frontmatter(
        title=recipe['title'],
        description=recipe.get('description', ''),
        servings=recipe.get('servings', 2),
        meal_types=recipe.get('meal_types'),
        tags=recipe.get('tags'),
        prep_time=recipe.get('prep_time', ''),
        cook_time=recipe.get('cook_time', ''),
        difficulty=recipe.get('difficulty', ''),
        cuisine=recipe.get('cuisine', ''),
        source_url=recipe.get('source_url', ''),
        author=recipe.get('author', ''),
        nutrition=recipe.get('nutrition'),
        utensils=recipe.get('utensils'),
    )
    fm['id'] = recipe_id
    
    content = format_cooklang(fm, recipe.get('steps_text', ''))
    
    os.makedirs(output_dir, exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Saved recipe to {filepath}")
    
    errors = validate_cooklang(content)
    if errors:
        print("Validation warnings:")
        for err in errors:
            print(f"  - {err}")
    
    return recipe

if __name__ == '__main__':
    url = sys.argv[1] if len(sys.argv) > 1 else ''
    output_dir = sys.argv[2] if len(sys.argv) > 2 else 'recipes'
    if not url:
        print("Usage: uv run .agents/skills/import-cooklang/scripts/import-recipe.py <url> [output_dir]")
        sys.exit(1)
    result = import_recipe_from_url(url, output_dir)
    sys.exit(0 if result else 1)
