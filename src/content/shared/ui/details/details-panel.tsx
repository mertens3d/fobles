// @source-path [fobles] src/content/shared/ui/details/details-panel.tsx
import { useEffect, useRef, useState } from "react";
import { DialogIconButton } from "../dialog/dialog-icon-button";
import { DETAILS_PANEL } from "./details-panel.const";
import type { DetailsPanelProps } from "./details-panel.types";

export function DetailsPanel({ title, closeLabel, onClose, getCopyText, actions, closeOnOutsidePointer = true, children }: DetailsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!onClose) return;
    const ownerDocument = panelRef.current?.ownerDocument;
    if (!ownerDocument) return;
    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target;
      if (closeOnOutsidePointer && target instanceof ownerDocument.defaultView!.Node && !panelRef.current?.contains(target)) onClose();
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    ownerDocument.addEventListener("pointerdown", handlePointerDown, true);
    ownerDocument.addEventListener("keydown", handleKeyDown, true);
    return () => {
      ownerDocument.removeEventListener("pointerdown", handlePointerDown, true);
      ownerDocument.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [onClose, closeOnOutsidePointer]);

  const handleCopy = (): void => {
    if (!getCopyText) return;
    void navigator.clipboard.writeText(getCopyText()).then(() => {
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
      }, DETAILS_PANEL.COPIED_RESET_MS);
    });
  };

  return (
    <div ref={panelRef} className={DETAILS_PANEL.CLASS.ROOT}>
      <div className={DETAILS_PANEL.CLASS.HEADER}>
        <strong>{title}</strong>
        <div style={DETAILS_PANEL.ACTIONS_STYLE}>
          {actions}
          {getCopyText ? (
            <button type="button" className={DETAILS_PANEL.CLASS.COPY} onClick={handleCopy}>
              {copied ? DETAILS_PANEL.TEXT.COPIED : DETAILS_PANEL.TEXT.COPY}
            </button>
          ) : null}
          {onClose ? <DialogIconButton kind="close" surface="dark" label={closeLabel} onClick={onClose} /> : null}
        </div>
      </div>
      {children}
    </div>
  );
}
