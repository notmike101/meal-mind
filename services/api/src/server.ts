import Fastify from "fastify";
import { ensureDatabase } from "@mealmind/db";
import { registerRoutes } from "./routes.js";

const port = Number(process.env.PORT ?? 3101);
const host = process.env.HOST ?? "0.0.0.0";

export async function buildServer() {
  const app = Fastify({ logger: true });
  registerRoutes(app);
  return app;
}

async function main() {
  await ensureDatabase();
  const app = await buildServer();
  await app.listen({ port, host });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
