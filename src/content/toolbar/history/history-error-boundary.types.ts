import type { ReactNode } from "react";

export type HistoryErrorBoundaryProps = {
  children: ReactNode;
};

export type HistoryErrorBoundaryState = {
  failed: boolean;
};