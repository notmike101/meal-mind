import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17201b",
        field: "#f6f4ed",
        moss: "#5d7b63",
        tomato: "#a94d3d",
        steel: "#425466",
      },
      boxShadow: {
        line: "inset 0 0 0 1px rgba(23, 32, 27, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
