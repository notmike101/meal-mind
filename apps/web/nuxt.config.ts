import { fileURLToPath } from "node:url";
import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  srcDir: "app",
  modules: ["@pinia/nuxt"],
  css: ["~/assets/css/main.css"],
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
