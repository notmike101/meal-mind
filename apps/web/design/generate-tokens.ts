import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// This is MealMind's fixed format, not a general DTCG resolver.
const sharedGroups = {
  spacing: ["dimension", "mm-space"],
  fontSize: ["dimension", "mm-text"],
  fontFamily: ["fontFamily", "mm-font"],
  fontWeight: ["number", "mm-weight"],
  lineHeight: ["number", "mm-leading"],
  lineSize: ["dimension", "mm-leading"],
  letterSpacing: ["dimension", "mm-tracking"],
  radius: ["dimension", "mm-radius"],
  width: ["dimension", "mm-max-w"],
  height: ["dimension", "mm-h"],
  borderWidth: ["dimension", "mm-border"],
  duration: ["duration", "mm-duration"],
  easing: ["cubicBezier", "mm-ease"],
  opacity: ["number", "mm-opacity"],
  motionDistance: ["dimension", "mm-motion"],
  breakpoint: ["dimension", "mm-breakpoint"],
} as const;

type ObjectData = Record<string, unknown>;

function fail(path: string, message: string): never {
  throw new Error(`MealMind design: ${path}: ${message}`);
}

function object(value: unknown, path: string): ObjectData {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "expected an object");
  return value as ObjectData;
}

function fields(value: ObjectData, keys: string[], path: string) {
  if (Object.keys(value).length !== keys.length || keys.some((key) => !(key in value))) {
    fail(path, `expected exactly ${keys.join(", ")}`);
  }
}

function text(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim()) fail(path, "expected nonempty text");
  return value;
}

function number(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(path, "expected a finite number");
  return value;
}

function dimension(value: unknown, path: string, duration = false): string {
  const data = object(value, path);
  fields(data, ["value", "unit"], path);
  const amount = number(data.value, `${path}.value`);
  const units = duration ? ["ms"] : ["rem", "px", "em", "ch"];
  if (!units.includes(String(data.unit))) fail(path, `unit must be ${units.join(" or ")}`);
  if (duration && amount < 0) fail(path, "duration must not be negative");
  return `${amount}${data.unit}`;
}

function color(value: unknown, path: string): string {
  if (typeof value !== "string" || !/^#[\da-f]{6}$/i.test(value)) fail(path, "expected #rrggbb");
  return [1, 3, 5].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16)).join(" ");
}

function serialize(type: string, value: unknown, path: string): string {
  switch (type) {
    case "color": return color(value, path);
    case "dimension": return dimension(value, path);
    case "duration": return dimension(value, path, true);
    case "number": return String(number(value, path));
    case "fontFamily": {
      if (!Array.isArray(value) || !value.length) fail(path, "expected a nonempty font-family array");
      return value.map((font, index) => {
        const name = text(font, `${path}.${index}`);
        if (!/^[a-z\d -]+$/i.test(name)) fail(path, "invalid font-family name");
        return name.includes(" ") ? `"${name}"` : name;
      }).join(", ");
    }
    case "cubicBezier": {
      if (!Array.isArray(value) || value.length !== 4) fail(path, "expected four cubic-bezier numbers");
      const points = value.map((point, index) => number(point, `${path}.${index}`));
      if (points.some((point, index) => (index === 0 || index === 2) && (point < 0 || point > 1))) fail(path, "Bezier x coordinates must be in [0, 1]");
      return `cubic-bezier(${points.join(", ")})`;
    }
    case "shadow": {
      if (!Array.isArray(value) || !value.length) fail(path, "expected a nonempty shadow array");
      return value.map((entry, index) => {
        const shadowPath = `${path}.${index}`;
        const shadow = object(entry, shadowPath);
        fields(shadow, ["x", "y", "blur", "spread", "color", "alpha"], shadowPath);
        const alpha = number(shadow.alpha, `${shadowPath}.alpha`);
        if (alpha < 0 || alpha > 1) fail(shadowPath, "shadow alpha must be in [0, 1]");
        const lengths = ["x", "y", "blur", "spread"].map((key) => dimension(shadow[key], `${shadowPath}.${key}`));
        if (number(object(shadow.blur, shadowPath).value, shadowPath) < 0) fail(shadowPath, "shadow blur must not be negative");
        return `${lengths.join(" ")} rgb(${color(shadow.color, shadowPath)} / ${alpha})`;
      }).join(", ");
    }
    default: return fail(path, `unknown token type ${type}`);
  }
}

