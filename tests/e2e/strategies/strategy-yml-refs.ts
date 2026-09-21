import { FOBLES_YML } from "./fobles-yml";

// Wrapping/uppercasing to the "{GUID}" form already used throughout these specs is mechanical
// formatting of an already-raw id, not inference.
function toBracedGuid(id: string): string {
  return `{${id.toUpperCase()}}`;
}

// Per-strategy view over FOBLES_YML's one-file-per-entry data: which scenario item/field to open,
// and which target item (id + path) that field points at. Every value here still traces back to
// exactly one FOBLES_YML entry - this just assembles the pair each strategy spec needs instead of
// each spec file reaching into FOBLES_YML.CONTENT directly.
export const STRATEGY_YML_REFS = {
  DROP_LINK: {
    scenarioItemId: FOBLES_YML.CONTENT.STRATEGY_DROPLINK.id,
    fieldLabel: FOBLES_YML.CONTENT.STRATEGY_DROPLINK.fieldHint,
    targetItemId: toBracedGuid(FOBLES_YML.CONTENT.FOBLES_DATA_ITEM_A.id),
    targetItemPath: FOBLES_YML.CONTENT.FOBLES_DATA_ITEM_A.path,
  },
  DROP_TREE: {
    scenarioItemId: FOBLES_YML.CONTENT.STRATEGY_DROPTREE.id,
    fieldLabel: FOBLES_YML.CONTENT.STRATEGY_DROPTREE.fieldHint,
    targetItemId: toBracedGuid(FOBLES_YML.CONTENT.FOBLES_DATA_ITEM_A.id),
    targetItemPath: FOBLES_YML.CONTENT.FOBLES_DATA_ITEM_A.path,
  },
  DROPLIST: {
    scenarioItemId: FOBLES_YML.CONTENT.STRATEGY_DROPLIST.id,
    fieldLabel: FOBLES_YML.CONTENT.STRATEGY_DROPLIST.fieldHint,
  },
  GENERAL_LINK: {
    scenarioItemId: FOBLES_YML.CONTENT.STRATEGY_GENERAL_LINK.id,
    fieldLabel: FOBLES_YML.CONTENT.STRATEGY_GENERAL_LINK.fieldHint,
    targetItemId: toBracedGuid(FOBLES_YML.CONTENT.FOBLES_TESTING_MODULE_ROOT.id),
    targetItemPath: FOBLES_YML.CONTENT.FOBLES_TESTING_MODULE_ROOT.path,
  },
  INTERNAL_LINK: {
    scenarioItemId: FOBLES_YML.CONTENT.STRATEGY_INTERNAL_LINK.id,
    fieldLabel: FOBLES_YML.CONTENT.STRATEGY_INTERNAL_LINK.fieldHint,
    targetItemId: toBracedGuid(FOBLES_YML.CONTENT.FOBLES_TESTING_MODULE_ROOT.id),
    targetItemPath: FOBLES_YML.CONTENT.FOBLES_TESTING_MODULE_ROOT.path,
  },
  MULTILIST_OPTIONS: {
    scenarioItemId: FOBLES_YML.CONTENT.STRATEGY_MULTILIST.id,
    fieldLabel: FOBLES_YML.CONTENT.STRATEGY_MULTILIST.fieldHint,
    targetItemId: toBracedGuid(FOBLES_YML.CONTENT.FOBLES_DATA_ITEM_A.id),
    targetItemPath: FOBLES_YML.CONTENT.FOBLES_DATA_ITEM_A.path,
  },
  MULTILIST_WITH_SEARCH: {
    scenarioItemId: FOBLES_YML.CONTENT.STRATEGY_MULTILIST_SEARCH.id,
    fieldLabel: FOBLES_YML.CONTENT.STRATEGY_MULTILIST_SEARCH.fieldHint,
    targetItemId: toBracedGuid(FOBLES_YML.CONTENT.FOBLES_DATA_ITEM_A.id),
    targetItemPath: FOBLES_YML.CONTENT.FOBLES_DATA_ITEM_A.path,
    targetTemplatePath: FOBLES_YML.TEMPLATES.FOBLES_DATA_ITEM_TEMPLATE.path,
  },
  TAG_LIST: {
    scenarioItemId: FOBLES_YML.CONTENT.STRATEGY_TAG_LIST.id,
    fieldLabel: FOBLES_YML.CONTENT.STRATEGY_TAG_LIST.fieldHint,
    targetItemId: toBracedGuid(FOBLES_YML.CONTENT.FOBLES_DATA_ITEM_A.id),
    targetItemPath: FOBLES_YML.CONTENT.FOBLES_DATA_ITEM_A.path,
  },
  TREE_LIST: {
    scenarioItemId: FOBLES_YML.CONTENT.STRATEGY_TREE_LIST.id,
    fieldLabel: FOBLES_YML.CONTENT.STRATEGY_TREE_LIST.fieldHint,
    targetItemId: toBracedGuid(FOBLES_YML.CONTENT.FOBLES_DATA_ITEM_A.id),
    targetItemPath: FOBLES_YML.CONTENT.FOBLES_DATA_ITEM_A.path,
  },
  TREELIST_EX: {
    scenarioItemId: FOBLES_YML.CONTENT.STRATEGY_TREELIST_EX.id,
    fieldLabel: FOBLES_YML.CONTENT.STRATEGY_TREELIST_EX.fieldHint,
    targetItemId: toBracedGuid(FOBLES_YML.CONTENT.FOBLES_DATA_ITEM_A.id),
    targetItemPath: FOBLES_YML.CONTENT.FOBLES_DATA_ITEM_A.path,
  },
} as const;

// Drop Tree's own display-name-resolved-path derivation (strategy-scenarios.ts) needs this
// ancestor fact directly, not paired with any one strategy.
export const MODULE_ROOT_YML_REF = FOBLES_YML.CONTENT.FOBLES_TESTING_MODULE_ROOT;
