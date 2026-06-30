import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({
  name: "mealmind-mcp-smoke",
  version: "0.1.0",
});

const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "services/mcp/src/server.ts"],
  cwd: process.cwd(),
  stderr: "pipe",
});

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
  const toolNames = tools.tools.map((tool) => tool.name);
  for (const expectedTool of [
    "list_recipes",
    "get_recipe",
    "get_planning_state",
    "create_blank_plan",
    "add_plan_meal",
    "update_plan_meal",
    "remove_plan_meal",
    "swap_meal_recipe",
  ]) {
    if (!toolNames.includes(expectedTool)) {
      throw new Error(`Missing MCP tool: ${expectedTool}`);
    }
  }

  const resources = await client.listResources();
  const resourceUris = resources.resources.map((resource) => resource.uri);
  for (const expectedResource of ["mealmind://app/summary", "mealmind://recipes"]) {
    if (!resourceUris.includes(expectedResource)) {
      throw new Error(`Missing MCP resource: ${expectedResource}`);
    }
  }

  const recipeList = await client.callTool({
    name: "list_recipes",
    arguments: {},
  });
  const recipeText = textFromContent(recipeList.content);
  if (!recipeText?.includes("Hot Honey Chicken with BBQ-Roasted Potatoes & Buttery Broccoli")) {
    throw new Error("list_recipes did not return expected recipe content.");
  }

  const recipeDetail = await client.readResource({
    uri: "mealmind://recipes/hot-honey-chicken-with-bbq-roasted-potatoes-buttery-broccoli",
  });
  const detailText = textFromContent(recipeDetail.contents);
  if (!detailText?.includes("cooklang") || !detailText.includes("Adjust racks to top and middle positions and preheat oven to 425 degrees.")) {
    throw new Error("recipe detail resource did not include instructions.");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        tools: toolNames.length,
        resources: resourceUris.length,
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}
