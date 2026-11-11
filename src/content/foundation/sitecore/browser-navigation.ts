import type { BrowserNavigationOptions } from "./sitecore.types.js";
// @source-path [fobles] src/content/foundation/sitecore/browser-navigation.ts
import { SITECORE } from "../../../constants/sitecore";
import { getCurrentItemId } from "./current-item";
import { extractGuid } from "./guid";

const STATE_KEY = "foblesNavigationItemId";
const POLL_MS = 250;

function readFo(win: Window): string | null {
  return extractGuid(new URL(win.location.href).searchParams.get(SITECORE.SEARCH_PARAMS.FOCUSED_ITEM) ?? "");
}

function itemUrl(win: Window, itemId: string): string {
  const url = new URL(win.location.href);
  url.searchParams.set(SITECORE.SEARCH_PARAMS.FOCUSED_ITEM, itemId);
  return url.href;
}

export function startBrowserNavigation({ doc, navigateToItem }: BrowserNavigationOptions): () => void {
  const win = doc.defaultView;
  if (!win) {
    return () => undefined;
  }
  let applyingPopState = false;
  let lastItemId = getCurrentItemId(doc);
  const initialFo = readFo(win);
  if (lastItemId && initialFo !== lastItemId) {
    win.history.pushState({ ...win.history.state, [STATE_KEY]: lastItemId }, "", itemUrl(win, lastItemId));
  }
  const poll = win.setInterval(() => {
    const itemId = getCurrentItemId(doc);
    if (!itemId) {
      return;
    }
    const focusedItemId = readFo(win);
    if (itemId === lastItemId && focusedItemId === itemId) {
      return;
    }
    lastItemId = itemId;
    if (applyingPopState) {
      applyingPopState = false;
      return;
    }
    win.history.pushState({ ...win.history.state, [STATE_KEY]: itemId }, "", itemUrl(win, itemId));
  }, POLL_MS);
  const handlePopState = (): void => {
    const itemId = readFo(win);
    if (!itemId || itemId === getCurrentItemId(doc)) {
      return;
    }
    applyingPopState = true;
    lastItemId = itemId;
    void navigateToItem(itemId);
  };
  win.addEventListener("popstate", handlePopState);
  return () => {
    win.clearInterval(poll);
    win.removeEventListener("popstate", handlePopState);
  };
}
