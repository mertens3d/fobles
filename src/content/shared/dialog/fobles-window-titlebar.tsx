// @source-path [fobles] src/content/shared/dialog/fobles-window-titlebar.tsx

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
        {onHelp && <button type="button" className="fobles-window-button fobles-window-help" title="Help" aria-label="Help" onClick={onHelp}>?</button>}
        <button type="button" className="fobles-window-button fobles-window-collapse" title={collapsed ? "Restore" : "Collapse"} aria-label={collapsed ? "Restore" : "Collapse"} onClick={onToggleCollapse}>{collapsed ? "▢" : "_"}</button>
        <button type="button" className="fobles-window-button fobles-window-maximize" title={maximized ? "Restore" : "Maximize"} aria-label={maximized ? "Restore" : "Maximize"} onClick={onToggleMaximize}>{maximized ? "❐" : "□"}</button>
        <button type="button" className="fobles-window-button fobles-window-close" title="Close" aria-label="Close" onClick={onClose}>×</button>
      </div>
    </div>
  );
}
