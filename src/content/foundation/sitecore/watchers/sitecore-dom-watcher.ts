// @source-path [fobles] src/content/foundation/sitecore/watchers/sitecore-dom-watcher.ts

import { extensionLog } from "../../../logger.ts";
import { readSitecoreDocumentSnapshot } from "./active-item-reader.ts";
import { observeQuickInfo } from "./quick-info-observer.ts";
import { SITECORE_DOM_WATCHER } from "./watchers.const.ts";
import type { SitecoreDocumentEventType, SitecoreDocumentListener, SitecoreDocumentWatch, WatcherCleanup } from "./watchers.types.ts";

// Agent: The single Sitecore DOM watcher: one Quick Info observer per Content Editor document plus that document's
// Agent: window events (popstate; pagehide ends the watch). Full page loads and Content Tree (AJAX) selections both
// Agent: arrive as the same CHANGE event, so every subscriber reacts to them identically.
const watches = new WeakMap<Document, SitecoreDocumentWatch>();

function notifyListener(listener: SitecoreDocumentListener, watch: SitecoreDocumentWatch, type: SitecoreDocumentEventType): void {
  try {
    listener({ snapshot: watch.snapshot, type });
  } catch (error) {
    extensionLog.error("Sitecore DOM watcher: listener failed", { type, error });
  }
}

function publish(doc: Document, watch: SitecoreDocumentWatch, type: SitecoreDocumentEventType): void {
  watch.snapshot = readSitecoreDocumentSnapshot(doc);
  for (const listener of Array.from(watch.listeners)) {
    notifyListener(listener, watch, type);
  }
}

function stopWatch(doc: Document, watch: SitecoreDocumentWatch): void {
  if (watches.get(doc) === watch) {
    watches.delete(doc);
    watch.listeners.clear();
    watch.stopWindowEvents();
    watch.stopObserver();
  }
}

function listenToWindow(doc: Document, watch: SitecoreDocumentWatch): WatcherCleanup {
  const view = doc.defaultView;
  const onPageHide = (): void => stopWatch(doc, watch);
  const onPopState = (): void => publish(doc, watch, SITECORE_DOM_WATCHER.EVENT.POP_STATE);
  view?.addEventListener(SITECORE_DOM_WATCHER.PAGE_HIDE_EVENT, onPageHide);
  view?.addEventListener(SITECORE_DOM_WATCHER.POP_STATE_EVENT, onPopState);
  return () => {
    view?.removeEventListener(SITECORE_DOM_WATCHER.PAGE_HIDE_EVENT, onPageHide);
    view?.removeEventListener(SITECORE_DOM_WATCHER.POP_STATE_EVENT, onPopState);
  };
}

function startWatch(doc: Document): SitecoreDocumentWatch {
  const watch: SitecoreDocumentWatch = {
    listeners: new Set(),
    snapshot: {},
    stopObserver: () => undefined,
    stopWindowEvents: () => undefined,
  };
  watches.set(doc, watch);
  watch.stopWindowEvents = listenToWindow(doc, watch);
  watch.stopObserver = observeQuickInfo(doc, () => publish(doc, watch, SITECORE_DOM_WATCHER.EVENT.CHANGE));
  return watch;
}

// Agent: The listener receives a CHANGE event with the current snapshot synchronously, then one CHANGE per debounced
// Agent: Quick Info or database change and one POP_STATE per browser history traversal. Snapshots are not
// Agent: deduplicated here; subscribers keep their own "last seen" rules.
export function watchSitecoreDocument(doc: Document, listener: SitecoreDocumentListener): WatcherCleanup {
  const watch = watches.get(doc) ?? startWatch(doc);
  watch.snapshot = readSitecoreDocumentSnapshot(doc);
  watch.listeners.add(listener);
  notifyListener(listener, watch, SITECORE_DOM_WATCHER.EVENT.CHANGE);
  return () => {
    watch.listeners.delete(listener);
    if (watch.listeners.size === 0) {
      stopWatch(doc, watch);
    }
  };
}
