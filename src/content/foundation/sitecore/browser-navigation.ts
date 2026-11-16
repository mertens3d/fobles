// @source-path [fobles] src/content/foundation/sitecore/browser-navigation.ts

import type { BrowserNavigationOptions } from "./sitecore.types.js";
import { SITECORE } from "../../../constants/sitecore.const.js";
import { getCurrentItemId } from "./current-item";
import { extractGuid } from "./guid";
import { watchSitecoreDocument } from "./watchers/sitecore-dom-watcher";
import { SITECORE_DOM_WATCHER } from "./watchers/watchers.const";
import type { SitecoreDocumentEvent } from "./watchers/watchers.types";

const STATE_KEY = "foblesNavigationItemId";

function readFo(win: Window): string | null {
  return extractGuid(new URL(win.location.href).searchParams.get(SITECORE.SEARCH_PARAMS.FOCUSED_ITEM) ?? "");
}

function itemUrl(win: Window, itemId: string): string {
  const url = new URL(win.location.href);
  url.searchParams.set(SITECORE.SEARCH_PARAMS.FOCUSED_ITEM, itemId);
  return url.href;
}

function pushItemState(win: Window, itemId: string): void {
  win.history.pushState({ ...win.history.state, [STATE_KEY]: itemId }, "", itemUrl(win, itemId));
}

// Agent: Active-item changes (page load and Content Tree AJAX alike) and back/forward both come from the one Sitecore
// Agent: DOM watcher.
export function startBrowserNavigation({ doc, navigateToItem }: BrowserNavigationOptions): () => void {
  const win = doc.defaultView;
  if (!win) {
    return () => undefined;
  }
  let applyingPopState = false;
  let lastItemId = getCurrentItemId(doc);
  const initialFo = readFo(win);
  if (lastItemId && initialFo !== lastItemId) {
    pushItemState(win, lastItemId);
  }
  const syncActiveItem = (): void => {
    const itemId = getCurrentItemId(doc);
    const changed = Boolean(itemId) && (itemId !== lastItemId || readFo(win) !== itemId);
    if (itemId && changed) {
      lastItemId = itemId;
      if (applyingPopState) {
        applyingPopState = false;
      } else {
        pushItemState(win, itemId);
      }
    }
  };
  const handlePopState = (): void => {
    const itemId = readFo(win);
    if (itemId && itemId !== getCurrentItemId(doc)) {
      applyingPopState = true;
      lastItemId = itemId;
      void navigateToItem(itemId);
    }
  };
  return watchSitecoreDocument(doc, (event: SitecoreDocumentEvent) => {
    if (event.type === SITECORE_DOM_WATCHER.EVENT.POP_STATE) {
      handlePopState();
    } else {
      syncActiveItem();
    }
  });
}
