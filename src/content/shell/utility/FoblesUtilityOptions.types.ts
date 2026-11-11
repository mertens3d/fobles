import type { ReactNode } from "react";

export type FoblesUtilityOptions = {
  lockAlreadyHeld?: boolean;
  doc: Document;
  id: string;
  className: string;
  title: string;
  storageKey: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
  createChildren: () => ReactNode | Promise<ReactNode>;
  onClose?: () => void | Promise<void>;
  onHelp?: () => void;
};
