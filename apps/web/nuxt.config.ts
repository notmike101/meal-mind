import { fileURLToPath } from "node:url";
import { defineNuxtConfig } from "nuxt/config";
import { generateDesignTokens } from "./design/generate-tokens";

const tokenCss = generateDesignTokens();

export default defineNuxtConfig({
  srcDir: "app",
  app: {
    pageTransition: { name: "page", mode: "out-in" },
  },
  modules: ["@pinia/nuxt"],
  css: [tokenCss, "~/assets/css/main.css"],
  hooks: {
    // The Nuxt CLI clears buildDir after loading config for build/prepare.
    "build:before": () => { generateDesignTokens(); },
  },
  alias: {
    "@mealmind/contracts": fileURLToPath(new URL("../../packages/contracts/src/index.ts", import.meta.url)),
  },
  devServer: {
    host: "127.0.0.1",
    port: 3100,
  },
  runtimeConfig: {
    apiBaseUrl: "http://127.0.0.1:3101",
    mcpBaseUrl: "http://127.0.0.1:3102",
  },
  nitro: {
    preset: "node-server",
  },
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
  vite: {
    resolve: {
      preserveSymlinks: true,
    },
  },
});
