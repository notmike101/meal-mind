export function normalizePantryName(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isPantryStaple(ingredientName: string, pantryStaples: string[]) {
  const normalized = normalizePantryName(ingredientName);
  return pantryStaples.some((staple) => {
    const normalizedStaple = normalizePantryName(staple);
    return normalized === normalizedStaple || normalized.includes(normalizedStaple);
  });
}
