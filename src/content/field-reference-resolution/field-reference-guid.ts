// @source-path [fobles] src/content/field-reference-resolution/field-reference-guid.ts

import { GUID_PATTERN } from "../features/augmentor/shared/guid.ts";

// Generic GUID fallback for fields no known strategy claims: every distinct GUID found anywhere
// in the raw value, first-occurrence order, deduplicated case-insensitively. Reuses the one
// canonical GUID_PATTERN (augmentor/shared/guid.ts) instead of redefining the regex here.
export function extractAllGuids(value: string): string[] {
  const pattern = new RegExp(GUID_PATTERN.source, "g");
  const seen = new Set<string>();
  const guids: string[] = [];

  for (const match of value.matchAll(pattern)) {
    const guid = match[1];
    const dedupeKey = guid?.toLowerCase();

    if (guid && dedupeKey && !seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      guids.push(guid);
    }
  }

  return guids;
}
