// @source-path [fobles] src/content/shared/dialog/fobles-window-titlebar.tsx

import { DialogIconButton } from "../ui/dialog/dialog-icon-button";
import type { FoblesWindowTitlebarProps } from "./fobles-window.types";

export function FoblesWindowTitlebar({
  title,
  collapsed,
  collapsible,
  draggable,
  onHelp,
  headerActions,
  onToggleCollapse,
  onClose,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: FoblesWindowTitlebarProps) {
  return (
    <div
      className="fobles-window-titlebar"
      onPointerDown={draggable ? onPointerDown : undefined}
      onPointerMove={draggable ? onPointerMove : undefined}
      onPointerUp={draggable ? onPointerUp : undefined}
      onPointerCancel={draggable ? onPointerUp : undefined}
      onDoubleClick={collapsible ? onToggleCollapse : undefined}
    >
      <div className="fobles-window-title">{title}</div>
      <div className="fobles-window-actions">
        {headerActions}
        {onHelp && <DialogIconButton kind="help" label="Help" surface="dark" onClick={onHelp} />}
        {collapsible && <button
          type="button"
          className="fobles-window-button fobles-window-collapse"
          title={collapsed ? "Restore" : "Minimize"}
          aria-label={collapsed ? "Restore" : "Minimize"}
          onClick={onToggleCollapse}
        >
          {collapsed ? "▢" : "_"}
        </button>}
        {onClose && <DialogIconButton kind="close" label="Close" surface="dark" onClick={onClose} />}
      </div>
    </div>
  );
}
