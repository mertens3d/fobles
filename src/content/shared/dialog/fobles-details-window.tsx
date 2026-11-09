// @source-path [fobles] src/content/shared/dialog/fobles-details-window.tsx
import type { ReactNode } from "react";
import { FoblesWindow } from "./fobles-window";

export type FoblesDetailsWindowProps = {
  id: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function FoblesDetailsWindow({ id, title, onClose, children }: FoblesDetailsWindowProps) {
  return <FoblesWindow id={id} className="fobles-details-window" title={title} storageKey={`fobles.window.details.${id}`}
    defaultWidth={480} defaultHeight={420} minWidth={300} minHeight={180} onClose={onClose}>{children}</FoblesWindow>;
}
