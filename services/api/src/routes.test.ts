import { DrizzleQueryError } from "drizzle-orm";
import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError, type SettingsDto } from "@mealmind/contracts";
import type * as SettingsRepository from "@mealmind/db/repositories/settings";

const repositoryMocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  getSettingsWithPantry: vi.fn(),
  updateSettings: vi.fn(),
  createAiEvent: vi.fn(),
}));

vi.mock("@mealmind/db/repositories/settings", async (importOriginal) => ({
  ...await importOriginal<typeof SettingsRepository>(),
  getSettings: repositoryMocks.getSettings,
  getSettingsWithPantry: repositoryMocks.getSettingsWithPantry,
  updateSettings: repositoryMocks.updateSettings,
}));
vi.mock("@mealmind/db/repositories/ai-events", () => ({ createAiEvent: repositoryMocks.createAiEvent }));

import { toPublicSettings } from "@mealmind/db/repositories/settings";
import { registerRoutes } from "./routes";

const savedSettings: SettingsDto & { aiApiKey?: string | null } = {
  id: 1,
  timezone: "UTC",
  aiBaseUrl: "https://saved.example/v1",
  aiModel: "manual-model",
  aiApiKey: "saved-secret",
  planningPreferences: "",
  planningVarietyRules: "",
  defaultMealServings: 2,
  defaultWeeklyMealCount: 7,
  autoGenerateNextWeek: false,
  createdAt: "2026-07-15T00:00:00.000Z",
  updatedAt: "2026-07-15T00:00:00.000Z",
};

function createApp() {
  const app = Fastify();
  registerRoutes(app);
  return app;
}

// Keep the production AI client: assertions inspect its provider transport, not a mocked client echo.
const providerFetch = vi.fn<typeof fetch>();

