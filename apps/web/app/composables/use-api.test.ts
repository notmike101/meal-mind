import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./use-api";

afterEach(() => vi.unstubAllGlobals());

describe("apiRequest", () => {
  it("unwraps successful API envelopes", async () => {
    vi.stubGlobal("$fetch", vi.fn().mockResolvedValue({ ok: true, data: { value: 42 } }));
    await expect(apiRequest<{ value: number }>("/api/example")).resolves.toEqual({ value: 42 });
  });

  it("preserves application error messages from failed requests", async () => {
    vi.stubGlobal("$fetch", vi.fn().mockRejectedValue({ data: { error: { message: "Recipe not found." } } }));
    await expect(apiRequest("/api/recipes/missing")).rejects.toThrow("Recipe not found.");
  });
});
