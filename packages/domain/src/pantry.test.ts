import { describe, expect, it } from "vitest";
import { isPantryStaple, normalizePantryName } from "./pantry";

describe("pantry utilities", () => {
  it("normalizes names consistently", () => {
    expect(normalizePantryName(" Olive-Oil! ")).toBe("olive oil");
  });

  it("matches staple names inside ingredient lines", () => {
    expect(isPantryStaple("1 tbsp olive oil", ["olive oil"])).toBe(true);
    expect(isPantryStaple("1 lb chicken breast", ["olive oil"])).toBe(false);
  });
});
