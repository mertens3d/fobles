// @source-path [fobles] src/content/shared/dialog/fobles-window.types.ts

import type { CSSProperties, PointerEvent, ReactNode, RefObject } from "react";
import type { FOBLES_WINDOW_STATE_TYPE } from "./fobles-window.const.ts";

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
  children: ReactNode;
};
export type FoblesWindowGeometryOptions = { storageKey: string; defaultWidth: number; defaultHeight: number; minWidth: number; minHeight: number };
export type FoblesWindowGeometry = {
  dialogRef: RefObject<HTMLDivElement | null>;
  style: CSSProperties;
  collapsed: boolean;
  maximized: boolean;
  dragging: boolean;
  toggleCollapse: () => void;
  toggleMaximize: () => void;
  onTitlePointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onTitlePointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onTitlePointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onResizePointerDown: (event: PointerEvent<HTMLDivElement>, edge: ResizeEdge) => void;
  onResizePointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onResizePointerUp: (event: PointerEvent<HTMLDivElement>) => void;
};
export type FoblesWindowTitlebarProps = {
  title: string;
  collapsed: boolean;
  maximized: boolean;
  onHelp?: () => void;
  onToggleCollapse: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
};
