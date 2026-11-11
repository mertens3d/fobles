import type { ReactNode } from "react";

export type MountedFoblesUtility = {
  id: string;
  className: string;
  title: string;
  storageKey: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
  children: ReactNode;
  onClose?: () => void | Promise<void>;
  onHelp?: () => void;
};

export type UtilityStore = { utilities: readonly MountedFoblesUtility[]; listeners: Set<() => void> };
