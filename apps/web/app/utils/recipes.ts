import type { CooklangTokenDto, RecipeDto } from "@mealmind/contracts";

export type CooklangDisplayStep = {
  number: number;
  tokens: CooklangTokenDto[];
};

export function getCooklangSteps(recipe: RecipeDto): CooklangDisplayStep[] {
  return recipe.cooklang.sections.flatMap((section) =>
    section.content
      .filter((content) => content.type === "step")
      .map((content) => content.step),
  );
}

export function getInstructionSteps(instructions: string) {
  return instructions
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\d+\.\s+/, "").trim())
    .filter(Boolean);
}
