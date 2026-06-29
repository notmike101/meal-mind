export function parsePantryStaples(value: string) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}
