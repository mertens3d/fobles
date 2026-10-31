// @source-path [fobles] src/content/shared/dialog/fobles-window.types.ts

export type WindowRect = { left: number; top: number; width: number; height: number };
export type FoblesWindowState = WindowRect & { type: "foblesWindowState"; collapsed: boolean; maximized: boolean; restoreRect?: WindowRect };
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
