export const GUID_PATTERN = /\{?([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\}?/;

export function isGuidLike(value: string | null | undefined): boolean {
  return typeof value === "string" && /^\{?[0-9a-fA-F-]{36}\}?$/.test(value.trim());
}

export function stripGuidBraces(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/[{}]/g, "");
}

export function extractGuid(value: string | null | undefined): string | null {
  if (!value) return null;

  const match = value.match(GUID_PATTERN);
  return match ? stripGuidBraces(match[1]) : null;
}

export function formatFoId(itemId: string): string {
  const compact = stripGuidBraces(itemId).replace(/-/g, "");
  if (!/^[0-9a-f]{32}$/i.test(compact)) return itemId;

  return `{${compact.substring(0, 8)}-${compact.substring(8, 12)}-${compact.substring(12, 16)}-${compact.substring(16, 20)}-${compact.substring(20)}}`;
}

// Drop Link's option list is always populated with the candidate items' GUIDs; Droplist's is
// always populated with plain name text - this tells the two field types apart when Content
// Editor doesn't render an aria-label naming the field type on the select itself.
export function hasAnyGuidLikeOption(select: HTMLSelectElement): boolean {
  return Array.from(select.options).some((option) => isGuidLike(option.value));
}