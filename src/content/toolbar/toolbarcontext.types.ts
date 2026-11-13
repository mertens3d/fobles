// @source-path [fobles] src/content/toolbar/toolbarcontext.types.ts

import type { ToolbarPlacement } from "../../constants/constants.types";

export type ToolbarContext = {
  doc: Document;
  win: Window;
  placement: ToolbarPlacement;
  setPlacement: (placement: ToolbarPlacement) => void;
  setVisible: (visible: boolean) => void;
  onToggleFeatures: () => void;
};
