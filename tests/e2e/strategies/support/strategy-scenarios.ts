import { CONST } from "../../CONST";
import { MODULE_ROOT_YML_REF, STRATEGY_YML_REFS } from "./yml-strategy-refs.CONST";
import type {
  StrategyScenarioData,
} from "./scenario.types";

// The last path segment is an item's own name - mechanical string parsing of an already-raw
// Path, not inference.
function leafName(path: string): string {
  return path.split("/").pop() ?? path;
}

// The second-to-last path segment is an item's immediate parent's own name - same mechanical
// parsing as leafName, just one segment further up.
function parentName(path: string): string {
  return path.split("/").slice(-2, -1)[0] ?? path;
}

// Sitecore's search-result list control (Multilist with Search only - it's the only strategy
// that reads from a search index instead of the content tree) renders each result as
// "ItemName (TemplateName - ParentName)" to disambiguate identically-named items found anywhere
// in the tree, unlike every other list-based strategy's plain item name.
function searchResultLabel(itemPath: string, templatePath: string): string {
  return `${leafName(itemPath)} (${leafName(templatePath)} - ${parentName(itemPath)})`;
}

// Drop Tree's readonly input renders a resolved path using each ancestor's __Display Name instead
// of its real item name - only "Fobles Testing" itself has one set in this test data, so swap
// just that one segment.
function displayResolvedFoValue(targetItemPath: string): string {
  return targetItemPath.replace(
    MODULE_ROOT_YML_REF.path,
    `/sitecore/${MODULE_ROOT_YML_REF.displayName}`,
  );
}

