import type { Page } from "@playwright/test";

export async function foblesWaitForTimeout(page: Page, timeout: number, noLog : boolean = false): Promise<void> {
    if (!noLog) console.log(`[fobles] s) foblesWaitForTimeout ${timeout}ms`);
    await page.waitForTimeout(timeout);
    if (!noLog) console.log(`[fobles] e) foblesWaitForTimeout ${timeout}ms`);
    // return new Promise((resolve) => setTimeout(resolve, timeout));
}
