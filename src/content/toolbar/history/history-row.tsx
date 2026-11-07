// @source-path [fobles] src/content/toolbar/history/history-row.tsx

import { createHistoryRowHandlers } from "./handlers.ts";
import { HISTORY_CLASS, HISTORY_TEXT } from "./history.const.ts";
import { buildHistoryUrl } from "./history-navigation.ts";
import type { HistoryRowProps } from "./history.types.ts";
import { useHistoryIcon } from "./use-history-icons.ts";

export function HistoryRow(props: HistoryRowProps) {
  const icon = useHistoryIcon(props.item, props.scope);
  const handlers = createHistoryRowHandlers(props);

  return (
    <li className={HISTORY_CLASS.ROW}>
      <a
        className={HISTORY_CLASS.LINK}
        href={buildHistoryUrl(props.scope, props.item.id)}
        onClick={handlers.navigate}
        onAuxClick={handlers.navigate}
      >
        {icon && <img className="fobles-history-item-icon" src={icon} alt="" />}
        <span>{props.label ?? props.item.name}</span>
      </a>
      <button
        type="button"
        className={HISTORY_CLASS.REMOVE}
        aria-label={`${HISTORY_TEXT.REMOVE} ${props.item.name}`}
        onClick={handlers.remove}
      >×</button>
    </li>
  );
}