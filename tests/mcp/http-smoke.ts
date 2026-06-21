import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const endpoint = process.env.MEALMIND_MCP_HTTP_URL ?? "http://127.0.0.1:3102/api/mcp";

const client = new Client({
  name: "mealmind-mcp-http-smoke",
  version: "0.1.0",
});

const transport = new StreamableHTTPClientTransport(new URL(endpoint));

function textFromContent(content: unknown) {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((item) => {
      if (
        item &&
        typeof item === "object" &&
        "text" in item &&
        typeof item.text === "string" &&
        (!("type" in item) || item.type === "text")
      ) {
        return item.text;
      }
      return "";
    })
    .join("\n");
}

try {
  await client.connect(transport);
  const tools = await client.listTools();
  const resources = await client.listResources();
  const recipe = await client.callTool({
    name: "get_recipe",
    arguments: { recipeId: "chicken-rice-bowl" },
  });
  const recipeText = textFromContent(recipe.content);

  if (!recipeText.includes("Cook rice according to package instructions.")) {
    throw new Error("HTTP MCP get_recipe did not return recipe instructions.");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        endpoint,
        tools: tools.tools.length,
        resources: resources.resources.length,
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}
