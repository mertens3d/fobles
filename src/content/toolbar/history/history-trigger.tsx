// @source-path [fobles] src/content/toolbar/history/history-trigger.tsx

import { useEffect, useState } from "react";
import { ITEM_HISTORY } from "../../../shared/item-history/item-history.const.ts";
import { PersistedWindow } from "../../shared/ui/persisted-window/persisted-window";
import type { PersistedWindowVisibilityRequest } from "../../shared/ui/persisted-window/persisted-window.types";
import { FlyoutTrigger } from "../shared-flyout/flyout-trigger";
import { createClearHistoryHandler } from "./handlers.ts";
import { HISTORY_CLASS, HISTORY_TEXT, HISTORY_UI } from "./history.const.ts";
import { HistoryErrorBoundary } from "./history-error-boundary.tsx";
import { historyItemLabel } from "./history-label.ts";
import { HistoryRow } from "./history-row.tsx";
import type { HistoryTriggerProps } from "./history.types.ts";
import { useHistoryScope } from "./use-history-scope.ts";
import { useHistoryStore } from "./use-history-store.ts";
import { useHistoryKnownSites } from "./use-history-known-sites.ts";

function readCollapsedGroups(): Set<string> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(ITEM_HISTORY.COLLAPSED_STORAGE_KEY) ?? "[]");
    const value = Array.isArray(stored) ? stored.filter((item): item is string => typeof item === "string") : [];
    return new Set(value);
  } catch {
    return new Set();
  }
}

function HistoryContents({ doc, historyFlyout, onOpen, onToggle }: HistoryTriggerProps) {
  const scopeState = useHistoryScope(doc);
  const store = useHistoryStore(scopeState.scope);
  const sites = useHistoryKnownSites(scopeState.scope);
  const error = scopeState.error ?? store.error;
  const scope = store.scope;
  const [collapsedGroups, setCollapsedGroups] = useState(readCollapsedGroups);
  const [windowVisible, setWindowVisible] = useState(false);
  const [visibilityRequest, setVisibilityRequest] = useState<PersistedWindowVisibilityRequest>();

  useEffect(() => {
    if (windowVisible && !historyFlyout.visible) {
      onOpen();
    } else if (!windowVisible && historyFlyout.visible) {
      historyFlyout.hide();
    }
  }, [historyFlyout, onOpen, windowVisible]);

  function toggleGroup(category: string): void {
    const next = new Set(collapsedGroups);
    if (next.has(category)) { next.delete(category); } else { next.add(category); }
    localStorage.setItem(ITEM_HISTORY.COLLAPSED_STORAGE_KEY, JSON.stringify([...next]));
    setCollapsedGroups(next);
  }

  function toggleHistory(): void {
    onToggle();
    setVisibilityRequest((current) => ({ id: (current?.id ?? 0) + 1, visible: !windowVisible }));
  }

  return <div title="" className={HISTORY_CLASS.TRIGGER}>
    <FlyoutTrigger className={HISTORY_CLASS.ACTIONS} enableHover={false} onHoverOpen={onOpen}
      onHoverScheduleClose={historyFlyout.scheduleHide} onOutsidePointerDown={() => undefined}
      button={<button type="button" className={HISTORY_CLASS.TAB} aria-controls={HISTORY_UI.PANEL_ID}
        aria-expanded={windowVisible} aria-pressed={windowVisible} onClick={toggleHistory}>{HISTORY_TEXT.TITLE}</button>}>
      <PersistedWindow windowId="history" title={HISTORY_TEXT.TITLE} visibilityRequest={visibilityRequest}
        defaultGeometry={{ x: Math.max(16, window.innerWidth - 400), y: 72, width: 360, height: 620 }} minWidth={300} minHeight={280}
        onVisibilityChange={setWindowVisible}>
        <section id={HISTORY_UI.PANEL_ID} className={HISTORY_CLASS.PANEL} aria-label={HISTORY_TEXT.TITLE}>
          <div className="fobles-history-content-actions">
            <button type="button" disabled={!store.items.length} onClick={createClearHistoryHandler(store.mutate)}>{HISTORY_TEXT.CLEAR}</button>
          </div>
          {error && <div role="alert" className={HISTORY_CLASS.ERROR}>{error}</div>}
          {ITEM_HISTORY.CATEGORIES.map((category) => {
            const items = store.items.filter((item) => item.category === category).sort((a, b) => b.lastVisitedAt - a.lastVisitedAt);
            const collapsed = collapsedGroups.has(category);
            return <section key={category} className={HISTORY_CLASS.GROUP} aria-label={category}>
              <button type="button" className="fobles-history-group-toggle" aria-expanded={!collapsed} onClick={() => toggleGroup(category)}>
                <span className="fobles-history-disclosure" aria-hidden="true">{collapsed ? "▸" : "▾"}</span>
                <span>{category} ({items.length})</span>
              </button>
              {!collapsed && items.length > 0 && <div className="fobles-history-group-body"><ul>{scope && items.map((item) =>
                <HistoryRow key={item.id} item={item} scope={scope} mutate={store.mutate} label={historyItemLabel(item, sites)}
                  onError={store.reportError} onNavigated={() => setVisibilityRequest((current) => ({ id: (current?.id ?? 0) + 1, visible: false }))} />)}</ul></div>}
            </section>;
          })}
        </section>
      </PersistedWindow>
    </FlyoutTrigger>
  </div>;
}

export function HistoryTrigger(props: HistoryTriggerProps) {
  return <HistoryErrorBoundary><HistoryContents {...props} /></HistoryErrorBoundary>;
}
