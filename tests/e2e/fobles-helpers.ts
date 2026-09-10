import { expect, type Frame, type Page } from "./fixtures/playwright";
import { CONST } from "./CONST";
import { openSitecorePage } from "./fixtures/sitecore";
import type { FobleExpectation } from "./scenarios";
import { showMouseMarker, verifyMouseMarker } from "./mouse-proxy";
import { testLogger } from "../testLogger";

export async function findFrameWithSelector(
  page: Page,
  selector: string,
  description: string,
): Promise<Frame> {
  testLogger.step(`Looking for ${description}`);
  for (const frame of page.frames()) {
    const matchCount = await frame.locator(selector).count();
    testLogger.debug(`Checked frame for ${description}`, {
      frameUrl: frame.url(),
      matchCount,
    });
    if (matchCount > 0) {
      testLogger.info(`Found ${description} in frame ${frame.url()}`);
      return frame;
    }
  }
  testLogger.error(`Could not find ${description}`, {
    selector,
    frameUrls: page.frames().map((frame) => frame.url()),
  });
  throw new Error(`Could not find ${description} in any frame: ${selector}`);
}

async function logActivationState(frame: Frame, message: string): Promise<void> {
  const buttonSelector =
    `[${CONST.ATTRIBUTES.FOBLE_BUTTON}='${CONST.ATTRIBUTES.VALUE.PRESENT}']`;
  const wrapperSelector = `[${CONST.ATTRIBUTES.FOBLE_WRAPPER}]`;
  testLogger.step("Read Fobles activation state from page");
  const state = await frame.evaluate(
    ({ buttonSelector: pageButtonSelector, wrapperSelector: pageWrapperSelector }) => ({
      persistedState: localStorage.getItem("fobles_state"),
      fobleButtons: document.querySelectorAll(pageButtonSelector).length,
      fobleWrappers: document.querySelectorAll(pageWrapperSelector).length,
    }),
    { buttonSelector, wrapperSelector },
  );
  testLogger.debug(message, state);
  testLogger.info("Fobles activation state read");
}

export async function activateFobles(
  page: Page,
  scenario: FobleExpectation,
): Promise<Frame> {
  testLogger.step(`Opening ${scenario.url}`);
  await openSitecorePage(page, scenario.url);
  testLogger.step("Verify browser tab URL", {
    expectedToContain: scenario.url,
    actual: page.url(),
  });
  expect(page.url()).toContain(scenario.url);
  testLogger.info(`Navigation finished at ${page.url()}`);

  testLogger.waitFor(
    `tree node #${scenario.treeNodeId}`,
    CONST.TIMEOUTS.DISCOVERY_MS,
  );
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

  testLogger.step(`Find tree node frame #${scenario.treeNodeId}`);
  const treeFrame = await findFrameWithSelector(
    page,
    `#${scenario.treeNodeId}`,
    `tree node #${scenario.treeNodeId}`,
  );
  testLogger.step(`Click tree node #${scenario.treeNodeId}`);
  await treeFrame.locator(`#${scenario.treeNodeId}`).click();

  testLogger.step("Find Fobles feature button frame");
  const foblesFrame = await findFrameWithSelector(
    page,
    CONST.SITECORE.SELECTORS.LBOLT_BUTTON,
    "Fobles LBolt button",
  );
  testLogger.step("Read Fobles activation state");
  await logActivationState(foblesFrame, "[fobles] LBolt setup before click");
  testLogger.step("Show mouse marker on Sitecore page");
  await showMouseMarker(foblesFrame);
  testLogger.waitFor(
    "Fobles LBolt button",
    CONST.TIMEOUTS.MENU_TRIGGER_VISIBLE_MS,
  );
  const featureButton = foblesFrame
    .locator(CONST.SITECORE.SELECTORS.LBOLT_BUTTON)
    .first();
  await expect(featureButton).toBeVisible();
  testLogger.step("Click Fobles feature button");
  await featureButton.click();
  testLogger.info("Fobles feature button clicked");
  testLogger.info(
    `LBolt clicked; persisted state now ${await foblesFrame.evaluate(() => localStorage.getItem("fobles_state"))}`,
  );
  return foblesFrame;
}

export async function activateFoblesForJumpTest(
  page: Page,
  scenario: FobleExpectation,
): Promise<Frame> {
  testLogger.step(`Opening ${scenario.url}`);
  await openSitecorePage(page, scenario.url);
  testLogger.step("Verify browser tab URL", {
    expectedToContain: scenario.url,
    actual: page.url(),
  });
  expect(page.url()).toContain(scenario.url);
  testLogger.info(`Navigation finished at ${page.url()}`);
  testLogger.step("Show mouse marker on Sitecore page");
  await showMouseMarker(page);
  testLogger.step("Verify mouse marker moved");
  await verifyMouseMarker(page);

  testLogger.step("Find Fobles feature button frame");
  const foblesFrame = await findFrameWithSelector(
    page,
    CONST.SITECORE.SELECTORS.LBOLT_BUTTON,
    "Fobles LBolt button",
  );
  await logActivationState(foblesFrame, "[fobles] Jump setup before LBolt click");
  testLogger.step("Show mouse marker in Fobles frame");
  await showMouseMarker(foblesFrame);
  const featureButton = foblesFrame
    .locator(CONST.SITECORE.SELECTORS.LBOLT_BUTTON)
    .first();
  testLogger.waitFor(
    "Fobles LBolt button",
    CONST.TIMEOUTS.MENU_TRIGGER_VISIBLE_MS,
  );
  await expect(featureButton).toBeVisible();
  testLogger.step("Click Fobles feature button");
  await featureButton.click();
  testLogger.info(
    `LBolt clicked for jump test; persisted state now ${await foblesFrame.evaluate(() => localStorage.getItem("fobles_state"))}`,
  );
  return foblesFrame;
}
