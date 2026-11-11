// @source-path [fobles] src/content/shared/dialog/fobles-window.const.ts

import type { ResizeEdge } from "./dialog.types";

export const FOBLES_WINDOW = {
  VIEWPORT_MARGIN: 12,
  TITLE_BAR_HEIGHT: 34,
  COLLAPSED_WIDTH: 300,
  STATE_TYPE: "foblesWindowState",
  RESIZE_EDGES: ["n", "ne", "e", "se", "s", "sw", "w", "nw"] as readonly ResizeEdge[],
} as const;
