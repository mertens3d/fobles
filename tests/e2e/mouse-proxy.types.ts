export type MousePosition = { x: number; y: number };

export type ToolbarCorner = "upper-left" | "upper-right" | "bottom-right" | "bottom-left";

export type CornerPosition = {
  corner: ToolbarCorner;
  offsetX: number;
  offsetY: number;
};