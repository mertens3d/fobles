import type { FOBLES_WINDOW } from "./fobles-window.const";
import type { CSSProperties, PointerEvent, RefObject } from "react";
import type { Root } from "react-dom/client";

export type DialogCloseButtonOptions = { readonly className?: string; readonly iconClassName?: string; };

export type HostEntry = { host: HTMLElement; root: Root };

export type PersistedWindowStack = { order: string[] };

export type WindowRect = { left: number; top: number; width: number; height: number };

export type FoblesWindowState = WindowRect & {
  type: typeof FOBLES_WINDOW.STATE_TYPE;
  collapsed: boolean;
  maximized: boolean;
  restoreRect?: WindowRect;
};

export type ResizeEdge = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

export type FoblesWindowGeometryOptions = {
  storageKey: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
};

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
