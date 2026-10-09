import { CONST} from "../../../constants/const";
import { getCurrentItemId } from "./ai-pages";
import { joinJumpFlyoutPath } from "../../../shared/jump-flyout/button-settings";
import { getButtonSetting } from "./button-visibility";
import type { FlyoutOption } from "../../../shared/jump-flyout/jump-flyout.types";

function getCurrentDatabase(doc: Document): string | null {
  const currentUrl = new URL(
    doc.defaultView?.location.href ?? window.location.href,
  );
  for (const queryKey of CONST.SITECORE.SEARCH_PARAMS.DATABASE_KEYS) {
    const database = currentUrl.searchParams.get(queryKey)?.trim();
    if (database) return database;
  }

  const databaseInput = doc.querySelector<HTMLInputElement>(
    CONST.SITECORE.SELECTORS.DATABASE_INPUT,
  );
  if (databaseInput?.value.trim()) return databaseInput.value.trim();

  const contextElement = doc.querySelector<HTMLElement>(
    CONST.SITECORE.SELECTORS.URI_ELEMENT,
  );
  const sitecoreUri = [
    contextElement?.getAttribute("onfocus"),
    contextElement?.getAttribute("onblur"), 
  ].find((value) => value?.includes("sitecore://"));
  return sitecoreUri?.match(/sitecore:\/\/([^/]+)/i)?.[1] ?? null;
}

// A "path" option jumps the content editor tree (fo=), a "url" option navigates directly.
export function buildFlyoutOptionUrl(doc: Document, option: FlyoutOption): string {
  if (option.path !== undefined) {
    const fullPath = joinJumpFlyoutPath(option.path, getButtonSetting(option.id)?.encodedPathSuffix ?? "");
    return `${window.location.origin}${CONST.SITECORE.RELATIVE_PATHS_ENCODED.CONTENT_EDITOR_LEGACY}?sc_bw=1&fo=${fullPath}`;
  }

  const origin = doc.defaultView?.location.origin ?? window.location.origin;
  const url = new URL(option.url ?? "", origin);
  if (option.useCurrentItemId) {
    const itemId = getCurrentItemId(doc);
    const database = getCurrentDatabase(doc);
    if (itemId) {
      url.searchParams.set(CONST.SITECORE.SEARCH_PARAMS.ITEM_ID, itemId);
    }
    if (database) {
      url.searchParams.set(CONST.SITECORE.SEARCH_PARAMS.DATABASE, database);
    }
  }
  return url.toString();
}
