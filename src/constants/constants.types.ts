import type { TOOLBAR_CORNERS } from "./fobles-b.const";
import type { REFERENCE_GRAPH } from "./graph.const";

// Every shell page/dialog Fobles is eligible on, in one place, replacing three previously
// separate lists (path-only pages, xmlcontrol-only dialogs, and which of those get a compact
// toolbar). matchStrings are checked as plain substrings against the page's own decoded, lowercased
// "pathname + search" (see findAllowedPage, src/content/guard.ts) - a path like "/sitecore/shell/
// Applications/Content Editor.aspx" and a query fragment like "xmlcontrol=fileexplorer" are both
// just substrings of that same string, so no separate matching mode is needed for either kind.
// id is also this page's placement storage key suffix (see toolbar-placement.ts) - one sync key
// per page, created only once a user actually drags the toolbar on that particular page.
// defaultPlacement is that page's own fallback until then; omit it to just use the shared
// DEFAULT_TOOLBAR_PLACEMENT below instead.
export type ToolbarPageKind = "full" | "compact";

export type AllowedPage = {
  id: string;
  friendlyName: string;
  matchStrings: readonly string[];
  toolbarType: ToolbarPageKind;
  defaultPlacement?: ToolbarPlacement;
  // Kept in the list for reference/tracking even though Fobles shouldn't currently activate on
  // it - findAllowedPage (src/content/guard.ts) skips these. Omit to mean true.
  isFoblesEligible: boolean;
};

export type LayoutScope = (typeof REFERENCE_GRAPH.LAYOUT_SCOPE)[keyof typeof REFERENCE_GRAPH.LAYOUT_SCOPE];

export type ToolbarPlacement = { corner: ToolbarCorner; offsetX: number; offsetY: number };

export type ToolbarCorner = (typeof TOOLBAR_CORNERS)[number];

export type FlyoutOption = {
  id: string;
  label: string;
  path?: string;
  url?: string;
  useCurrentItemId?: boolean;
  action?: (doc: Document) => void;
  icon?: string;
  // Hides the button entirely (e.g. not ready for use yet) without deleting its definition.
  isIncomplete?: boolean;
  isXPOnly?: boolean;
  isAIOnly?: boolean;
};

export type FlyoutGroup = { groupMembers: readonly FlyoutOption[]; title?: string };

export type DroplinkFoblesStrategy = Extract<FoblesStrategy, "drop-link">;

export type DropTreeFoblesStrategy = Extract<FoblesStrategy, "drop-tree">;

export type DroplistFoblesStrategy = Extract<FoblesStrategy, "droplist">;

export type FileFoblesStrategy = Extract<FoblesStrategy, "file">;

export type GeneralLinkFoblesStrategy = Extract<FoblesStrategy, "general-link">;

export type IconFoblesStrategy = Extract<FoblesStrategy, "icon">;

export type ImageFoblesStrategy = Extract<FoblesStrategy, "image">;

export type InternalLinkFoblesStrategy = Extract<FoblesStrategy, "internal-link">;

export type MultilistOptionsFoblesStrategy = Extract<FoblesStrategy, "multilist-options">;

export type MultilistWithSearchFoblesStrategy = Extract<FoblesStrategy, "multilist-with-search">;

export type QuickInfoSectionFoblesStrategy = Extract<FoblesStrategy, "quick-info-section">;

export type ReferenceLinksFoblesStrategy = Extract<FoblesStrategy, "reference-links">;

export type StyleChecklistFoblesStrategy = Extract<FoblesStrategy, "style-checklist">;

export type TagListFoblesStrategy = Extract<FoblesStrategy, "tag-list">;

export type TemplatePathFoblesStrategy = Extract<FoblesStrategy, "template-path">;

export type TreeListFoblesStrategy = Extract<FoblesStrategy, "tree-list">;

export type TreelistExFoblesStrategy = Extract<FoblesStrategy, "treelist-ex">;

