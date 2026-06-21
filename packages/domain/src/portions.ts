import { z } from "zod";

export const servingCountSchema = z.coerce.number().int().min(1).max(12);

export function validateServingCount(value: unknown) {
  return servingCountSchema.parse(value);
}

export function scaleServings(quantityText: string, slotServings: number, defaultServings: number) {
  if (slotServings === defaultServings) {
    return quantityText;
  }

  const factor = slotServings / defaultServings;
  return `${quantityText} (x${Number.isInteger(factor) ? factor : factor.toFixed(2)})`;
}
