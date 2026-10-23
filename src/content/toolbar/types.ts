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

export type QuickInfoTemplate={
  path: string | undefined;
  id: string | undefined;
}
export type QuickInfo = {
  itemId: string | undefined;
  itemName: string | undefined;
  itemPath: string | undefined;
  template: QuickInfoTemplate | undefined;
  icon: string | undefined;
  // Diagnostics only: the raw quick-info panel markup this was parsed from.
  rawMarkup: string | undefined;
};