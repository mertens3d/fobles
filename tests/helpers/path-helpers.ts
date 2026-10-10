import { CONST } from "../CONST";
import type { Page } from "../fixtures/playwright";

export const getLastTwoPathItems = (path?: string): string =>
  (path ?? "").split("/").filter(Boolean).slice(-2).join("/");

export const isContentEditor = (page: Page): boolean => {
  //return encodeURI(page.url())
  return normalizePath(page.url())
    .includes(normalizePath(CONST.SITECORE.PATHS.CONTENT_EDITOR_ENCODED));
}

export function normalizeFoValueForCompare(value: string): string {
  return value.replace(/[{}]/g, "").toUpperCase();
}

export const isAIPage = (page: Page): boolean => {
  return new URL(page.url()).origin
    .includes(CONST.SITECORE.PATHS.SC_AI_DOMAIN);
};

export function sanitizeFileName(value: string): string {
  return value.replace(/[<>:"/\\|?*]/g, "-");
}

export function normalizePath(encodedUrl: string): string {
  return new URL(encodedUrl, "https://dummy").pathname.toLowerCase();
}

export type SitecoreSearchParams = {
  fo: string | null;
};

export function getScSearchParams(url: URL): SitecoreSearchParams {
  const result: SitecoreSearchParams = {
    fo: url.searchParams.get(CONST.SITECORE.SEARCH_PARAMS.FO),
  };

  return result;
}