function strings(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) fail(path, "expected an array");
  return value.map((entry, index) => text(entry, `${path}.${index}`));
}

/** Validate repository token/metadata objects and return deterministic CSS without filesystem writes. */
export function renderDesignTokens(input: unknown, metadata: unknown): string {
  const tokens = object(input, "tokens");
  fields(tokens, ["version", "shared", "themes"], "tokens");
  if (tokens.version !== 1) fail("tokens.version", "expected 1");
  const shared = object(tokens.shared, "shared");
  fields(shared, Object.keys(sharedGroups), "shared");
  const themes = object(tokens.themes, "themes");
  fields(themes, ["light", "dark"], "themes");
  const references = new Set<string>();
  const emitted = new Set<string>();
  const group = (data: unknown, path: string, type: string, prefix: string): string[] => {
    const entries = object(data, path);
    if (!Object.keys(entries).length) fail(path, "token group must not be empty");
    return Object.entries(entries).map(([name, raw]) => {
      if (!/^(?:[a-z][a-z\d-]*|DEFAULT|\d+(?:\.\d+|[a-z][a-z\d-]*)?)$/.test(name)) fail(path, `invalid token name ${name}`);
      const tokenPath = `${path}.${name}`;
      const entry = object(raw, tokenPath);
      fields(entry, ["$type", "$value", "$description"], tokenPath);
      text(entry.$description, `${tokenPath}.$description`);
      if (entry.$type !== type) fail(tokenPath, `expected $type ${type}, received ${String(entry.$type)}`);
      if (path.startsWith("shared.")) {
        if ((path === "shared.spacing" || path === "shared.fontSize" || path === "shared.radius" || path === "shared.width" || path === "shared.height" || path === "shared.borderWidth" || path === "shared.lineSize" || path === "shared.motionDistance" || path === "shared.breakpoint")
          && number(object(entry.$value, tokenPath).value, tokenPath) < 0) fail(tokenPath, "dimension must not be negative");
        if (path === "shared.opacity" && (number(entry.$value, tokenPath) < 0 || number(entry.$value, tokenPath) > 1)) fail(tokenPath, "opacity must be in [0, 1]");
        if (path === "shared.fontWeight" && (!Number.isInteger(entry.$value) || number(entry.$value, tokenPath) < 1 || number(entry.$value, tokenPath) > 1000)) fail(tokenPath, "font weight must be an integer in [1, 1000]");
        if (path === "shared.lineHeight" && number(entry.$value, tokenPath) <= 0) fail(tokenPath, "line height must be positive");
      }
      const cssName = `${prefix}${prefix ? "-" : ""}${name}`;
      const uniqueName = `${path.startsWith("shared.") ? "shared" : path.split(".")[1]}:${cssName}`;
      if (emitted.has(uniqueName)) fail(tokenPath, `duplicate CSS variable ${cssName}`);
      emitted.add(uniqueName);
      references.add(tokenPath);
      return `  --${cssName.replaceAll(".", "\\.")}: ${serialize(type, entry.$value, tokenPath)};`;
    });
  };
  const sharedCss = Object.entries(sharedGroups).flatMap(([name, [type, prefix]]) => group(shared[name], `shared.${name}`, type, prefix));
  // Preserve the existing size-variable contract; aliases use the one spacing scale.
  for (const key of ["8", "9", "10"]) {
    if (!references.has(`shared.spacing.${key}`)) fail("shared.spacing", `missing required size ${key}`);
    for (const prefix of ["h", "w"]) {
      if (emitted.has(`shared:mm-${prefix}-${key}`)) fail("shared.height", `reserved size alias mm-${prefix}-${key}`);
      sharedCss.push(`  --mm-${prefix}-${key}: var(--mm-space-${key});`);
    }
  }
  sharedCss.push("  --mm-min-w-10: var(--mm-space-10);");
  const themeCss: Record<"light" | "dark", string[]> = { light: [], dark: [] };
  for (const theme of ["light", "dark"] as const) {
    const data = object(themes[theme], `themes.${theme}`);
    fields(data, ["color", "shadow"], `themes.${theme}`);
    themeCss[theme] = [...group(data.color, `themes.${theme}.color`, "color", ""), ...group(data.shadow, `themes.${theme}.shadow`, "shadow", "mm-shadow")];
  }
  for (const kind of ["color", "shadow"]) {
    const light = Object.keys(object(object(themes.light, "themes.light")[kind], kind));
    const dark = Object.keys(object(object(themes.dark, "themes.dark")[kind], kind));
    if (light.length !== dark.length || light.some((name) => !dark.includes(name))) fail(`themes.${kind}`, "light and dark token names must match");
  }
  const meta = object(metadata, "components metadata");
  fields(meta, ["version", "components"], "components metadata");
  if (meta.version !== 1) fail("components.version", "expected 1");
  const components = object(meta.components, "components");
  if (!Object.keys(components).length) fail("components", "expected component patterns");
  for (const [name, raw] of Object.entries(components)) {
    const path = `components.${name}`;
    const entry = object(raw, path);
    fields(entry, ["description", "sources", "selectors", "tokens", "states", "related", "api"], path);
    text(entry.description, `${path}.description`);
    const sources = strings(entry.sources, `${path}.sources`);
    if (!sources.length || sources.some((source) => !/^app\/(?:[a-zA-Z\d_-]+\/)*[a-zA-Z\d_-]+\.(?:vue|css)$/.test(source))) fail(path, "sources must be repository-relative app Vue/CSS paths");
    strings(entry.selectors, `${path}.selectors`);
    for (const reference of strings(entry.tokens, `${path}.tokens`)) {
      const paths = /^(color|shadow)\./.test(reference) ? ["light", "dark"].map((theme) => `themes.${theme}.${reference}`) : [reference];
      if (paths.some((tokenPath) => !references.has(tokenPath))) fail(path, `unknown token reference ${reference}`);
    }
    for (const relationship of strings(entry.related, `${path}.related`)) {
      if (!Object.hasOwn(components, relationship)) fail(path, `unknown component relationship ${relationship}`);
    }
    const api = object(entry.api, `${path}.api`);
    fields(api, ["props", "slots", "events"], `${path}.api`);
    strings(api.slots, `${path}.api.slots`);
    for (const field of ["states", "props", "events"]) {
      const values = object(field === "states" ? entry.states : api[field], `${path}.${field}`);
      for (const [key, value] of Object.entries(values)) text(value, `${path}.${field}.${key}`);
    }
  }
  const block = (selector: string, theme: string, declarations: string[]) => `${selector} {\n  color-scheme: ${theme};\n${declarations.join("\n")}\n}`;
  return [
    "/* Generated from design/tokens.json. Do not edit or commit this file. */",
    block(":root", "light", [...sharedCss, ...themeCss.light]),
    block(':root[data-theme="light"]', "light", themeCss.light),
    block(':root[data-theme="dark"]', "dark", themeCss.dark),
    `@media (prefers-color-scheme: dark) {\n${block(":root:not([data-theme])", "dark", themeCss.dark).split("\n").map((line) => `  ${line}`).join("\n")}\n}`,
    "",
  ].join("\n\n");
}

/** Read fixed JSON inputs, validate metadata sources, write ignored CSS, return its absolute import path. */
export function generateDesignTokens(): string {
  const input = JSON.parse(readFileSync(new URL("./tokens.json", import.meta.url), "utf8")) as unknown;
  const metadata = JSON.parse(readFileSync(new URL("./components.json", import.meta.url), "utf8")) as unknown;
  const css = renderDesignTokens(input, metadata);
  const components = object(object(metadata, "metadata").components, "components");
  for (const [name, raw] of Object.entries(components)) {
    for (const source of strings(object(raw, name).sources, name)) {
      if (!existsSync(new URL(`../${source}`, import.meta.url))) fail(name, `missing component source ${source}`);
    }
  }
  const directory = new URL("../.nuxt/", import.meta.url);
  const output = new URL("mealmind-design-tokens.css", directory);
  mkdirSync(directory, { recursive: true });
  if (!existsSync(output) || readFileSync(output, "utf8") !== css) writeFileSync(output, css, "utf8");
  return fileURLToPath(output).replaceAll("\\", "/");
}
