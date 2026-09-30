import type { Page } from "@playwright/test";
import { humanPause } from "./wait-helpers";

const foregroundPages = new WeakMap<object, Page>();

export async function bringPageToFront(
  page: Page,
  pauseMs?: number,
): Promise<void> {
  const context = page.context();
  const switchedPage = foregroundPages.get(context) !== page;
  await page.bringToFront();
  foregroundPages.set(context, page);
  if (switchedPage) await humanPause(page, pauseMs);
}
