import eslint from "@eslint/js";
import { globalIgnores } from "eslint/config";
import pluginVue from "eslint-plugin-vue";
import tseslint from "typescript-eslint";
import vueParser from "vue-eslint-parser";

export default [
  globalIgnores([
    "**/.nuxt/**",
    "**/.output/**",
    "**/dist/**",
    "node_modules/**",
    "playwright-report/**",
    "test-results/**",
  ]),
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs["flat/recommended"],
  {
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".vue"],
        sourceType: "module",
      },
    },
    rules: {
      "vue/multi-word-component-names": "off",
      "vue/max-attributes-per-line": "off",
      "vue/singleline-html-element-content-newline": "off",
      "vue/html-self-closing": "off",
      "vue/attributes-order": "off",
    },
  },
  {
    files: ["**/*.{ts,vue}"],
    languageOptions: {
      globals: {
        document: "readonly",
        window: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
