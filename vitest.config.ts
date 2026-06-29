import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./apps/web/app", import.meta.url)),
      "@mealmind/contracts": fileURLToPath(new URL("./packages/contracts/src/index.ts", import.meta.url)),
      "@mealmind/domain": fileURLToPath(new URL("./packages/domain/src/index.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
  },
});