describe("provider settings routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("OPENAI_COMPATIBLE_API_KEY", "environment-secret");
    vi.stubGlobal("fetch", providerFetch);
    repositoryMocks.getSettings.mockResolvedValue(savedSettings);
    repositoryMocks.createAiEvent.mockResolvedValue(undefined);
    providerFetch.mockImplementation(async () => new Response(JSON.stringify({ data: [{ id: "discovered-model" }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it.each([
    { name: "reuses saved auth at the same endpoint", aiBaseUrl: "https://saved.example/v1", submitted: {}, savedKey: "saved-secret", expected: "Bearer saved-secret" },
    { name: "preserves saved auth for an equivalent trailing slash", aiBaseUrl: "https://saved.example/v1/", submitted: {}, savedKey: "saved-secret", expected: "Bearer saved-secret" },
    { name: "never forwards saved auth to a new endpoint", aiBaseUrl: "https://other.example/v1", submitted: {}, savedKey: "saved-secret", expected: null },
    { name: "discovers with an unsaved replacement at a new endpoint", aiBaseUrl: "https://other.example/v1", submitted: { aiApiKey: " replacement-secret " }, savedKey: "saved-secret", expected: "Bearer replacement-secret" },
    { name: "replaces saved auth at the same endpoint", aiBaseUrl: "https://saved.example/v1", submitted: { aiApiKey: "replacement-secret" }, savedKey: "saved-secret", expected: "Bearer replacement-secret" },
    { name: "explicit null disables saved and environment auth", aiBaseUrl: "https://saved.example/v1", submitted: { aiApiKey: null }, savedKey: "saved-secret", expected: null },
    { name: "explicit null disables legacy environment fallback", aiBaseUrl: "https://saved.example/v1", submitted: { aiApiKey: null }, savedKey: undefined, expected: null },
    { name: "empty input explicitly removes auth", aiBaseUrl: "https://saved.example/v1", submitted: { aiApiKey: "  " }, savedKey: "saved-secret", expected: null },
    { name: "never forwards environment fallback to a new endpoint", aiBaseUrl: "https://other.example/v1", submitted: {}, savedKey: undefined, expected: null },
    { name: "preserves environment fallback at the same endpoint", aiBaseUrl: "https://saved.example/v1/", submitted: {}, savedKey: undefined, expected: "Bearer environment-secret" },
  ])("$name", async ({ aiBaseUrl, submitted, savedKey, expected }) => {
    repositoryMocks.getSettings.mockResolvedValue({ ...savedSettings, aiApiKey: savedKey });
    const app = createApp();
    try {
      const response = await app.inject({ method: "POST", url: "/api/settings/test-ai", payload: { aiBaseUrl, ...submitted } });
      expect(response.statusCode).toBe(200);
      expect(providerFetch).toHaveBeenCalledTimes(1);
      const [endpoint, init] = providerFetch.mock.calls[0]!;
      expect(endpoint).toBe(`${aiBaseUrl.replace(/\/$/, "")}/models`);
      expect(new Headers(init?.headers).get("authorization")).toBe(expected);
      expect(response.json().data).toEqual({ models: [{ id: "discovered-model" }], authConfigured: expected !== null });
      for (const secret of ["saved-secret", "replacement-secret", "environment-secret"]) {
        expect(response.body).not.toContain(secret);
      }
      expect(repositoryMocks.updateSettings).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  describe.each([
    "https://saved.example/v1?legacy=1",
    "https://saved.example/v1#legacy",
    "https://user:legacy-secret@saved.example/v1",
  ])("legacy saved endpoint %s", (legacyEndpoint) => {
    it.each([
      { name: "omitted key never forwards saved credentials", submitted: {}, savedKey: "saved-secret", expected: null },
      { name: "omitted key never forwards environment credentials", submitted: {}, savedKey: undefined, expected: null },
      { name: "explicit replacement uses only the new credentials", submitted: { aiApiKey: "replacement-secret" }, savedKey: "saved-secret", expected: "Bearer replacement-secret" },
      { name: "explicit null disables credentials", submitted: { aiApiKey: null }, savedKey: "saved-secret", expected: null },
    ])("$name when probing its clean replacement", async ({ submitted, savedKey, expected }) => {
      repositoryMocks.getSettings.mockResolvedValue({ ...savedSettings, aiBaseUrl: legacyEndpoint, aiApiKey: savedKey });
      const app = createApp();
      try {
        const response = await app.inject({
          method: "POST",
          url: "/api/settings/test-ai",
          payload: { aiBaseUrl: "https://saved.example/v1", ...submitted },
        });
        expect(response.statusCode).toBe(200);
        expect(providerFetch).toHaveBeenCalledTimes(1);
        const [endpoint, init] = providerFetch.mock.calls[0]!;
        expect(endpoint).toBe("https://saved.example/v1/models");
        expect(new Headers(init?.headers).get("authorization")).toBe(expected);
        expect(response.json().data.authConfigured).toBe(expected !== null);
        expect(response.body).not.toContain("saved-secret");
        expect(response.body).not.toContain("environment-secret");
        expect(repositoryMocks.updateSettings).not.toHaveBeenCalled();
      } finally {
        await app.close();
      }
    });
  });

  it.each([
    { method: "POST" as const, url: "/api/settings/test-ai" },
    { method: "PATCH" as const, url: "/api/settings" },
  ])("rejects invalid $method settings input without exposing Zod input keys", async ({ method, url }) => {
    const app = createApp();
    try {
      const response = await app.inject({ method, url, payload: {
        aiBaseUrl: "https://saved.example/v1",
        aiApiKey: { "submitted-secret": "submitted-secret" },
      } });
      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("BAD_REQUEST");
      expect(response.body).not.toContain("submitted-secret");
      expect(providerFetch).not.toHaveBeenCalled();
      expect(repositoryMocks.updateSettings).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it.each([
    {
      name: "Drizzle query params",
      error: new DrizzleQueryError(
        'update "settings" set "ai_api_key" = $1, "default_weekly_meal_count" = $2',
        ["replacement-secret", 2147483648],
        new Error("integer out of range"),
      ),
    },
    { name: "unexpected persistence error", error: new Error("Query failed with replacement-secret and saved-secret") },
    {
      name: "AppError with unsafe details",
      error: new AppError("CONFLICT", "Query failed with replacement-secret", 409, { params: ["saved-secret"] }),
    },
  ])("hides $name when saving settings fails", async ({ error }) => {
    repositoryMocks.updateSettings.mockRejectedValueOnce(error);
    const app = createApp();
    try {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/settings",
        payload: { aiApiKey: "replacement-secret", defaultWeeklyMealCount: 2147483648 },
      });
      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({
        ok: false,
        error: { code: "INTERNAL_ERROR", message: "Could not save settings." },
      });
      expect(response.json().error).not.toHaveProperty("details");
      for (const sensitive of ["replacement-secret", "saved-secret", "update", "settings\"", "params", "Query failed", "integer out of range"]) {
        expect(response.body).not.toContain(sensitive);
      }
      expect(repositoryMocks.updateSettings).toHaveBeenCalledWith({
        aiApiKey: "replacement-secret",
        defaultWeeklyMealCount: 2147483648,
      });
    } finally {
      await app.close();
    }
  });

  it("returns repository-projected public settings on reads and updates", async () => {
    const publicResult = { settings: toPublicSettings(savedSettings), pantryStaples: [] };
    repositoryMocks.getSettingsWithPantry.mockResolvedValue(publicResult);
    repositoryMocks.updateSettings.mockResolvedValue(publicResult);
    const app = createApp();
    try {
      const read = await app.inject({ method: "GET", url: "/api/settings" });
      const update = await app.inject({ method: "PATCH", url: "/api/settings", payload: { aiApiKey: "replacement-secret", aiModel: "arbitrary-model" } });
      for (const response of [read, update]) {
        expect(response.statusCode).toBe(200);
        expect(response.json().data.settings.aiAuthConfigured).toBe(true);
        expect(response.json().data.settings).not.toHaveProperty("aiApiKey");
        expect(response.body).not.toContain("saved-secret");
        expect(response.body).not.toContain("replacement-secret");
      }
      expect(repositoryMocks.updateSettings).toHaveBeenCalledWith({ aiApiKey: "replacement-secret", aiModel: "arbitrary-model" });
    } finally {
      await app.close();
    }
  });
});
