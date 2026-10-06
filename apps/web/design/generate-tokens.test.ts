import { expect, test } from "vitest";
import components from "./components.json";
import tokens from "./tokens.json";
import { renderDesignTokens } from "./generate-tokens";

test("rejects unsafe token data and inconsistent design metadata", () => {
  const invalidColor = structuredClone(tokens);
  invalidColor.themes.light.color.canvas.$value = "#123456; color: red";

  const unsafeName = structuredClone(tokens);
  Object.assign(unsafeName.shared.spacing, { "unsafe;name": unsafeName.shared.spacing["1"] });

  const mismatchedThemes = structuredClone(tokens);
  Reflect.deleteProperty(mismatchedThemes.themes.dark.color, "canvas");

  const unknownReference = structuredClone(components);
  unknownReference.components["button-primary"].tokens.push("color.nonexistent");

  for (const [input, metadata] of [
    [invalidColor, components],
    [unsafeName, components],
    [mismatchedThemes, components],
    [tokens, unknownReference],
  ] as const) {
    expect(() => renderDesignTokens(input, metadata)).toThrow(Error);
  }
});
