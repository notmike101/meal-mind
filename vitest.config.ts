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
      "@mealmind/ai": fileURLToPath(new URL("./packages/ai/src/index.ts", import.meta.url)),
      "@mealmind/db/repositories/ai-events": fileURLToPath(new URL("./packages/db/src/repositories/ai-events.ts", import.meta.url)),
      "@mealmind/db/repositories/plans": fileURLToPath(new URL("./packages/db/src/repositories/plans.ts", import.meta.url)),
      "@mealmind/db/repositories/settings": fileURLToPath(new URL("./packages/db/src/repositories/settings.ts", import.meta.url)),
      "@mealmind/db/repositories/shopping": fileURLToPath(new URL("./packages/db/src/repositories/shopping.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["packages/**/*.test.ts", "services/**/*.test.ts", "apps/**/*.test.ts"],
  },
});
