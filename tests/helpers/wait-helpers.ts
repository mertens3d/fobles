import type { Page } from "@playwright/test";
import { CONST } from "../CONST";

export async function foblesWaitForTimeout(page: Page, timeout: number, noLog : boolean = false): Promise<void> {
    if (!noLog) console.log(`[fobles] s) foblesWaitForTimeout ${timeout}ms`);
    await page.waitForTimeout(timeout);
    if (!noLog) console.log(`[fobles] e) foblesWaitForTimeout ${timeout}ms`);
    // return new Promise((resolve) => setTimeout(resolve, timeout));
}

export async function humanPause(
    page: Page,
    durationMs: number = CONST.TESTING.HUMAN_PAUSE_MS,
): Promise<void> {
    const isSprintMode = CONST.TESTING.SPEED.SELECTED === "SPRINT";
    if (!isSprintMode) await page.waitForTimeout(durationMs);
}
