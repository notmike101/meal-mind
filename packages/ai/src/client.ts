import OpenAI from "openai";
import { z } from "zod";
import { AppError, type SettingsDto as Settings } from "@helloqwen/contracts";

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

function getOpenAI(settings: Pick<Settings, "aiBaseUrl">) {
  return new OpenAI({
    apiKey: "lm-studio",
    baseURL: settings.aiBaseUrl,
  });
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
  settings: Settings;
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
      temperature: 0.2,
      response_format: { type: "text" },
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
    });

    const content = messageContentToString(completion.choices[0]?.message?.content);
    const parsed = parseJsonObject(content);
    const validation = input.schema.safeParse(parsed);

    if (!validation.success) {
      await input.logEvent({
        eventType: input.eventType,
        model: input.settings.aiModel,
        baseUrl: input.settings.aiBaseUrl,
        requestJson,
        responseJson: JSON.stringify(parsed),
        status: "validation_failed",
        errorMessage: validation.error.message,
      });
      throw new AppError("AI_VALIDATION_FAILED", "AI response did not match the expected schema.", 502, {
        issues: validation.error.issues,
      });
    }

    await input.logEvent({
      eventType: input.eventType,
      model: input.settings.aiModel,
      baseUrl: input.settings.aiBaseUrl,
      requestJson,
      responseJson: JSON.stringify(validation.data),
      status: "success",
      errorMessage: null,
    });

    return validation.data;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    await input.logEvent({
      eventType: input.eventType,
      model: input.settings.aiModel,
      baseUrl: input.settings.aiBaseUrl,
      requestJson,
      responseJson: null,
      status: "request_failed",
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    throw new AppError(
      "AI_UNAVAILABLE",
      `Cannot reach local AI endpoint at ${input.settings.aiBaseUrl}.`,
      502,
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function testAiConnectivity(settings: Settings, logEvent: AiEventLogger) {
  const endpoint = `${settings.aiBaseUrl.replace(/\/$/, "")}/models`;
  const requestJson = JSON.stringify({ endpoint });

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Endpoint returned HTTP ${response.status}.`);
    }
    const models = await response.json();
    await logEvent({
      eventType: "connectivity_test",
      model: settings.aiModel,
      baseUrl: settings.aiBaseUrl,
      requestJson,
      responseJson: JSON.stringify(models),
      status: "success",
      errorMessage: null,
    });
    return models;
  } catch (error) {
    await logEvent({
      eventType: "connectivity_test",
      model: settings.aiModel,
      baseUrl: settings.aiBaseUrl,
      requestJson,
      responseJson: null,
      status: "request_failed",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw new AppError("AI_UNAVAILABLE", `Cannot reach local AI endpoint at ${endpoint}.`, 502);
  }
}
