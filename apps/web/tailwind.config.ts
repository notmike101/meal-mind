import type { Config } from "tailwindcss";
import tokens from "./design/tokens.json";

function variables(values: Record<string, unknown>, prefix: string): Record<string, string> {
  return Object.fromEntries(Object.keys(values).map((key) => [key, `var(--${prefix}-${key.replaceAll(".", "\\.")})`]));
}

const spacing = variables(tokens.shared.spacing, "mm-space");
const widths = variables(tokens.shared.width, "mm-max-w");
const intrinsicWidths = { auto: "auto", full: "100%", min: "min-content", max: "max-content", fit: "fit-content" };

const config: Config = {
  content: ["./app/**/*.{vue,js,ts}"],
  theme: {
    // Values live only in JSON. Intrinsic/viewport keywords are layout behavior, not a second scale.
    colors: {
      inherit: "inherit",
      current: "currentColor",
      transparent: "transparent",
      ...Object.fromEntries(Object.keys(tokens.themes.light.color).map((key) => [key, `rgb(var(--${key}) / <alpha-value>)`])),
    },
    spacing,
    fontSize: variables(tokens.shared.fontSize, "mm-text"),
    fontFamily: variables(tokens.shared.fontFamily, "mm-font"),
    fontWeight: variables(tokens.shared.fontWeight, "mm-weight"),
    lineHeight: { ...variables(tokens.shared.lineHeight, "mm-leading"), ...variables(tokens.shared.lineSize, "mm-leading") },
    letterSpacing: variables(tokens.shared.letterSpacing, "mm-tracking"),
    borderRadius: variables(tokens.shared.radius, "mm-radius"),
    borderWidth: variables(tokens.shared.borderWidth, "mm-border"),
    boxShadow: { ...variables(tokens.themes.light.shadow, "mm-shadow"), none: "none" },
    transitionDuration: { ...variables(tokens.shared.duration, "mm-duration"), DEFAULT: "var(--mm-duration-interaction)" },
    transitionTimingFunction: variables(tokens.shared.easing, "mm-ease"),
    screens: Object.fromEntries(Object.entries(tokens.shared.breakpoint).map(([key, token]) => [key, `${token.$value.value}${token.$value.unit}`])),
    width: {
      ...spacing,
      ...widths,
      ...intrinsicWidths,
      screen: "100vw",
      svw: "100svw",
      lvw: "100lvw",
      dvw: "100dvw",
      "1/2": "50%",
      "1/3": "33.333333%",
      "2/3": "66.666667%",
      "1/4": "25%",
      "3/4": "75%",
    },
    minWidth: { ...spacing, ...intrinsicWidths, control: "var(--mm-h-control)" },
    maxWidth: { ...spacing, ...widths, ...intrinsicWidths, none: "none" },
    height: { ...spacing, ...intrinsicWidths, screen: "100vh", svh: "100svh", lvh: "100lvh", dvh: "100dvh", control: "var(--mm-h-control)" },
    minHeight: { ...spacing, ...intrinsicWidths, screen: "100vh", svh: "100svh", lvh: "100lvh", dvh: "100dvh", control: "var(--mm-h-control)" },
    maxHeight: { ...spacing, ...intrinsicWidths, screen: "100vh", svh: "100svh", lvh: "100lvh", dvh: "100dvh", none: "none" },
  },
  plugins: [],
};

export default config;
