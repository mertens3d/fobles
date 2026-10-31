// @source-path [fobles] src/content/shared/dialog/fobles-window-titlebar.tsx

import { DialogIconButton } from "../ui/dialog/dialog-icon-button";

export type FoblesWindowTitlebarProps = {
  title: string;
  collapsed: boolean;
  maximized: boolean;
  onHelp?: () => void;
  onToggleCollapse: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
};

export function FoblesWindowTitlebar({ title, collapsed, maximized, onHelp, onToggleCollapse, onToggleMaximize, onClose, onPointerDown, onPointerMove, onPointerUp }: FoblesWindowTitlebarProps) {
  return (
    <div className="fobles-window-titlebar" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onDoubleClick={onToggleMaximize}>
      <div className="fobles-window-title">{title}</div>
      <div className="fobles-window-actions">
        {onHelp && <DialogIconButton kind="help" label="Help" surface="dark" onClick={onHelp} />}
        <button type="button" className="fobles-window-button fobles-window-collapse" title={collapsed ? "Restore" : "Minimize"} aria-label={collapsed ? "Restore" : "Minimize"} onClick={onToggleCollapse}>{collapsed ? "▢" : "_"}</button>
        <button type="button" className="fobles-window-button fobles-window-maximize" title={maximized ? "Restore" : "Maximize"} aria-label={maximized ? "Restore" : "Maximize"} onClick={onToggleMaximize}>{maximized ? "❐" : "□"}</button>
        <DialogIconButton kind="close" label="Close" surface="dark" onClick={onClose} />
      </div>
    </div>
  );
}
