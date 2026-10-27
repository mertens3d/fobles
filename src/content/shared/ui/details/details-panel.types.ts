// @source-path [fobles] src/content/shared/ui/details/details-panel.types.ts
import type { ReactNode } from "react";

export type DetailsPanelProps = {
  title: string;
  closeLabel: string;
  onClose?: () => void;
  getCopyText?: () => string;
  actions?: ReactNode;
  closeOnOutsidePointer?: boolean;
  children?: ReactNode;
};
