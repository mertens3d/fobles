// @source-path [fobles] src/content/shared/ui/persisted-window/persisted-window.tsx
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FoblesWindow } from "../../../shared/dialog/fobles-window";
import type { PersistedWindowProps } from "./persisted-window.types";

const STORAGE_PREFIX = "fobles:persisted-window:";

function visibilityKey(windowId: string): string { return `${STORAGE_PREFIX}${windowId}:visible`; }

function geometryKey(windowId: string): string { return `${STORAGE_PREFIX}${windowId}:geometry`; }

function loadVisible(windowId: string): boolean {
  try { return JSON.parse(localStorage.getItem(visibilityKey(windowId)) ?? "false") === true; } catch { return false; }
}

function getPortalTarget(): HTMLElement {
  return document.querySelector<HTMLElement>('div[data-fobles-note="react mount"]') ?? document.body;
}

export function PersistedWindow({ windowId, title, children, defaultGeometry, minWidth = 260, minHeight = 160, visibilityRequest, onVisibilityChange, headerActions }: PersistedWindowProps) {
  const [visible, setVisible] = useState(() => loadVisible(windowId));
  const lastVisibilityRequest = useRef<number | undefined>(visibilityRequest?.id);
  useEffect(() => { localStorage.setItem(visibilityKey(windowId), JSON.stringify(visible)); onVisibilityChange?.(visible); }, [onVisibilityChange, visible, windowId]);
  useEffect(() => {
    if (visibilityRequest && visibilityRequest.id !== lastVisibilityRequest.current) {
      lastVisibilityRequest.current = visibilityRequest.id;
      setVisible(visibilityRequest.visible);
    }
  }, [visibilityRequest]);
  if (!visible) { return null; }
  return createPortal(
    <div className="fobles-window-portal-root" onPointerDown={(event) => event.stopPropagation()} onPointerMove={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()} onPointerCancel={(event) => event.stopPropagation()}>
      <FoblesWindow id={`fobles-${windowId}`} className="fobles-persisted-window" title={title} storageKey={geometryKey(windowId)}
      defaultWidth={defaultGeometry.width} defaultHeight={defaultGeometry.height} minWidth={minWidth} minHeight={minHeight}
        headerActions={headerActions} onClose={() => setVisible(false)}>{children}</FoblesWindow>
    </div>,
    getPortalTarget(),
  );
}
