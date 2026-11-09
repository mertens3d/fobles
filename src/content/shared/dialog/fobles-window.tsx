// @source-path [fobles] src/content/shared/dialog/fobles-window.tsx

import { useEffect } from "react";
import { FOBLES_WINDOW_COLLAPSED_WIDTH, FOBLES_WINDOW_RESIZE_EDGES } from "./fobles-window.const";
import { bringFoblesWindowToFront, registerFoblesWindow, syncFoblesWindowStack } from "./fobles-window-stack";
import { useFoblesWindowGeometry } from "./use-fobles-window-geometry";
import { FoblesWindowTitlebar } from "./fobles-window-titlebar";
import type { FoblesWindowProps } from "./fobles-window.types";

export function FoblesWindow({
  id,
  className,
  title,
  storageKey,
  defaultWidth,
  defaultHeight,
  minWidth,
  minHeight,
  onClose,
  onHelp,
  headerActions,
  children,
}: FoblesWindowProps) {
  const geometry = useFoblesWindowGeometry({ storageKey, defaultWidth, defaultHeight, minWidth, minHeight });
  useEffect(() => { const element = geometry.dialogRef.current; return element ? registerFoblesWindow(element) : undefined; }, [geometry.dialogRef]);
  useEffect(() => { syncFoblesWindowStack(); }, [geometry.collapsed]);
  const stateClasses = [
    className,
    "fobles-window",
    geometry.collapsed ? "is-collapsed" : "",
    geometry.maximized ? "is-maximized" : "",
    geometry.dragging ? "is-dragging" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={geometry.dialogRef}
      id={id}
      className={stateClasses}
      data-fobles-window-key={storageKey}
      role="dialog"
      aria-label={title}
      style={{ minWidth: geometry.collapsed ? FOBLES_WINDOW_COLLAPSED_WIDTH : minWidth, minHeight, ...geometry.style }}
      onPointerDownCapture={(event) => bringFoblesWindowToFront(event.currentTarget)}
    >
      <FoblesWindowTitlebar
        title={title}
        collapsed={geometry.collapsed}
        onHelp={onHelp}
        headerActions={headerActions}
        onToggleCollapse={geometry.toggleCollapse}
        onClose={onClose}
        onPointerDown={geometry.onTitlePointerDown}
        onPointerMove={geometry.onTitlePointerMove}
        onPointerUp={geometry.onTitlePointerUp}
      />
      <div className="fobles-window-content">{children}</div>
      {FOBLES_WINDOW_RESIZE_EDGES.map((edge) => (
        <div
          key={edge}
          className={`fobles-window-resize fobles-window-resize--${edge}`}
          data-edge={edge}
          onPointerDown={(event) => geometry.onResizePointerDown(event, edge)}
          onPointerMove={geometry.onResizePointerMove}
          onPointerUp={geometry.onResizePointerUp}
          onPointerCancel={geometry.onResizePointerUp}
        />
      ))}
    </div>
  );
}
