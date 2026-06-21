import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMealMindMcpServer } from "./app.js";

async function main() {
  const server = createMealMindMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
