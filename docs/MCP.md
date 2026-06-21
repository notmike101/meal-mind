# MealMind MCP Server

MealMind includes MCP access so AI agents can explore the app state, recipe library, docs, meal plans, and shopping lists without using the web UI.

There are two transports:

- In-app Streamable HTTP endpoint: `http://127.0.0.1:3100/api/mcp`
- Local stdio command: `npm run mcp`

Prefer the HTTP endpoint when the MealMind web app is already running. Use stdio for agent harnesses that spawn MCP servers directly.

## In-App HTTP Endpoint

Start MealMind:

```powershell
npm run dev -- --port 3100
```

Then connect an MCP Streamable HTTP client to:

```text
http://127.0.0.1:3100/api/mcp
```

TypeScript harness example:

```ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const client = new Client({ name: "external-harness", version: "1.0.0" });
const transport = new StreamableHTTPClientTransport(
  new URL("http://127.0.0.1:3100/api/mcp"),
);

await client.connect(transport);

const tools = await client.listTools();
const resources = await client.listResources();
const recipe = await client.callTool({
  name: "get_recipe",
  arguments: { recipeId: "chicken-rice-bowl" },
});

await client.close();
```

Verify the HTTP endpoint:

```powershell
npm run mcp:http-smoke
```

## Stdio Server

From the repository root:

```powershell
npm run mcp
```

For an MCP client config, use:

```json
{
  "mcpServers": {
    "mealmind": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "<repo-root>"
    }
  }
}
```

## Resources

- `mealmind://app/summary`
- `mealmind://recipes`
- `mealmind://recipes/{recipeId}`
- `mealmind://plans/current`
- `mealmind://shopping/current`
- `mealmind://docs/implementation-plan`
- `mealmind://docs/handoff`
- `mealmind://docs/work-log`

## Tools

Read-oriented tools:

- `list_recipes`
- `get_recipe`
- `validate_recipe_library`
- `get_planning_state`
- `get_shopping_list`

Workflow tools:

- `generate_next_week_plan`
- `generate_shopping_list`
- `update_slot_servings`
- `swap_slot_recipe`
- `commit_plan`

Workflow tools can mutate local SQLite state and some call LM Studio/Qwen. Agents should inspect resources first and only call mutating tools when explicitly directed.

## Verification

Run either or both:

```powershell
npm run mcp:smoke
npm run mcp:http-smoke
```

The stdio smoke test starts the MCP server over stdio, lists tools/resources, calls `list_recipes`, and reads `mealmind://recipes/chicken-rice-bowl`.

The HTTP smoke test connects to the running app at `/api/mcp`, lists tools/resources, and calls `get_recipe`.
