import { SITECORE } from "../../constants/sitecore.ts";
import { normalizeHistoryScope } from "../../shared/item-history/item-history-model.ts";

export function resolveStructuralCommandScope(doc: Document, win: Window) {
  const url = new URL(win.location.href);
  const editorPaths = [SITECORE.RELATIVE_PATHS_ENCODED.CONTENT_EDITOR_LEGACY, SITECORE.RELATIVE_PATHS_ENCODED.CONTENT_EDITOR_MODERN];
  if (win.top !== win || !editorPaths.some((path) => url.pathname.toLowerCase().includes(path.toLowerCase()))) {
    throw new TypeError("Structural commands require a top-level Content Editor");
  }
  const queryDatabase = SITECORE.SEARCH_PARAMS.DATABASE_KEYS.map((key) => url.searchParams.get(key)?.trim()).find(Boolean);
  const database = queryDatabase || doc.querySelector<HTMLInputElement>(SITECORE.SELECTORS.DATABASE_INPUT)?.value.trim();
  return normalizeHistoryScope({ origin: url.origin, database });
}