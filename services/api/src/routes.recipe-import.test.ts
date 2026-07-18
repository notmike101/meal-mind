import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const importMocks = vi.hoisted(() => ({
  enqueueRecipeImport: vi.fn(),
  getRecipeImportJobDto: vi.fn(),
  listRecipeImportJobDtos: vi.fn(),
}));

vi.mock("./recipe-import.js", () => importMocks);

import { registerRoutes } from "./routes";

const job = {
  id: "job-1",
  sourceUrl: "https://example.com/recipe",
  status: "queued" as const,
  recipeId: null,
  recipeTitle: null,
  error: null,
  deduplicated: false,
  createdAt: "2026-07-15T00:00:00.000Z",
  updatedAt: "2026-07-15T00:00:00.000Z",
  completedAt: null,
};

describe("recipe import API contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queues valid URLs with a 202 response", async () => {
    importMocks.enqueueRecipeImport.mockResolvedValue(job);
    const app = Fastify();
    registerRoutes(app, { triggerRecipeImport: vi.fn() });

    const response = await app.inject({
      method: "POST",
      url: "/api/recipes/imports",
      payload: { url: "https://example.com/recipe" },
    });

    expect(response.statusCode).toBe(202);
    expect(response.json().data).toEqual(job);
    expect(importMocks.enqueueRecipeImport).toHaveBeenCalledWith("https://example.com/recipe");
    await app.close();
  });

  it("rejects unsupported schemes and embedded credentials", async () => {
    const app = Fastify();
    registerRoutes(app);

    const unsupported = await app.inject({ method: "POST", url: "/api/recipes/imports", payload: { url: "file:///recipe.cook" } });
    const credentials = await app.inject({ method: "POST", url: "/api/recipes/imports", payload: { url: "https://user:pass@example.com/recipe" } });

    expect(unsupported.statusCode).toBe(400);
    expect(credentials.statusCode).toBe(400);
    expect(importMocks.enqueueRecipeImport).not.toHaveBeenCalled();
    await app.close();
  });

  it("supports polling and recent-import recovery", async () => {
    importMocks.getRecipeImportJobDto.mockResolvedValue({ ...job, status: "converting" });
    importMocks.listRecipeImportJobDtos.mockResolvedValue([{ ...job, status: "succeeded", recipeId: "recipe-1" }]);
    const app = Fastify();
    registerRoutes(app);

    const polled = await app.inject({ method: "GET", url: "/api/recipes/imports/job-1" });
    const recent = await app.inject({ method: "GET", url: "/api/recipes/imports?limit=10" });

    expect(polled.statusCode).toBe(200);
    expect(polled.json().data.status).toBe("converting");
    expect(recent.statusCode).toBe(200);
    expect(recent.json().data[0].recipeId).toBe("recipe-1");
    expect(importMocks.listRecipeImportJobDtos).toHaveBeenCalledWith(10);
    await app.close();
  });
});
