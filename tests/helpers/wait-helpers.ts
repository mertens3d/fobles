import { expect, type Locator, type Page } from "../fixtures/playwright";
import { CONST } from "../CONST";

export async function pauseForBrowser(page: Page, timeout: number, noLog: boolean = false): Promise<void> {
    if (!noLog) console.log(`[fobles] s) pauseForBrowser ${timeout}ms`);
    await page.waitForTimeout(timeout);
    if (!noLog) console.log(`[fobles] e) pauseForBrowser ${timeout}ms`);
    // return new Promise((resolve) => setTimeout(resolve, timeout));
}

export async function pauseForHuman(
    page: Page,
    durationMs: number = CONST.TESTING.HUMAN_PAUSE_MS,
    noLog: boolean = false,
): Promise<void> {
    const isSprintMode = CONST.TESTING.SPEED.SELECTED === "SPRINT";
    if (!isSprintMode) {
        if (!noLog) {
            console.log(`[fobles] humanPause for ${durationMs}ms`);
        }
        await page.waitForTimeout(durationMs);
    }
}

// Polls up to timeoutMs for locator to attach, failing fast the instant it does rather than
// blindly sleeping out the full window - use for "this must never appear" assertions.
export async function expectNeverAppears(
    locator: Locator,
    timeoutMs: number,
    message: string,
): Promise<void> {
    const appeared = await locator
        .waitFor({ state: "attached", timeout: timeoutMs })
        .then(() => true)
        .catch(() => false);
    expect(appeared, message).toBe(false);
}
