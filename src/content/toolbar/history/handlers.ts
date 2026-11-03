// @source-path [fobles] src/content/toolbar/history/handlers.ts

import { HISTORY_TEXT } from "./history.const.ts";
import { navigateHistory } from "./history-navigation.ts";
import type { HistoryMutationHandler, HistoryNavigationEvent, HistoryRowProps } from "./history.types.ts";

export function historyErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : HISTORY_TEXT.ERROR;
}

export function createHistoryRowHandlers({ item, mutate, onError, onNavigated, scope }: HistoryRowProps) {
  function navigate(event: HistoryNavigationEvent): void {
    if (event.button === 0 || event.button === 1) {
      event.preventDefault();
      void navigateHistory(scope, item.id, event.nativeEvent).then(onNavigated).catch(onError);
    }
  }

  function remove(): void {
    void mutate({ action: "remove", id: item.id });
  }

  return { navigate, remove };
}

export function createClearHistoryHandler(mutate: HistoryMutationHandler): () => void {
  return () => {
    void mutate({ action: "clear" });
  };
}