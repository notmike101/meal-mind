import OpenAI from "openai";
import { z } from "zod";
import { AppError, type AiConnectionSettings, type AiModelsDto } from "@mealmind/contracts";

export type AiEventType = "plan_generate" | "slot_swap" | "shopping_list" | "connectivity_test";

export type AiEventLogInput = {
  eventType: AiEventType;
  model: string;
  baseUrl: string;
  requestJson: string;
  responseJson: string | null;
  status: "success" | "validation_failed" | "request_failed";
  errorMessage: string | null;
};

type AiEventLogger = (event: AiEventLogInput) => Promise<unknown> | unknown;

function effectiveApiKey(settings: AiConnectionSettings) {
  return (settings.aiApiKey === undefined ? process.env.OPENAI_COMPATIBLE_API_KEY : settings.aiApiKey)?.trim() || null;
}

function getOpenAI(settings: AiConnectionSettings) {
  const apiKey = effectiveApiKey(settings);
  return new OpenAI({
    apiKey: apiKey || "not-required",
    defaultHeaders: apiKey ? undefined : { Authorization: null },
    baseURL: settings.aiBaseUrl,
    fetch: globalThis.fetch,
  });
}

function redactSecrets(value: string, settings: AiConnectionSettings) {
  const secrets = [settings.aiApiKey?.trim(), process.env.OPENAI_COMPATIBLE_API_KEY?.trim()]
    .filter((secret): secret is string => Boolean(secret))
    .flatMap((secret) => [secret, JSON.stringify(secret).slice(1, -1)])
    .sort((left, right) => right.length - left.length);
  for (const secret of secrets) {
    value = value.split(secret).join("[REDACTED]");
  }
  return value;
}

function redactJson(value: unknown, settings: AiConnectionSettings): unknown {
  if (typeof value === "string") {
    return redactSecrets(value, settings);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactJson(item, settings));
  }
  if (value !== null && typeof value === "object") {
    const redacted: Record<string, unknown> = Object.create(null);
    for (const key of Object.keys(value)) {
      redacted[redactSecrets(key, settings)] = redactJson((value as Record<string, unknown>)[key], settings);
    }
    return redacted;
  }
  return value;
}

function logAiEvent(logEvent: AiEventLogger, event: AiEventLogInput, settings: AiConnectionSettings) {
  return logEvent({
    ...event,
    model: redactSecrets(event.model, settings),
    baseUrl: redactSecrets(event.baseUrl, settings),
    requestJson: JSON.stringify(redactJson(JSON.parse(event.requestJson), settings)),
    responseJson: event.responseJson === null ? null : JSON.stringify(redactJson(JSON.parse(event.responseJson), settings)),
    errorMessage: event.errorMessage === null ? null : redactSecrets(event.errorMessage, settings),
  });
}

function normalizeModels(payload: unknown, authConfigured: boolean): AiModelsDto {
  const data = payload && typeof payload === "object" && "data" in payload
    ? (payload as { data?: unknown }).data
    : undefined;
  if (!Array.isArray(data)) {
    throw new Error("Provider returned an invalid model catalog.");
  }

  const ids = data
    .map((model) => model && typeof model === "object" && "id" in model ? String(model.id).trim() : "")
    .filter(Boolean);

  return {
    models: [...new Set(ids)].sort((left, right) => left.localeCompare(right)).map((id) => ({ id })),
    authConfigured,
  };
}

function messageContentToString(content: unknown) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text: unknown }).text);
        }
        return "";
      })
      .join("");
  }

  return "";
}

function finalMessageContent(content: unknown) {
  return messageContentToString(content)
    .replace(/<think(?:ing)?\b[^>]*>[\s\S]*?(?:<\/think(?:ing)?>|$)/gi, "")
    .trim();
}

function parseJsonObject(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("AI response did not contain a JSON object.");
    }
    return JSON.parse(match[0]);
  }
}

export async function runJsonPrompt<T>(input: {
  eventType: AiEventType;
  settings: AiConnectionSettings;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  logEvent: AiEventLogger;
}) {
  const requestJson = JSON.stringify({
    system: input.system,
    user: input.user,
    model: input.settings.aiModel,
  });

  try {
    const client = getOpenAI(input.settings);
    const completion = await client.chat.completions.create({
      model: input.settings.aiModel,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
    });

    // Reasoning-capable providers may expose chain-of-thought separately as
    // `reasoning_content`. Only the assistant's final `content` is allowed
    // into MealMind's structured-response parser.
    const content = finalMessageContent(completion.choices[0]?.message?.content);
    const parsed = parseJsonObject(content);
    const validation = input.schema.safeParse(parsed);

    if (!validation.success) {
      await logAiEvent(input.logEvent, {
        eventType: input.eventType,
        model: input.settings.aiModel,
        baseUrl: input.settings.aiBaseUrl,
        requestJson,
        responseJson: JSON.stringify(parsed),
        status: "validation_failed",
        errorMessage: validation.error.message,
      }, input.settings);
      throw new AppError("AI_VALIDATION_FAILED", "AI response did not match the expected schema.", 502, {
        issues: redactJson(validation.error.issues, input.settings),
      });
    }

    await logAiEvent(input.logEvent, {
      eventType: input.eventType,
      model: input.settings.aiModel,
      baseUrl: input.settings.aiBaseUrl,
      requestJson,
      responseJson: JSON.stringify(validation.data),
      status: "success",
      errorMessage: null,
    }, input.settings);

    return validation.data;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    await logAiEvent(input.logEvent, {
      eventType: input.eventType,
      model: input.settings.aiModel,
      baseUrl: input.settings.aiBaseUrl,
      requestJson,
      responseJson: null,
      status: "request_failed",
      errorMessage: error instanceof Error ? error.message : String(error),
    }, input.settings);

    throw new AppError(
      "AI_UNAVAILABLE",
      `Cannot reach AI endpoint at ${redactSecrets(input.settings.aiBaseUrl, input.settings)}.`,
      502,
      redactSecrets(error instanceof Error ? error.message : String(error), input.settings),
    );
  }
}

export async function testAiConnectivity(settings: AiConnectionSettings, logEvent: AiEventLogger) {
  const endpoint = `${settings.aiBaseUrl.replace(/\/$/, "")}/models`;
  const requestJson = JSON.stringify({ endpoint });
  const apiKey = effectiveApiKey(settings);

  try {
    const response = await fetch(endpoint, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`Endpoint returned HTTP ${response.status}.`);
    }
    const models = normalizeModels(await response.json(), Boolean(apiKey));
    await logAiEvent(logEvent, {
      eventType: "connectivity_test",
      model: settings.aiModel,
      baseUrl: settings.aiBaseUrl,
      requestJson,
      responseJson: JSON.stringify(models),
      status: "success",
      errorMessage: null,
    }, settings);
    return models;
  } catch (error) {
    await logAiEvent(logEvent, {
      eventType: "connectivity_test",
      model: settings.aiModel,
      baseUrl: settings.aiBaseUrl,
      requestJson,
      responseJson: null,
      status: "request_failed",
      errorMessage: error instanceof Error ? error.message : String(error),
    }, settings);
    throw new AppError("AI_UNAVAILABLE", `Cannot reach AI endpoint at ${redactSecrets(endpoint, settings)}.`, 502);
  }
}
