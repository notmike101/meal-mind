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
      },
      boxShadow: {
        line: "inset 0 0 0 1px rgb(var(--line) / 0.14)",
        soft: "0 16px 40px rgb(var(--ink) / 0.08)",
      },
      borderRadius: {
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
