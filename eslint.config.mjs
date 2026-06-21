import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { globalIgnores } from "eslint/config";

const eslintConfig = [
  globalIgnores([
    "**/.next/**",
    "**/dist/**",
    "node_modules/**",
    "test-results/**",
  ]),
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      next: {
        rootDir: "apps/web",
      },
    },
  },
];

export default eslintConfig;
