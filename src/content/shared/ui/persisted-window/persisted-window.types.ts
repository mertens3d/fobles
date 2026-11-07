// @source-path [fobles] src/content/shared/ui/persisted-window/persisted-window.types.ts
import type { ReactNode } from "react";

export type PersistedWindowGeometry = { x: number; y: number; width: number; height: number };
export type PersistedWindowState = PersistedWindowGeometry & { visible: boolean };
export type PersistedWindowVisibilityRequest = { id: number; visible: boolean };

export type PersistedWindowProps = {
  windowId: string;
  title: string;
  children: ReactNode;
  defaultGeometry: PersistedWindowGeometry;
  minWidth?: number;
  minHeight?: number;
  visibilityRequest?: PersistedWindowVisibilityRequest;
  onVisibilityChange?: (visible: boolean) => void;
  headerActions?: ReactNode;
};
