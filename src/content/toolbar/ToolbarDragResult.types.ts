import type { ToolbarCorner } from "../../constants/constants.types";

export type DragPosition = { left: number; top: number; };

export type ToolbarDragResult = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  className: string;
  dataPosition: ToolbarCorner;
  style: React.CSSProperties;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => void;
};
