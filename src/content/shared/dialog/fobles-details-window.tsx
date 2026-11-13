// @source-path [fobles] src/content/shared/dialog/fobles-details-window.tsx

import type { ReactNode, RefObject } from "react";
import { FoblesClientWindow } from "./fobles-client-window";

export type FoblesDetailsWindowProps = { id: string; title: string; ownerRef: RefObject<HTMLElement | null>; onClose: () => void; children: ReactNode };

export function FoblesDetailsWindow({ id, title, ownerRef, onClose, children }: FoblesDetailsWindowProps) {
  return <FoblesClientWindow ownerRef={ownerRef} id={id} className="fobles-details-window" title={title} storageKey={`fobles.window.details.${id}`}
    defaultWidth={420} defaultHeight={520} minWidth={320} minHeight={260} collapsible={false} draggable={false} resizable={false} persistent={false}
    placement="client-overlay" onClose={onClose}>{children}</FoblesClientWindow>;
}
