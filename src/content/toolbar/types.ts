// @source-path [fobles] src/content/toolbar/types.ts

import type { ToolbarPlacement } from "../toolbar.types";

export type ToolbarContext = {
  doc: Document;
  win: Window;
  placement: ToolbarPlacement;
  setPlacement: (placement: ToolbarPlacement) => void;
  setVisible: (visible: boolean) => void;
  onToggleFeatures: () => void;
};


export type QuickInfo = {
  itemId: string | undefined;
  itemName: string | undefined;
  itemPath: string | undefined;
  template: string | undefined;
};