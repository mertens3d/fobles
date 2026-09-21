import { REFERRED_TO_ITEM, REFERRING_ITEMS, TARGET_ITEM } from "./editor-yml-refs";

// The last path segment is an item's own name - mechanical string parsing of an already-raw
// Path, not inference (same helper strategy-scenarios.ts uses).
function leafName(path: string): string {
  return path.split("/").pop() ?? path;
}

function toBracedGuid(id: string): string {
  return `{${id.toUpperCase()}}`;
}

// Content Editor's "Links" gallery (src/content/features/augmentor/editor-strategies
// /reference-links.ts) renders each field-based reference exactly this way - "ItemName -
// [ItemPath] - The reference from 'FieldHint' field. Language: en, Version: 1".
function referringItemLabel(itemPath: string, fieldHint: string): string {
  return `${leafName(itemPath)} - [${itemPath}] - The reference from '${fieldHint}' field. Language: en, Version: 1`;
}

// The "refers to" side has no field/language/version - it's surfaced via Quick Info instead:
// "ItemName - [ItemPath] - The reference from 'Quick Info' section."
function referredToItemLabel(itemPath: string): string {
  return `${leafName(itemPath)} - [${itemPath}] - The reference from 'Quick Info' section.`;
}

export const EDITOR_SCENARIOS = {
  REFERENCE_LINKS: {
    itemId: TARGET_ITEM.id,
    itemPath: TARGET_ITEM.path,
    referringItems: REFERRING_ITEMS.map((item) => ({
      expectedFoValue: toBracedGuid(item.itemId),
      expectedButtonText: referringItemLabel(item.itemPath, item.fieldHint),
    })),
    referredToItem: {
      expectedFoValue: toBracedGuid(REFERRED_TO_ITEM.itemId),
      expectedButtonText: referredToItemLabel(REFERRED_TO_ITEM.itemPath),
    },
  },
  QUICK_INFO_SECTION: {
    itemId: TARGET_ITEM.id,
    itemIdButton: {
      expectedFoValue: toBracedGuid(TARGET_ITEM.id),
      expectedButtonText: toBracedGuid(TARGET_ITEM.id),
    },
    itemPathButton: {
      expectedFoValue: TARGET_ITEM.path,
      expectedButtonText: TARGET_ITEM.path,
    },
    templatePathButton: {
      expectedFoValue: REFERRED_TO_ITEM.itemPath,
      expectedButtonText: REFERRED_TO_ITEM.itemPath,
    },
    templateIdButton: {
      expectedFoValue: toBracedGuid(REFERRED_TO_ITEM.itemId),
      expectedButtonText: toBracedGuid(REFERRED_TO_ITEM.itemId),
    },
  },
} as const;
