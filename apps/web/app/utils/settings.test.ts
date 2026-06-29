import { describe, expect, it } from "vitest";
import { parsePantryStaples } from "./settings";

describe("parsePantryStaples", () => {
  it("trims lines and removes blanks", () => {
    expect(parsePantryStaples(" salt \n\nolive oil\r\n pepper ")).toEqual(["salt", "olive oil", "pepper"]);
  });
});
