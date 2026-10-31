// @source-path [fobles] src/content/shared/dialog/fobles-window.tsx

import { FOBLES_WINDOW_RESIZE_EDGES } from "./fobles-window.const";
import { useFoblesWindowGeometry } from "./use-fobles-window-geometry";
import { FoblesWindowTitlebar } from "./fobles-window-titlebar";
import type { FoblesWindowProps } from "./fobles-window.types";

export function FoblesWindow({ id, className, title, storageKey, defaultWidth, defaultHeight, minWidth, minHeight, onClose, onHelp, children }: FoblesWindowProps) {
  const geometry = useFoblesWindowGeometry({ storageKey, defaultWidth, defaultHeight, minWidth, minHeight });
  const stateClasses = [className, "fobles-window", geometry.collapsed ? "is-collapsed" : "", geometry.maximized ? "is-maximized" : "", geometry.dragging ? "is-dragging" : ""].filter(Boolean).join(" ");

  return (
    <div ref={geometry.dialogRef} id={id} className={stateClasses} data-fobles-window-key={storageKey} role="dialog" aria-label={title} style={{ minWidth, minHeight, ...geometry.style }}>
      <FoblesWindowTitlebar
        title={title}
        collapsed={geometry.collapsed}
        maximized={geometry.maximized}
        onHelp={onHelp}
        onToggleCollapse={geometry.toggleCollapse}
        onToggleMaximize={geometry.toggleMaximize}
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
