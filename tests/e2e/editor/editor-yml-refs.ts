import { FOBLES_YML } from "../strategies/fobles-yml";

// Fobles Data Item A (tests/e2e/strategies/fobles-yml.ts) is the shared target most field
// strategies point their scenario field at - that's exactly what makes it a useful subject for
// Content Editor's own "Links" gallery (Navigate ribbon tab), which lists every item referencing
// it plus every item it refers to in turn. Every value here still traces back to exactly one
// FOBLES_YML entry, the same raw-fact rule strategy-yml-refs.ts follows.
export const TARGET_ITEM = FOBLES_YML.CONTENT.FOBLES_DATA_ITEM_A;

// "Items that refer to the selected item:" - one entry per field strategy scenario whose field
// value points at Fobles Data Item A.
export const REFERRING_ITEMS = [
  {
    itemId: FOBLES_YML.CONTENT.STRATEGY_DROPLIST.id,
    itemPath: FOBLES_YML.CONTENT.STRATEGY_DROPLIST.path,
    fieldHint: FOBLES_YML.CONTENT.STRATEGY_DROPLIST.fieldHint,
  },
  {
    itemId: FOBLES_YML.CONTENT.STRATEGY_DROPLINK.id,
    itemPath: FOBLES_YML.CONTENT.STRATEGY_DROPLINK.path,
    fieldHint: FOBLES_YML.CONTENT.STRATEGY_DROPLINK.fieldHint,
  },
  {
    itemId: FOBLES_YML.CONTENT.STRATEGY_DROPTREE.id,
    itemPath: FOBLES_YML.CONTENT.STRATEGY_DROPTREE.path,
    fieldHint: FOBLES_YML.CONTENT.STRATEGY_DROPTREE.fieldHint,
  },
  {
    itemId: FOBLES_YML.CONTENT.STRATEGY_MULTILIST.id,
    itemPath: FOBLES_YML.CONTENT.STRATEGY_MULTILIST.path,
    fieldHint: FOBLES_YML.CONTENT.STRATEGY_MULTILIST.fieldHint,
  },
  {
    itemId: FOBLES_YML.CONTENT.STRATEGY_TREELIST_EX.id,
    itemPath: FOBLES_YML.CONTENT.STRATEGY_TREELIST_EX.path,
    fieldHint: FOBLES_YML.CONTENT.STRATEGY_TREELIST_EX.fieldHint,
  },
  {
    itemId: FOBLES_YML.CONTENT.STRATEGY_TREE_LIST.id,
    itemPath: FOBLES_YML.CONTENT.STRATEGY_TREE_LIST.path,
    fieldHint: FOBLES_YML.CONTENT.STRATEGY_TREE_LIST.fieldHint,
  },
] as const;

// "Items that the selected item refer to:" - Fobles Data Item A's own template, surfaced via
// Content Editor's Quick Info section rather than a content field.
export const REFERRED_TO_ITEM = {
  itemId: FOBLES_YML.TEMPLATES.FOBLES_DATA_ITEM_TEMPLATE.id,
  itemPath: FOBLES_YML.TEMPLATES.FOBLES_DATA_ITEM_TEMPLATE.path,
} as const;
