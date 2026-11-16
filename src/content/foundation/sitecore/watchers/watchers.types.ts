// @source-path [fobles] src/content/foundation/sitecore/watchers/watchers.types.ts

import type { HistoryScope, HistoryVisit } from "../../../../shared/item-history/item-history.types.ts";
import type { SITECORE_DOM_WATCHER } from "./watchers.const.ts";

export type WatcherCleanup = () => void;

export type QuickInfoChangeHandler = () => void;

export type SitecoreDocumentSnapshot = { scope?: HistoryScope; scopeError?: unknown; visit?: HistoryVisit };

export type SitecoreDocumentEventType = (typeof SITECORE_DOM_WATCHER.EVENT)[keyof typeof SITECORE_DOM_WATCHER.EVENT];

export type SitecoreDocumentEvent = { snapshot: SitecoreDocumentSnapshot; type: SitecoreDocumentEventType };

export type SitecoreDocumentListener = (event: SitecoreDocumentEvent) => void;

export type SitecoreDocumentWatch = {
  listeners: Set<SitecoreDocumentListener>;
  snapshot: SitecoreDocumentSnapshot;
  stopObserver: WatcherCleanup;
  stopWindowEvents: WatcherCleanup;
};
