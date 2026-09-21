// A field-strategy spec's own hand-harvested-from-YAML values (tests/README.md#hardcoded-expected-
// values) grouped into one object instead of scattered top-level consts, so it's visually clear
// which values came from looking up the serialized test data versus other file-level constants
// (e.g. STEP_WAIT_MS, SCREENSHOT_BASE_NAME).
export type StrategyScenarioData = {
  itemId: string;
  fieldLabel: string;
  expectedButtonText: string;
};

// Specs that also exercise the Fobles button's click/Ctrl+click navigation additionally need the
// expected "fo" URL param target - a GUID when the button text is independently resolved
// (Droplink/Multilist), or the same value as expectedButtonText when there's no getButtonText
// override (General Link/Internal Link/Drop Tree). Specs with no navigation tests (e.g. the
// currently-skipped Tag List) can use the base StrategyScenarioData instead.
export type NavigableStrategyScenarioData = StrategyScenarioData & {
  expectedFoValue: string;
};

// Droplist stores/renders only the chosen value's plain name text, never an item GUID (see
// src/content/features/augmentor/field-strategies/sc-droplist.ts) - Fobles leaves it completely
// untouched, so its scenario needs only the item/field to open, no button or navigation target.
export type NonInteractiveStrategyScenarioData = {
  itemId: string;
  fieldLabel: string;
};
