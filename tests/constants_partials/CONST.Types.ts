export type HighlightStyle = {
  BACKGROUND_COLOR: string;
  COLOR: string;
  OUTLINE: string;
  OUTLINE_OFFSET: string;
  RESTORE_DELAY_MS: number;
  TRANSITION: string;
  VISIBLE_DELAY_MS: number;
};

export type PageJumpDefinition = {
  label: string;
  url: string;
  skipTestingAI: boolean;
};

export type ToolbarType = "full" | "compact";

export type PageCase = {
  label: string;
  encodedPath: string;
  uiPath: string;
  toolbarType: ToolbarType;
  // Some pages are kept in FOBLES_PAGES (src/content/constants.ts) for reference/tracking even
  // though Fobles is marked ineligible there (eligible: false) - defaults to true (eligible).
  foblesEligible: boolean;
  // Set once a case is confirmed failing against a real Sitecore instance and not yet fixed (see
  // docs/TODO.md) - skip it instead of leaving the suite red for a known, tracked gap.
  skip?: boolean;
  // Present only once (a) a guaranteed/known item exists for this page AND (b) it's confirmed
  // reachable in the tree without extra navigation - activation/button-navigation checks only run
  // when this is set; see activationGap for every case missing one and exactly why.
  knownItemId?: string;
  // Why activation/navigation isn't tested yet, when knownItemId is absent - never silently
  // dropped, always has a specific reason here.
  activationGap?: string;
};