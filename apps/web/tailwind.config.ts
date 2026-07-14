import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{vue,js,ts}", "./error.vue"],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        field: "rgb(var(--field) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        strong: "rgb(var(--strong) / <alpha-value>)",
        "strong-foreground": "rgb(var(--strong-foreground) / <alpha-value>)",
        moss: "rgb(var(--moss) / <alpha-value>)",
        tomato: "rgb(var(--tomato) / <alpha-value>)",
        steel: "rgb(var(--steel) / <alpha-value>)",
        rail: "rgb(var(--rail) / <alpha-value>)",
        "rail-foreground": "rgb(var(--rail-foreground) / <alpha-value>)",
      },
      boxShadow: {
        line: "0 1px 2px rgb(var(--ink) / 0.04), 0 0 0 1px rgb(var(--line) / 0.72)",
        soft: "0 8px 24px rgb(var(--ink) / 0.08)",
        elevated: "0 18px 48px rgb(var(--ink) / 0.14)",
      },
      borderRadius: {
        sm: "0.75rem",
        md: "0.875rem",
        lg: "1rem",
        xl: "1.125rem",
        "2xl": "1.25rem",
      },
      fontFamily: {
        sans: ["Inter Variable", "Inter", "Segoe UI Variable", "SF Pro Text", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Inter Variable", "Inter", "Segoe UI Variable", "SF Pro Display", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
