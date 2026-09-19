import { expect, type Frame, type Page } from "./fixtures/playwright";
import { openSitecorePage } from "./fixtures/sitecore";
import type { FoblesExpectation } from "./scenarios";
import { showMouseMarker, verifyMouseMarker } from "./mouse-proxy";

export async function findFrameWithSelector(
  page: Page,
  selector: string,
  description: string,
): Promise<Frame> {
  for (const frame of page.frames()) {
    if ((await frame.locator(selector).count()) > 0) return frame;
  }
  throw new Error(`Could not find ${description} in any frame: ${selector}`);
}

async function logActivationState(frame: Frame, message: string): Promise<void> {
  const state = await frame.evaluate(() => ({
    persistedState: localStorage.getItem("fobles_state"),
    foblesButtons: document.querySelectorAll("[data-is-fobles-button='1']").length,
    foblesWrappers: document.querySelectorAll("[data-fobles-wrapper]").length,
  }));
  console.log(`${message}: ${JSON.stringify(state)}`);
}

export async function activateFobles(
  page: Page,
  scenario: FoblesExpectation,
): Promise<Frame> {
  console.log(`[fobles] Opening ${scenario.url}`);
  await openSitecorePage(page, scenario.url);
  console.log(`[fobles] Navigation finished at ${page.url()}`);

  await expect
    .poll(
      async () => {
        for (const frame of page.frames()) {
          if ((await frame.locator(`#${scenario.treeNodeId}`).count()) > 0) {
            return true;
          }
        }
        return false;
      },
      { timeout: 30_000 },
    )
    .toBe(true);

  const treeFrame = await findFrameWithSelector(
    page,
    `#${scenario.treeNodeId}`,
    `tree node #${scenario.treeNodeId}`,
  );
  await treeFrame.locator(`#${scenario.treeNodeId}`).click();

  const foblesFrame = await findFrameWithSelector(
    page,
    "button.fobles-nav-feature-button",
    "Fobles feature button",
  );
  await logActivationState(foblesFrame, "[fobles] LBolt setup before click");
  await showMouseMarker(foblesFrame);
  const featureButton = foblesFrame
    .locator("button.fobles-nav-feature-button")
    .first();
  await expect(featureButton).toBeVisible();
  await featureButton.click();
  console.log(
    `[fobles] LBolt clicked; persisted state now ${await foblesFrame.evaluate(() => localStorage.getItem("fobles_state"))}`,
  );
  return foblesFrame;
}

export async function activateFoblesForJumpTest(
  page: Page,
  scenario: FoblesExpectation,
): Promise<Frame> {
  console.log(`[fobles] Opening ${scenario.url}`);
  await openSitecorePage(page, scenario.url);
  console.log(`[fobles] Navigation finished at ${page.url()}`);
  await showMouseMarker(page);
  await verifyMouseMarker(page);

  const foblesFrame = await findFrameWithSelector(
    page,
    "button.fobles-nav-feature-button",
    "Fobles feature button",
  );
  await logActivationState(foblesFrame, "[fobles] Jump setup before LBolt click");
  await showMouseMarker(foblesFrame);
  const featureButton = foblesFrame
    .locator("button.fobles-nav-feature-button")
    .first();
  await expect(featureButton).toBeVisible();
  await featureButton.click();
  console.log(
    `[fobles] LBolt clicked for jump test; persisted state now ${await foblesFrame.evaluate(() => localStorage.getItem("fobles_state"))}`,
  );
  return foblesFrame;
}
