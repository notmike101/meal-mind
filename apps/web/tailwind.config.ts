import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
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
        line: "inset 0 0 0 1px rgb(var(--line) / 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
