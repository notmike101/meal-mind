import Fastify from "fastify";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMealMindMcpServer } from "./app.js";

const port = Number(process.env.PORT ?? 3002);
const host = process.env.HOST ?? "0.0.0.0";

async function handleMcpRequest(request: {
  method: string;
  url: string;
  headers: Record<string, unknown>;
  body?: unknown;
}) {
  const server = createMealMindMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      headers.set(key, value.join(", "));
    } else if (value !== undefined) {
      headers.set(key, String(value));
    }
  }

  await server.connect(transport);
  return transport.handleRequest(
    new Request(`http://localhost${request.url}`, {
      method: request.method,
      headers,
      body:
        request.method === "GET" || request.method === "HEAD" || request.body === undefined
          ? undefined
          : JSON.stringify(request.body),
    }),
    { parsedBody: request.body },
  );
}

const app = Fastify({ logger: true });

app.get("/healthz", async () => ({ status: "ok" }));
app.get("/readyz", async () => ({ status: "ready" }));
app.options("/api/mcp", async (_request, reply) =>
  reply
    .header("Access-Control-Allow-Origin", "*")
    .header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS")
    .header("Access-Control-Allow-Headers", "content-type, mcp-session-id, mcp-protocol-version")
    .status(204)
    .send(),
);

for (const method of ["GET", "POST", "DELETE"] as const) {
  app.route({
    method,
    url: "/api/mcp",
    handler: async (request, reply) => {
      const response = await handleMcpRequest({
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: request.body,
      });
      reply.status(response.status);
      response.headers.forEach((value, key) => reply.header(key, value));
      reply.header("Access-Control-Allow-Origin", "*");
      return reply.send(Buffer.from(await response.arrayBuffer()));
    },
  });
}

app.listen({ port, host }).catch((error) => {
  console.error(error);
  process.exit(1);
});