export type FoblesConfigBase<TStrategy extends FoblesStrategy> = {
  strategy: TStrategy;
  FoblesTopSelector: string;
  getButtonText?: (element: Element, value: string) => string;
  buttonName?: string;
  sitecoreFieldTypes?: readonly string[];
};

export type DroplinkFobles = FoblesConfigBase<DroplinkFoblesStrategy>;

export type DropTreeFobles = FoblesConfigBase<DropTreeFoblesStrategy> & { additionalElementsToHide?: string[] };

export type DroplistFobles = FoblesConfigBase<DroplistFoblesStrategy>;

export type FileFobles = FoblesConfigBase<FileFoblesStrategy>;

export type SitecoreGeneralLinkFieldType = "General Link" | "General Link with Search";

export type GeneralLinkFobles = FoblesConfigBase<GeneralLinkFoblesStrategy> & {
  sitecoreFieldTypes: readonly SitecoreGeneralLinkFieldType[];
};

export type IconFobles = FoblesConfigBase<IconFoblesStrategy>;

export type ImageFobles = FoblesConfigBase<ImageFoblesStrategy>;

export type InternalLinkFobles = FoblesConfigBase<InternalLinkFoblesStrategy>;

export type MultilistOptionsFobles = FoblesConfigBase<MultilistOptionsFoblesStrategy>;

export type MultilistWithSearchFobles = FoblesConfigBase<MultilistWithSearchFoblesStrategy>;

export type QuickInfoSource = {
  selector: string;
  valueSource: "text" | "value";
  targetKind: "guid" | "sitecore-path";
  wrapperVariant: "quickinfo" | "row";
};

export type QuickInfoCandidate = { labelStartsWith: string; sources: readonly QuickInfoSource[] };

export type QuickInfoSectionFobles = FoblesConfigBase<QuickInfoSectionFoblesStrategy> & {
  candidates: readonly QuickInfoCandidate[];
};

export type ReferenceLinksFobles = FoblesConfigBase<ReferenceLinksFoblesStrategy>;

export type StyleChecklistFobles = FoblesConfigBase<StyleChecklistFoblesStrategy>;

export type TagListFobles = FoblesConfigBase<TagListFoblesStrategy>;

export type TemplatePathFobles = FoblesConfigBase<TemplatePathFoblesStrategy>;

export type TreeListFobles = FoblesConfigBase<TreeListFoblesStrategy>;

export type TreelistExFobles = FoblesConfigBase<TreelistExFoblesStrategy>;

export type FoblesConfig =
  | DroplinkFobles
  | DropTreeFobles
  | DroplistFobles
  | FileFobles
  | GeneralLinkFobles
  | IconFobles
  | ImageFobles
  | InternalLinkFobles
  | MultilistOptionsFobles
  | MultilistWithSearchFobles
  | QuickInfoSectionFobles
  | ReferenceLinksFobles
  | StyleChecklistFobles
  | TagListFobles
  | TemplatePathFobles
  | TreeListFobles
  | TreelistExFobles;

export type SingleInputFieldOptions = {
  actionPrefix: string;
  buttonClass: string;
  wrapperClass: string;
  getTarget: (value: string) => string | null;
};

export type FoblesListItem = { label: string; value: string };

export type FoblesStrategy =
  | "drop-link"
  | "drop-tree"
  | "droplist"
  | "file"
  | "general-link"
  | "icon"
  | "image"
  | "internal-link"
  | "multilist-options"
  | "multilist-with-search"
  | "quick-info-section"
  | "reference-links"
  | "style-checklist"
  | "tag-list"
  | "template-path"
  | "tree-list"
  | "treelist-ex";

export type StepKey =
  | "fetch-document"
  | "parse-document"
  | "root-item"
  | "children"
  | "sections"
  | "layouts"
  | "referrers"
  | "parent"
  | "enrichment"
  | "build-graph";

export type LayoutGraphPresetName = "dagre" | "cose-bilkent" | "fcose" | "breadthfirst";
