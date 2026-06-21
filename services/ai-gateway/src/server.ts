import Fastify, { type FastifyInstance } from "fastify";

const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? "0.0.0.0";
const BACKEND_URL = process.env.LM_STUDIO_URL ?? "http://127.0.0.1:1234";

async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  // Proxy OpenAI-compatible API requests to the backend (LM Studio / Qwen)
  app.all("/v1/*", async (request, reply) => {
    const url = `${BACKEND_URL}${request.url}`;
    try {
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(request.headers)) {
        if (["host", "connection", "content-length", "transfer-encoding"].includes(key.toLowerCase())) {
          continue;
        }
        if (Array.isArray(value)) {
          headers[key] = value.join(", ");
        } else if (value != null) {
          headers[key] = String(value);
        }
      }

      const bodyText =
        request.method !== "GET" && request.method !== "HEAD" && request.body !== undefined
          ? typeof request.body === "string"
            ? request.body
            : JSON.stringify(request.body)
          : undefined;

      const res = await fetch(url, {
        method: request.method,
        headers: { ...headers, "content-type": "application/json" },
        body: bodyText,
      });
      reply.raw.statusCode = res.status;
      const contentType = res.headers.get("content-type") ?? "application/octet-stream";
      reply.header("content-type", contentType);
      return reply.send(Buffer.from(await res.arrayBuffer()));
    } catch (error) {
      return reply.status(502).send({ error: `Backend unreachable: ${String(error)}` });
    }
  });

  // Health checks
  app.get("/healthz", async () => ({ status: "ok" }));
  app.get("/readyz", async (_request, reply) => {
    try {
      await fetch(`${BACKEND_URL}/v1/models`, { signal: AbortSignal.timeout(3000) });
      return { status: "ready" };
    } catch {
      return reply.status(503).send({ status: "unhealthy", error: "Backend not reachable" });
    }
  });

  return app;
}

async function main() {
  const app = await buildServer();
  await app.listen({ port: PORT, host: HOST });
  console.log(`AI gateway listening on ${HOST}:${PORT}`);
  console.log(`Proxying to ${BACKEND_URL}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
