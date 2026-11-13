// @source-path [fobles] src/content/shared/ui/details/details-panel.types.ts

import type { ReactNode } from "react";

export type DetailsPanelProps = {
  title: string;
  getCopyText?: () => string;
  actions?: ReactNode;
  children?: ReactNode;
};
