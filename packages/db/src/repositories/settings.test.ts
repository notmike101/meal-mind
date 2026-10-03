import { afterEach, describe, expect, it, vi } from "vitest";
import type { SettingsDto } from "@mealmind/contracts";
import { toPublicSettings } from "./settings";

const settings: SettingsDto = {
  id: 1,
  timezone: "UTC",
  aiBaseUrl: "https://provider.example/v1",
  aiModel: "model-a",
  planningPreferences: "",
  planningVarietyRules: "",
  defaultMealServings: 2,
  defaultWeeklyMealCount: 7,
  autoGenerateNextWeek: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("toPublicSettings", () => {
  it.each([
    { name: "absent environment fallback", envKey: undefined, aiApiKey: undefined, configured: false },
    { name: "blank environment fallback", envKey: " \t ", aiApiKey: undefined, configured: false },
    { name: "configured environment fallback", envKey: "  env-secret  ", aiApiKey: undefined, configured: true },
    { name: "saved key without environment fallback", envKey: undefined, aiApiKey: "saved-secret", configured: true },
    { name: "saved key overriding environment fallback", envKey: "env-secret", aiApiKey: "saved-secret", configured: true },
    { name: "explicitly disabled environment fallback", envKey: "env-secret", aiApiKey: null, configured: false },
  ])("reports $name without exposing credentials", ({ envKey, aiApiKey, configured }) => {
    vi.stubEnv("OPENAI_COMPATIBLE_API_KEY", envKey);

    const result = toPublicSettings({ ...settings, aiApiKey });

    expect(result.aiAuthConfigured).toBe(configured);
    expect(result).not.toHaveProperty("aiApiKey");
    expect(JSON.stringify(result)).not.toContain("saved-secret");
    expect(JSON.stringify(result)).not.toContain("env-secret");
  });
});
