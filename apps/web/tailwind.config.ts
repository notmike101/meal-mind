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
        line: "inset 0 0 0 1px rgb(var(--line) / 0.24)",
        soft: "4px 4px 0 rgb(var(--line) / 0.14)",
      },
      borderRadius: {
        md: "0.25rem",
        lg: "0.375rem",
        xl: "0.5rem",
        "2xl": "0.75rem",
      },
    },
  },
  plugins: [],
};

export default config;
