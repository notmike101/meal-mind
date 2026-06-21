import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./packages/db/src/schema.ts",
  out: "./packages/db/src/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://helloqwen:helloqwen@127.0.0.1:54320/helloqwen",
  },
});
