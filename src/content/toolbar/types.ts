import type { ToolbarPlacement } from "../toolbar.types";

export type ToolbarContext = {
  doc: Document;
  win: Window;
  placement: ToolbarPlacement;
  setPlacement: (placement: ToolbarPlacement) => void;
  setVisible: (visible: boolean) => void;
  onToggleFeatures: () => void;
};