function displayResolvedButtonText(targetItemPath: string): string {
  return displayResolvedFoValue(targetItemPath).replace(/^\/sitecore\//, "");
}

// The final per-strategy expectations every spec file asserts against, built from
// STRATEGY_YML_REFS's raw facts - see tests/README.md#hardcoded-expected-values for why these are
// hardcoded instead of read live, and repo lessons on which strategies resolve a GUID to a path
// versus not.
export const STRATEGY_SCENARIOS = {
  DROP_LINK: {
    itemId: STRATEGY_YML_REFS.DROP_LINK.scenarioItemId,
    scElemFieldLabel: STRATEGY_YML_REFS.DROP_LINK.scElemFieldLabel,
    expectedButtonText: leafName(STRATEGY_YML_REFS.DROP_LINK.targetItemPath),
    expectedFoValue: STRATEGY_YML_REFS.DROP_LINK.targetItemId,
    friendlyName: "Drop Link",
    visibleToFobles: true,
    scElemLocator: CONST.SITECORE.SELECTORS.STRATEGIES.DROP_LINK,
    SCREENSHOT_BASE_NAME : "droplink-1x"
  },
  DROP_TREE: {
    itemId: STRATEGY_YML_REFS.DROP_TREE.scenarioItemId,
    scElemFieldLabel: STRATEGY_YML_REFS.DROP_TREE.scElemFieldLabel,
    // Drop Tree's button shows the full resolved path (not just the leaf name), and its readonly
    // input holds that same resolved path (not the item's GUID) as the nav target too - unlike
    // Droplink's real <select>, whose option values are GUIDs.
    expectedButtonText: displayResolvedButtonText(STRATEGY_YML_REFS.DROP_TREE.targetItemPath),
    expectedFoValue: displayResolvedFoValue(STRATEGY_YML_REFS.DROP_TREE.targetItemPath),
    friendlyName: "Drop Tree",
    visibleToFobles: true,
    scElemLocator:CONST.SITECORE.SELECTORS.STRATEGIES.DROP_TREE,
    SCREENSHOT_BASE_NAME : "drop-tree-1x" 
  },
  DROP_LIST: {
    itemId: STRATEGY_YML_REFS.DROPLIST.scenarioItemId,
    scElemFieldLabel: STRATEGY_YML_REFS.DROPLIST.scElemFieldLabel,
    expectedButtonText: "NOT IMPLEMENTED",
    expectedFoValue: "NOT IMPLEMENTED",
    friendlyName: "Drop List",
    visibleToFobles: false,
    scElemLocator: CONST.SITECORE.SELECTORS.STRATEGIES.DROP_LIST,
    SCREENSHOT_BASE_NAME : "drop-list-1x"
  },
  GENERAL_LINK: {
    itemId: STRATEGY_YML_REFS.GENERAL_LINK.scenarioItemId,
    scElemFieldLabel: STRATEGY_YML_REFS.GENERAL_LINK.scElemFieldLabel,
    // Sitecore's General Link editor control resolves an internal-linktype value to the target
    // item's path before it ever reaches the DOM input's value - the raw stored value (XML) is
    // never what's actually in the input or the button, so both button text and nav target are
    // the target's own path directly, not its GUID or leaf name.
    expectedButtonText: STRATEGY_YML_REFS.GENERAL_LINK.targetItemPath,
    expectedFoValue: STRATEGY_YML_REFS.GENERAL_LINK.targetItemPath,
    friendlyName: "General Link",
    visibleToFobles: true,
    scElemLocator: CONST.SITECORE.SELECTORS.STRATEGIES.GENERAL_LINK,
    SCREENSHOT_BASE_NAME : "general-link-1x"

  },
  INTERNAL_LINK: {
    itemId: STRATEGY_YML_REFS.INTERNAL_LINK.scenarioItemId,
    scElemFieldLabel: STRATEGY_YML_REFS.INTERNAL_LINK.scElemFieldLabel,
    // Internal Link's target is the raw stored value itself (a path, not a GUID) - both the
    // button text and the "fo" navigation target.
    expectedButtonText: STRATEGY_YML_REFS.INTERNAL_LINK.targetItemPath,
    expectedFoValue: STRATEGY_YML_REFS.INTERNAL_LINK.targetItemPath,
    friendlyName: "Internal Link",
    visibleToFobles: true,
    scElemLocator: CONST.SITECORE.SELECTORS.STRATEGIES.INTERNAL_LINK,
    SCREENSHOT_BASE_NAME : "internal-link-1x"
  },
  MULTILIST_OPTIONS: {
    itemId: STRATEGY_YML_REFS.MULTILIST_OPTIONS.scenarioItemId,
    scElemFieldLabel: STRATEGY_YML_REFS.MULTILIST_OPTIONS.scElemFieldLabel,
    expectedButtonText: leafName(STRATEGY_YML_REFS.MULTILIST_OPTIONS.targetItemPath),
    expectedFoValue: STRATEGY_YML_REFS.MULTILIST_OPTIONS.targetItemId,
    friendlyName: "Multilist Options",
    visibleToFobles: true,
    scElemLocator: CONST.SITECORE.SELECTORS.STRATEGIES.MULTILIST,
    SCREENSHOT_BASE_NAME : "multilist-1x"
  },
  MULTILIST_WITH_SEARCH: {
    itemId: STRATEGY_YML_REFS.MULTILIST_WITH_SEARCH.scenarioItemId,
    scElemFieldLabel: STRATEGY_YML_REFS.MULTILIST_WITH_SEARCH.scElemFieldLabel,
    expectedButtonText: searchResultLabel(
      STRATEGY_YML_REFS.MULTILIST_WITH_SEARCH.targetItemPath,
      STRATEGY_YML_REFS.MULTILIST_WITH_SEARCH.targetTemplatePath,
    ),
    expectedFoValue: STRATEGY_YML_REFS.MULTILIST_WITH_SEARCH.targetItemId,
    friendlyName: "Multilist With Search",
    visibleToFobles: true,
    scElemLocator: CONST.SITECORE.SELECTORS.STRATEGIES.MULTILIST_WITH_SEARCH,
    SCREENSHOT_BASE_NAME : "multilist-with-search-1x"     
  },
  TAG_LIST: {
    // NOTE, this is not currently resolved
    itemId: STRATEGY_YML_REFS.TAG_LIST.scenarioItemId,
    scElemFieldLabel: STRATEGY_YML_REFS.TAG_LIST.scElemFieldLabel,
    expectedButtonText: leafName(STRATEGY_YML_REFS.TAG_LIST.targetItemPath),
    friendlyName: "Tag List",
    visibleToFobles: false,
    expectedFoValue: "NOT IMPLEMENTED",
    scElemLocator: CONST.SITECORE.SELECTORS.STRATEGIES.TAG_LIST,
    SCREENSHOT_BASE_NAME : "tag-list-1x"
  },
  TREE_LIST: {
    itemId: STRATEGY_YML_REFS.TREE_LIST.scenarioItemId,
    scElemFieldLabel: STRATEGY_YML_REFS.TREE_LIST.scElemFieldLabel,
    expectedButtonText: leafName(STRATEGY_YML_REFS.TREE_LIST.targetItemPath),
    expectedFoValue: STRATEGY_YML_REFS.TREE_LIST.targetItemId,
    friendlyName: "Tree List",
    visibleToFobles: true,
    scElemLocator: CONST.SITECORE.SELECTORS.STRATEGIES.TREE_LIST,
    SCREENSHOT_BASE_NAME : "tree-list-1x"
  },
  TREELIST_EX: {
    itemId: STRATEGY_YML_REFS.TREELIST_EX.scenarioItemId,
    scElemFieldLabel: STRATEGY_YML_REFS.TREELIST_EX.scElemFieldLabel,
    expectedButtonText: leafName(STRATEGY_YML_REFS.TREELIST_EX.targetItemPath),
    // The field's stored value is a GUID, but Treelist Ex's rendered <div title="..."> holds the
    // resolved path, so that's the navigation target Fobles reads - not the GUID.
    expectedFoValue: STRATEGY_YML_REFS.TREELIST_EX.targetItemPath,
    friendlyName: "Treelist Ex",
    visibleToFobles: true,
    scElemLocator: CONST.SITECORE.SELECTORS.STRATEGIES.TREELISTEX,
    SCREENSHOT_BASE_NAME : "treelist-ex-1x"
  },
} satisfies Record<string, StrategyScenarioData >
;

