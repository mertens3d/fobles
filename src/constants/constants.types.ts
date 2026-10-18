import type { ToolbarPlacement } from "../content/toolbar.types";
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
