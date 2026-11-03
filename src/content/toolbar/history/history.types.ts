// @source-path [fobles] src/content/toolbar/history/history.types.ts

import type { MouseEvent } from "react";
import type { HistoryChange, HistoryItem, HistoryScope } from "../../../shared/item-history/item-history.types.ts";
import type { FlyoutVisibilityState } from "../shared-flyout/use-flyout-visibility";

export type HistoryMutation = Exclude<HistoryChange, { action: "visit" }>;

export type HistoryMutationHandler = (change: HistoryMutation) => Promise<void>;

export type HistoryErrorHandler = (error: unknown) => void;

export type HistoryScopeState = {
  doc: Document;
  error: string | null;
  scope: HistoryScope | null;
};

export type HistorySnapshot = {
  error: string | null;
  items: HistoryItem[];
  scope: HistoryScope | null;
};

export type HistoryStore = HistorySnapshot & {
  mutate: HistoryMutationHandler;
  reportError: HistoryErrorHandler;
};

export type HistoryTriggerProps = {
  doc: Document;
  historyFlyout: FlyoutVisibilityState;
  onOpen: () => void;
  onToggle: () => void;
};

export type HistoryRowProps = {
  item: HistoryItem;
  mutate: HistoryMutationHandler;
  onError: HistoryErrorHandler;
  onNavigated: () => void;
  scope: HistoryScope;
};

export type HistoryNavigationEvent = MouseEvent<HTMLAnchorElement>;