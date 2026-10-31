// @source-path [fobles] src/content/shared/dialog/fobles-window.types.ts

import type { FOBLES_WINDOW_STATE_TYPE } from "./fobles-window.const";

export type WindowRect = { left: number; top: number; width: number; height: number };
export type FoblesWindowState = WindowRect & { type: typeof FOBLES_WINDOW_STATE_TYPE; collapsed: boolean; maximized: boolean; restoreRect?: WindowRect };
export type ResizeEdge = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";
export type FoblesWindowProps = {
  id: string;
  className: string;
  title: string;
  storageKey: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
  onClose: () => void;
  onHelp?: () => void;
  children: React.ReactNode;
};
export type FoblesWindowGeometryOptions = { storageKey: string; defaultWidth: number; defaultHeight: number; minWidth: number; minHeight: number };
export type FoblesWindowGeometry = {
  dialogRef: React.RefObject<HTMLDivElement | null>;
  style: React.CSSProperties;
  collapsed: boolean;
  maximized: boolean;
  dragging: boolean;
  toggleCollapse: () => void;
  toggleMaximize: () => void;
  onTitlePointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onTitlePointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onTitlePointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  onResizePointerDown: (event: React.PointerEvent<HTMLDivElement>, edge: ResizeEdge) => void;
  onResizePointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onResizePointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
};
export type FoblesWindowTitlebarProps = {
  title: string;
  collapsed: boolean;
  maximized: boolean;
  onHelp?: () => void;
  onToggleCollapse: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
};
