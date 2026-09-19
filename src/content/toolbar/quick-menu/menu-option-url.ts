import { SELECTORS } from "../../constants";
import { SITECORE } from "../../sitecore";
import { getCurrentItemId } from "../../features/quick-menu/ai-pages";
import { joinQuickMenuPath } from "../../../shared/quick-menu/button-settings";
import { getButtonSetting } from "./button-visibility";
import type { MenuOption } from "../../../shared/quick-menu/menu.types";

function getCurrentDatabase(doc: Document): string | null {
  const currentUrl = new URL(
    doc.defaultView?.location.href ?? window.location.href,
  );
  for (const queryKey of SITECORE.QUERY_PARAMS.DATABASE_KEYS) {
    const database = currentUrl.searchParams.get(queryKey)?.trim();
    if (database) return database;
  }

  const databaseInput = doc.querySelector<HTMLInputElement>(
    SITECORE.SELECTORS.DATABASE_INPUT,
  );
  if (databaseInput?.value.trim()) return databaseInput.value.trim();

  const contextElement = doc.querySelector<HTMLElement>(
    SITECORE.SELECTORS.URI_ELEMENT,
  );
  const sitecoreUri = [
    contextElement?.getAttribute("onfocus"),
    contextElement?.getAttribute("onblur"),
  ].find((value) => value?.includes("sitecore://"));
  return sitecoreUri?.match(/sitecore:\/\/([^/]+)/i)?.[1] ?? null;
}

// A "path" option jumps the content editor tree (fo=), a "url" option navigates directly.
export function buildMenuOptionUrl(doc: Document, option: MenuOption): string {
  if (option.path !== undefined) {
    const fullPath = joinQuickMenuPath(option.path, getButtonSetting(option.id)?.pathSuffix ?? "");
    return `${window.location.origin}${SITECORE.RELATIVE_PATHS.CONTENT_EDITOR}?sc_bw=1&fo=${encodeURI(fullPath)}`;
  }

  const origin = doc.defaultView?.location.origin ?? window.location.origin;
  const url = new URL(option.url ?? "", origin);
  if (option.useCurrentItemId) {
    const itemId = getCurrentItemId(doc);
    const database = getCurrentDatabase(doc);
    if (itemId) url.searchParams.set(SITECORE.QUERY_PARAMS.ITEM_ID, itemId);
    if (database) url.searchParams.set(SITECORE.QUERY_PARAMS.DATABASE, database);
  }
  return url.toString();
}
