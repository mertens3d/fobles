import { CONST } from "../CONST";
import type { Page } from "../fixtures/playwright";

export const getLastTwoPathItems = (path?: string): string =>
  (path ?? "").split("/").filter(Boolean).slice(-2).join("/");


export const isContentEditor = (page: Page): boolean =>{
  //return encodeURI(page.url())
  return page.url()
  .includes(CONST.SITECORE.PATHS.CONTENT_EDITOR_ENCODED);
}


export const isAIPage = (page: Page): boolean => {
 return new URL(page.url()).origin
  .includes(CONST.SITECORE.PATHS.SC_AI_DOMAIN);
};

export function sanitizeFileName(value: string): string {
  return value.replace(/[<>:"/\\|?*]/g, "-");
}