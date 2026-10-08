import { TOOLBAR_CORNERS } from "../constants/fobles.constants";

export type ToolbarCorner = (typeof TOOLBAR_CORNERS)[number];

export type ToolbarPlacement = {
  corner: ToolbarCorner;
  offsetX: number;
  offsetY: number;
};
