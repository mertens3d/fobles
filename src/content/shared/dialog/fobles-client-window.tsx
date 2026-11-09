// @source-path [fobles] src/content/shared/dialog/fobles-client-window.tsx
import { useEffect, useRef, type ReactNode } from "react";
import { FoblesWindow } from "./fobles-window";

export type FoblesClientWindowProps = {
  ownerRef: React.RefObject<HTMLElement | null>;
  id: string;
  className: string;
  title: string;
  storageKey: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
  onClose: () => void;
  children: ReactNode;
};

export function FoblesClientWindow({ ownerRef, onClose, children, ...windowProps }: FoblesClientWindowProps) {
  const clientRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const doc = ownerRef.current?.ownerDocument;
    if (!doc) {
      return;
    }
    function handlePointerDown(event: PointerEvent): void {
      const owner = ownerRef.current;
      const target = event.target;
      if (owner && target instanceof Node && owner.contains(target) && !clientRef.current?.contains(target)) {
        onClose();
      }
    }
    doc.addEventListener("pointerdown", handlePointerDown, true);
    return () => doc.removeEventListener("pointerdown", handlePointerDown, true);
  }, [onClose, ownerRef]);

  return <div ref={clientRef} className="fobles-client-window"><FoblesWindow {...windowProps} onClose={onClose}>{children}</FoblesWindow></div>;
}
