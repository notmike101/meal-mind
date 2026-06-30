// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { runJsonPrompt, testAiConnectivity } from "./client";

const settings = {
  aiBaseUrl: "https://provider.example/v1",
  aiModel: "model-b",
};

afterEach(() => {
  delete process.env.OPENAI_COMPATIBLE_API_KEY;
  vi.unstubAllGlobals();
});

describe("testAiConnectivity", () => {
  it("normalizes and sorts an unauthenticated model catalog", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{ id: "model-b" }, { id: "model-a" }, { id: "model-b" }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await testAiConnectivity(settings, vi.fn());

    expect(result).toEqual({
      models: [{ id: "model-a" }, { id: "model-b" }],
      authConfigured: false,
    });
    expect(fetchMock).toHaveBeenCalledWith("https://provider.example/v1/models", expect.objectContaining({
      headers: {},
    }));
  });

  it("uses the configured bearer token without returning it", async () => {
    process.env.OPENAI_COMPATIBLE_API_KEY = "secret-token";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ id: "model-a" }] }), {
      status: 200,
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await testAiConnectivity(settings, vi.fn());

    expect(fetchMock).toHaveBeenCalledWith("https://provider.example/v1/models", expect.objectContaining({
      headers: { Authorization: "Bearer secret-token" },
    }));
    expect(JSON.stringify(result)).not.toContain("secret-token");
    expect(result.authConfigured).toBe(true);
  });

  it("rejects invalid provider model responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ models: [] }), { status: 200 })));
    await expect(testAiConnectivity(settings, vi.fn())).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
  });
});

describe("runJsonPrompt", () => {
  it("uses the configured token and selected model for chat completions", async () => {
    process.env.OPENAI_COMPATIBLE_API_KEY = "secret-token";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "completion-1",
      object: "chat.completion",
      created: 1,
      model: "model-b",
      choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: '{"value":"ok"}' } }],
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runJsonPrompt({
      eventType: "plan_generate",
      settings: settings as never,
      system: "Return JSON.",
      user: "Respond.",
      schema: z.object({ value: z.string() }),
      logEvent: vi.fn(),
    });

    expect(result).toEqual({ value: "ok" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://provider.example/v1/chat/completions");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer secret-token");
    expect(JSON.parse(String(init.body))).toMatchObject({ model: "model-b" });
  });
});
