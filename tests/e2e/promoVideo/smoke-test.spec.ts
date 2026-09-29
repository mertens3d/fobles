import { test } from "../fixtures/playwright";
import { moveMouseToPosition, ensureMouseMarkerExists, verifyMouseMarker } from "../mouse-proxy";

// Isolates "does video recording plus the mouse marker actually work at all" from every other
// moving part (Sitecore login, real page navigations, extension activation) - run this first if a
// real promoVideo recording looks broken (no marker, odd jumps, no video file), to rule out an
// environment/security-software issue before debugging the full spec. No Sitecore login needed -
// deliberately not run alongside 00-session-start/zz-session-end (see the dedicated npm script).
test.describe("Promo video: smoke test", () => {
  test("marker shows and moves smoothly on a plain page", async ({ page }) => {
    await page.goto(
      "data:text/html,<html><body style='height:1400px;background:%23f2f2f2;font-family:sans-serif'><h1 style='margin:500px 0 0 400px'>Fobles smoke test</h1></body></html>",
    );
    await ensureMouseMarkerExists(page);
    await verifyMouseMarker(page);

    const mousePosition = { x: 100, y: 100 };
    
    await moveMouseToPosition(page, { x: 700, y: 300 },  "Smoke test move 1");
    await foblesWaitForTimeout(page, 1_000);
    await moveMouseToPosition(page, { x: 250, y: 600 },  "Smoke test move 2");
    await foblesWaitForTimeout(page, 1_000);
    await moveMouseToPosition(page, { x: 900, y: 800 },  "Smoke test move 3");
    await foblesWaitForTimeout(page, 1_000);
  });
});
