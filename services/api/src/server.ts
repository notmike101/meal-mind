import Fastify from "fastify";
import { ensureDatabase } from "@mealmind/db";
import { registerRoutes } from "./routes.js";
import { createAutomaticPlanningService } from "./services/automatic-planning.js";

const port = Number(process.env.PORT ?? 3101);
const host = process.env.HOST ?? "0.0.0.0";

export async function buildServer(options: { automaticPlanning?: boolean } = {}) {
  const app = Fastify({ logger: true });
  const automaticPlanning = createAutomaticPlanningService(app.log);
  registerRoutes(app, {
    triggerAutomaticPlanning: () => automaticPlanning.trigger(),
  });

  if (options.automaticPlanning !== false) {
    app.addHook("onReady", async () => {
      automaticPlanning.start();
    });
    app.addHook("onClose", async () => {
      automaticPlanning.stop();
    });
  }
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
