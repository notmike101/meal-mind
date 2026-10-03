// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { runJsonPrompt, testAiConnectivity } from "./client";

const settings = {
  aiBaseUrl: "https://provider.example/v1",
  aiModel: "model-b",
};

function completionResponse(message: Record<string, unknown>) {
  return new Response(JSON.stringify({
    id: "completion-test",
    object: "chat.completion",
    created: 1,
    model: "model-b",
    choices: [{ index: 0, finish_reason: "stop", message }],
  }), { status: 200, headers: { "content-type": "application/json" } });
}

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

  it.each([
    { aiApiKey: "local-token", envKey: "env-token", authorization: "Bearer local-token", authConfigured: true },
    { aiApiKey: "local-token", envKey: undefined, authorization: "Bearer local-token", authConfigured: true },
    { aiApiKey: null, envKey: "env-token", authorization: null, authConfigured: false },
  ])("uses explicit key $aiApiKey instead of environment key $envKey for model discovery", async ({
    aiApiKey, envKey, authorization, authConfigured,
  }) => {
    if (envKey === undefined) {
      delete process.env.OPENAI_COMPATIBLE_API_KEY;
    } else {
      process.env.OPENAI_COMPATIBLE_API_KEY = envKey;
    }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ id: "model-a" }] }), {
      status: 200,
    }));
    const logEvent = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const providerSettings = { ...settings, aiApiKey };

    const result = await testAiConnectivity(providerSettings, logEvent);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get("authorization")).toBe(authorization);
    expect(result).toEqual({ models: [{ id: "model-a" }], authConfigured });
    expect(JSON.stringify(result)).not.toContain("local-token");
    expect(JSON.stringify(result)).not.toContain("env-token");
    expect(JSON.stringify(logEvent.mock.calls)).not.toContain("local-token");
    expect(JSON.stringify(logEvent.mock.calls)).not.toContain("env-token");
  });

  it("redacts configured and environment credentials from discovery error logs", async () => {
    process.env.OPENAI_COMPATIBLE_API_KEY = "env-token";
    const logEvent = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Rejected local-token and env-token")));

    const error = await testAiConnectivity({ ...settings, aiApiKey: "local-token" }, logEvent).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "AI_UNAVAILABLE" });
    for (const secret of ["local-token", "env-token"]) {
      expect(JSON.stringify(error)).not.toContain(secret);
      expect(JSON.stringify(logEvent.mock.calls)).not.toContain(secret);
    }
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

  it.each([
    { aiApiKey: "local-token", envKey: "env-token", authorization: "Bearer local-token" },
    { aiApiKey: "local-token", envKey: undefined, authorization: "Bearer local-token" },
    { aiApiKey: null, envKey: "env-token", authorization: null },
    { aiApiKey: undefined, envKey: undefined, authorization: null },
  ])("uses key $aiApiKey with environment key $envKey for generation", async ({
    aiApiKey, envKey, authorization,
  }) => {
    if (envKey === undefined) {
      delete process.env.OPENAI_COMPATIBLE_API_KEY;
    } else {
      process.env.OPENAI_COMPATIBLE_API_KEY = envKey;
    }
    const fetchMock = vi.fn().mockResolvedValue(completionResponse({
      role: "assistant",
      content: '{"value":"ok"}',
    }));
    const logEvent = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await runJsonPrompt({
      eventType: "plan_generate",
      settings: { ...settings, aiApiKey } as never,
      system: "Return JSON.",
      user: "Respond.",
      schema: z.object({ value: z.string() }),
      logEvent,
    });

    expect(result).toEqual({ value: "ok" });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get("authorization")).toBe(authorization);
    expect(JSON.stringify(logEvent.mock.calls)).not.toContain("local-token");
    expect(JSON.stringify(logEvent.mock.calls)).not.toContain("env-token");
  });

  it("redacts credentials from schema validation details and logs", async () => {
    const logEvent = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(completionResponse({
      role: "assistant",
      content: '{"value":"invalid"}',
    })));

    const error = await runJsonPrompt({
      eventType: "plan_generate",
      settings: { ...settings, aiApiKey: "local-token" },
      system: "Return JSON.",
      user: "Respond.",
      schema: z.object({ value: z.literal("local-token") }),
      logEvent,
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "AI_VALIDATION_FAILED" });
    expect(JSON.stringify(error)).not.toContain("local-token");
    expect(JSON.stringify(logEvent.mock.calls)).not.toContain("local-token");
  });

  it("redacts nested JSON property names and validation paths including quotes and escapes", async () => {
    const aiApiKey = 'local-"token\\key';
    const echoKey = `echo-${aiApiKey}`;
    process.env.OPENAI_COMPATIBLE_API_KEY = "env-token";
    const logEvent = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(completionResponse({
      role: "assistant",
      content: JSON.stringify({
        entries: [{ [echoKey]: `${aiApiKey} env-token`, "env-token": false }],
      }),
    })));

    const error = await runJsonPrompt({
      eventType: "plan_generate",
      settings: { ...settings, aiApiKey },
      system: `Return JSON for ${aiApiKey}.`,
      user: "Respond for env-token.",
      schema: z.object({
        entries: z.array(z.object({
          [echoKey]: z.literal("expected"),
          "env-token": z.string(),
        })),
      }),
      logEvent,
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      code: "AI_VALIDATION_FAILED",
      details: {
        issues: [
          expect.objectContaining({ path: ["entries", 0, "echo-[REDACTED]"] }),
          expect.objectContaining({ path: ["entries", 0, "[REDACTED]"] }),
        ],
      },
    });
    expect(logEvent).toHaveBeenCalledTimes(1);
    const event = logEvent.mock.calls[0][0];
    expect(event.status).toBe("validation_failed");
    expect(JSON.parse(event.requestJson)).toEqual({
      system: "Return JSON for [REDACTED].",
      user: "Respond for [REDACTED].",
      model: settings.aiModel,
    });
    expect(JSON.parse(event.responseJson)).toEqual({
      entries: [{ "echo-[REDACTED]": "[REDACTED] [REDACTED]", "[REDACTED]": false }],
    });
    expect(error).toMatchObject({ details: { issues: JSON.parse(event.errorMessage) } });
    for (const secret of [aiApiKey, JSON.stringify(aiApiKey).slice(1, -1), "env-token"]) {
      expect(JSON.stringify(error)).not.toContain(secret);
      expect(JSON.stringify(logEvent.mock.calls)).not.toContain(secret);
    }
  });

  it("redacts configured and environment credentials echoed in provider errors", async () => {
    process.env.OPENAI_COMPATIBLE_API_KEY = "env-token";
    const logEvent = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { message: "Rejected local-token and env-token", type: "authentication_error" },
    }), { status: 401, headers: { "content-type": "application/json" } })));

    const error = await runJsonPrompt({
      eventType: "plan_generate",
      settings: { ...settings, aiApiKey: "local-token" },
      system: "Return JSON.",
      user: "Respond.",
      schema: z.object({ value: z.string() }),
      logEvent,
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "AI_UNAVAILABLE" });
    for (const secret of ["local-token", "env-token"]) {
      expect(JSON.stringify(error)).not.toContain(secret);
      expect(JSON.stringify(logEvent.mock.calls)).not.toContain(secret);
    }
  });

  it("redacts credentials echoed in logged JSON including escaped characters", async () => {
    process.env.OPENAI_COMPATIBLE_API_KEY = "env-token";
    const logEvent = vi.fn();
    const aiApiKey = 'local-"token';
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(completionResponse({
      role: "assistant",
      content: JSON.stringify({ value: `${aiApiKey} env-token` }),
    })));

    await runJsonPrompt({
      eventType: "plan_generate",
      settings: { ...settings, aiApiKey },
      system: "Return JSON.",
      user: "Respond.",
      schema: z.object({ value: z.string() }),
      logEvent,
    });

    const event = logEvent.mock.calls[0]?.[0];
    expect(event.status).toBe("success");
    expect(JSON.parse(event.responseJson).value).toBe("[REDACTED] [REDACTED]");
  });

  it("works with a strict compatible provider accepting only model and standard chat messages", async () => {
    const requestSchema = z.object({
      model: z.literal("model-b"),
      messages: z.tuple([
        z.object({ role: z.literal("system"), content: z.literal("Return JSON.") }).strict(),
        z.object({ role: z.literal("user"), content: z.literal("Respond.") }).strict(),
      ]),
    }).strict();
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      const request = requestSchema.safeParse(JSON.parse(String(init.body)));
      if (!request.success) {
        return Promise.resolve(new Response(JSON.stringify({
          error: { message: "Unsupported chat completion request.", type: "invalid_request_error" },
        }), { status: 400, headers: { "content-type": "application/json" } }));
      }
      return Promise.resolve(completionResponse({ role: "assistant", content: '{"value":"ok"}' }));
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(runJsonPrompt({
      eventType: "plan_generate",
      settings: settings as never,
      system: "Return JSON.",
      user: "Respond.",
      schema: z.object({ value: z.string() }),
      logEvent: vi.fn(),
    })).resolves.toEqual({ value: "ok" });
  });

  it("parses final content while ignoring separate reasoning content", async () => {
    const logEvent = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(completionResponse({
      role: "assistant",
      content: '{"value":"ok"}',
      reasoning_content: "Private chain of thought that must not escape.",
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runJsonPrompt({
      eventType: "plan_generate",
      settings: settings as never,
      system: "Return JSON.",
      user: "Respond.",
      schema: z.object({ value: z.string() }),
      logEvent,
    });

    expect(result).toEqual({ value: "ok" });
    expect(JSON.stringify(logEvent.mock.calls)).not.toContain("Private chain of thought");
  });

  it("strips inline thinking blocks before parsing final JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(completionResponse({
      role: "assistant",
      content: '<think>hidden reasoning</think>{"value":"ok"}',
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(runJsonPrompt({
      eventType: "plan_generate",
      settings: settings as never,
      system: "Return JSON.",
      user: "Respond.",
      schema: z.object({ value: z.string() }),
      logEvent: vi.fn(),
    })).resolves.toEqual({ value: "ok" });
  });

  it("rejects a response containing only inline reasoning", async () => {
    const fetchMock = vi.fn().mockResolvedValue(completionResponse({
      role: "assistant",
      content: "<thinking>hidden reasoning</thinking>",
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(runJsonPrompt({
      eventType: "plan_generate",
      settings: settings as never,
      system: "Return JSON.",
      user: "Respond.",
      schema: z.object({ value: z.string() }),
      logEvent: vi.fn(),
    })).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
  });

  it("supports structured content parts while filtering thinking parts from text", async () => {
    const fetchMock = vi.fn().mockResolvedValue(completionResponse({
      role: "assistant",
      content: [
        { type: "text", text: "<think>hidden</think>" },
        { type: "text", text: '{"value":"ok"}' },
      ],
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(runJsonPrompt({
      eventType: "plan_generate",
      settings: settings as never,
      system: "Return JSON.",
      user: "Respond.",
      schema: z.object({ value: z.string() }),
      logEvent: vi.fn(),
    })).resolves.toEqual({ value: "ok" });
  });
});
