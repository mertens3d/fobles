// @source-path [fobles] src/content/toolbar/history/history-trigger.tsx

import { Fragment, useEffect, useState } from "react";
import { ITEM_HISTORY } from "../../../shared/item-history/item-history.const.ts";
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
  useEffect(() => {
    if (!historyFlyout.visible) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        historyFlyout.hide();
      }
    };
    doc.addEventListener("keydown", onKeyDown, true);
    return () => doc.removeEventListener("keydown", onKeyDown, true);
  }, [doc, historyFlyout]);

  function toggleGroup(category: string): void {
    const next = new Set(collapsedGroups);
    if (next.has(category)) {
      next.delete(category);
    } else {
      next.add(category);
    }
    localStorage.setItem(ITEM_HISTORY.COLLAPSED_STORAGE_KEY, JSON.stringify([...next]));
    setCollapsedGroups(next);
  }

  return (
    <div title="" className={HISTORY_CLASS.TRIGGER}>
      <FlyoutTrigger
        className={HISTORY_CLASS.ACTIONS}
        enableHover={false}
        onHoverOpen={onOpen}
        onHoverScheduleClose={historyFlyout.scheduleHide}
        onOutsidePointerDown={historyFlyout.hide}
        button={
          <button
            type="button"
            className={HISTORY_CLASS.TAB}
            aria-controls={HISTORY_UI.PANEL_ID}
            aria-expanded={historyFlyout.visible}
            aria-pressed={historyFlyout.pinned}
            onClick={onToggle}
          >
            {HISTORY_TEXT.TITLE}
          </button>
        }
      >
        {historyFlyout.visible && (
          <Fragment>
            <button type="button" className="fobles-history-backdrop" aria-label="Close History"
              onClick={historyFlyout.hide} />
            <section id={HISTORY_UI.PANEL_ID} className={HISTORY_CLASS.PANEL} role="dialog" aria-modal="true"
              aria-label={HISTORY_TEXT.TITLE}>
            <header>
              <strong>{HISTORY_TEXT.TITLE}</strong>
              <button type="button" disabled={!store.items.length} onClick={createClearHistoryHandler(store.mutate)}>
                {HISTORY_TEXT.CLEAR}
              </button>
            </header>
            {error && <div role="alert" className={HISTORY_CLASS.ERROR}>{error}</div>}
            {ITEM_HISTORY.CATEGORIES.map((category) => {
              const items = store.items.filter((item) => item.category === category)
                .sort((a, b) => b.lastVisitedAt - a.lastVisitedAt);
              const collapsed = collapsedGroups.has(category);
              return (
                <section key={category} className={HISTORY_CLASS.GROUP} aria-label={category}>
                  <button type="button" className="fobles-history-group-toggle" aria-expanded={!collapsed} onClick={() => toggleGroup(category)}>
                    <span className="fobles-history-disclosure" aria-hidden="true">{collapsed ? "▶" : "▼"}</span>
                    <span>{category} ({items.length})</span>
                  </button>
                  {!collapsed && items.length > 0 && <div className="fobles-history-group-body">
                    <ul>{scope && items.map((item) => (
                      <HistoryRow key={item.id} item={item} scope={scope} mutate={store.mutate} label={historyItemLabel(item, sites)}
                        onError={store.reportError} onNavigated={historyFlyout.hide} />
                    ))}</ul>
                  </div>}
                </section>
              );
            })}
            </section>
          </Fragment>
        )}
      </FlyoutTrigger>
    </div>
  );
}

export function HistoryTrigger(props: HistoryTriggerProps) {
  return <HistoryErrorBoundary><HistoryContents {...props} /></HistoryErrorBoundary>;
}