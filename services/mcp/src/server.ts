import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createHelloQwenMcpServer } from "./app.js";

async function main() {
  const server = createHelloQwenMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
