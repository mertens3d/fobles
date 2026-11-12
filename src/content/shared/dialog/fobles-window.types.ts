// @source-path [fobles] src/content/shared/dialog/fobles-window.types.ts

import type { PointerEvent, ReactNode } from "react";

export type FoblesWindowProps = {
  id: string;
  className: string;
  title: string;
  storageKey: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
  collapsible?: boolean;
  draggable?: boolean;
  resizable?: boolean;
  persistent?: boolean;
  placement?: "floating" | "client-overlay";
  onClose?: () => void;
  onHelp?: () => void;
  headerActions?: ReactNode;
  children: ReactNode;
};

export type FoblesWindowTitlebarProps = {
  title: string;
  collapsed: boolean;
  onHelp?: () => void;
  headerActions?: ReactNode;
  collapsible: boolean;
  draggable: boolean;
  onToggleCollapse: () => void;
  onClose?: () => void;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
};
