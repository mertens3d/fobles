import type { Page } from "@playwright/test";
import { CONST } from "../CONST";
import { humanPause } from "./wait-helpers";

const foregroundPages = new WeakMap<object, Page>();

// SPRINT mode has no human watching (see humanPause) - skip the tab flip entirely there rather
// than just skipping the post-switch pause, since nothing benefits from the switch itself either.
export async function bringPageToFront(
  page: Page,
  pauseMs?: number,
): Promise<void> {
  if (CONST.TESTING.SPEED.SELECTED !== "SPRINT") {
    const context = page.context();
    const switchedPage = foregroundPages.get(context) !== page;
    await page.bringToFront();
    foregroundPages.set(context, page);
    if (switchedPage) {
      await humanPause(page, pauseMs);
    }
  }
}
