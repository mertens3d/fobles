// @source-path [fobles] src/content/toolbar/history/history-trigger.tsx

import { ITEM_HISTORY } from "../../../shared/item-history/item-history.const.ts";
import { FlyoutTrigger } from "../shared-flyout/flyout-trigger";
import { createClearHistoryHandler } from "./handlers.ts";
import { HISTORY_CLASS, HISTORY_TEXT, HISTORY_UI } from "./history.const.ts";
import { HistoryRow } from "./history-row.tsx";
import type { HistoryTriggerProps } from "./history.types.ts";
import { useHistoryScope } from "./use-history-scope.ts";
import { useHistoryStore } from "./use-history-store.ts";

export function HistoryTrigger({ doc, historyFlyout, onOpen, onToggle }: HistoryTriggerProps) {
  const scopeState = useHistoryScope(doc);
  const store = useHistoryStore(scopeState.scope);
  const error = scopeState.error ?? store.error;
  const scope = store.scope;

  return (
    <div title="" className={HISTORY_CLASS.TRIGGER}>
      <FlyoutTrigger
        className={HISTORY_CLASS.ACTIONS}
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
          <section id={HISTORY_UI.PANEL_ID} className={HISTORY_CLASS.PANEL} aria-label={HISTORY_TEXT.TITLE}>
            <header>
              <strong>{HISTORY_TEXT.TITLE}</strong>
              <button type="button" disabled={!store.items.length} onClick={createClearHistoryHandler(store.mutate)}>
                {HISTORY_TEXT.CLEAR}
              </button>
            </header>
            {error && <div role="alert" className={HISTORY_CLASS.ERROR}>{error}</div>}
            {!store.items.length && <p className={HISTORY_CLASS.EMPTY}>{HISTORY_TEXT.EMPTY}</p>}
            {ITEM_HISTORY.CATEGORIES.map((category) => {
              const items = store.items.filter((item) => item.category === category)
                .sort((a, b) => b.lastVisitedAt - a.lastVisitedAt);
              return items.length > 0 && scope && (
                <section key={category} className={HISTORY_CLASS.GROUP} aria-label={category}>
                  <h3>{category}</h3>
                  <ul>
                    {items.map((item) => (
                      <HistoryRow key={item.id} item={item} scope={scope} mutate={store.mutate}
                        onError={store.reportError} onNavigated={historyFlyout.hide} />
                    ))}
                  </ul>
                </section>
              );
            })}
          </section>
        )}
      </FlyoutTrigger>
    </div>
  );
}