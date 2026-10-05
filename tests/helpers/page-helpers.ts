import { CONST } from "../CONST";
import { normalizePath } from "./path-helpers";

export function isFoblesPage(url: string): boolean {
  const normalizedUrl = normalizePath(url);
  return CONST.TESTING.FOBLES_PAGES.some(
    pageCase => 
      normalizedUrl.includes(normalizePath(pageCase.encodedPath))
  );
}