import type { ToolbarPlacement } from "../constants";

export type ToolbarContext = {
  doc: Document;
  win: Window;
  placement: ToolbarPlacement;
  setPlacement: (placement: ToolbarPlacement) => void;
  setVisible: (visible: boolean) => void;
  onToggleFeatures: () => void;
};
