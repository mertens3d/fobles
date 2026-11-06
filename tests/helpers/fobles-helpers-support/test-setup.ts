import { type Frame, type Locator, type Page } from "@playwright/test";
import { TEST_CONST } from "../../constants/TEST_CONST";
import { openContentEditor, openSitecorePage } from "../../fixtures/sitecore";
import { getScRawValuesState, getScStandardFieldsState } from "../../macros/sitecore-macros";
import { clickWithMouseMarker, ensureMouseMarkerExists, moveMouseToDefault } from "../mouse-proxy";
import { findFoblesFrame, findFrameWithSelector } from "../frame-finder";
import { clickLbolt } from "../../macros/fobles-macros";
import type { StrategyScenarioData } from "../../e2e/shared/strategies/support/scenario.types";

export async function setupContentEditorForTestingBasic(page: Page) {
  await openContentEditor(page);
  console.log(`[fobles] Navigation finished at ${page.url()}`);
  await moveMouseToDefault(page);
}

export async function setupParallelContentEditor(
  page: Page,
  foValue: string = TEST_CONST.SITECORE.ITEMS.CONTENT_ITEM_ID,
  foblesEnabled?: boolean,
): Promise<void> {
  await openContentEditor(page, foValue, { normalizeEditorState: false });
  await assertDefaultSitecoreEditorState(page);
  if (foblesEnabled === true) {
    await clickLbolt(page);
  }
  await moveMouseToDefault(page);
}

export async function setupParallelSitecorePage(page: Page, path: string, foblesEnabled?: boolean): Promise<void> {
  await setupParallelContentEditor(page, TEST_CONST.SITECORE.ITEMS.CONTENT_ITEM_ID, foblesEnabled);
  await openSitecorePage(page, path, { normalizeEditorState: false });
}

export async function assertDefaultSitecoreEditorState(page: Page): Promise<void> {
  const rawValues = await getScRawValuesState(page);
  const standardFields = await getScStandardFieldsState(page);
  if (rawValues || standardFields) {
    throw new Error(
      `Parallel Sitecore tests require Raw Values and Standard Fields to be off (Raw Values: ${rawValues ? "on" : "off"}; Standard Fields: ${standardFields ? "on" : "off"}). Run the Sitecore editor-state reset test first.`,
    );
  }
}

export async function setupContentEditorForTesting(page: Page, scenario: StrategyScenarioData) {
  //return { page, fieldTable, locatorFirstResult, STEP_WAIT_MS, step, SCENARIO: scenario , testInfo };

  console.log(`[fobles] Opening strategy item ${scenario.itemId}`);
  await setupParallelContentEditor(page, scenario.itemId, false);
  // &fo=${scenario.itemId}`);
  console.log(`[fobles] Navigation finished at ${page.url()}`);
  await moveMouseToDefault(page);
  // await dragToolbarToCornerLocation(
  //   page,
  //   CONST.TESTING.TOOLBAR_DRAG_POSITIONS.POSITION_1,
  // );
  // await moveMousetoCenterMonitor(page);
  // await dragToolbarToCornerLocation(page, CONST.TESTING.TOOLBAR_DRAG_POSITIONS.DEFAULT);
  // await moveMousetoCenterMonitor(page);
}

// Every ancestor-based attempt to find "the whole section" reliably broke on some field-strategy
// template or another (different templates nest their sections at different DOM depths) - even a
// Playwright chained locator scoped a search back to fieldTable's own subtree despite a leading
// "//", so it couldn't reach a sibling caption div either. fieldTable itself has never failed once
// across any test this session, so use it directly instead of continuing to guess at ancestor
// structure - the trade-off is not showing sibling fields for wider context.
export function getEditorSectionLocator(fieldTable: Locator): Locator {
  return fieldTable;
}

async function logActivationState(frame: Frame, message: string): Promise<void> {
  const state = await frame.evaluate(() => ({
    persistedState: localStorage.getItem("fobles_state"),
    foblesButtons: document.querySelectorAll("[data-is-fobles-button='1']").length,
    foblesWrappers: document.querySelectorAll("[data-fobles-wrapper]").length,
  }));
  console.log(`${message}: ${JSON.stringify(state)}`);
}

export async function activateFobles(page: Page): Promise<Frame> {
  await setupParallelContentEditor(page);

  const treeFrame = await findFrameWithSelector(page, `#${TEST_CONST.SITECORE.DOM.TREE_NODE_IDS.CONTENT}`, activateFobles.name, 30_000);

  // await expect
  //   .poll(
  //     async () => {

  //       for (const frame of page.frames()) {
  //         if ((await frame.locator(`#${TEST_CONST.SITECORE.DOM.TREE_NODE_IDS.CONTENT}`).count()) > 0) {
  //           return true;
  //         }
  //       }
  //       return false;
  //     },
  //     { timeout: 30_000 },
  //   )
  //   .toBe(true);

  // const treeFrame = await findFrameWithSelector(
  //   page,
  //   `#${TEST_CONST.SITECORE.DOM.TREE_NODE_IDS.CONTENT}`,
  //   `tree node #${TEST_CONST.SITECORE.DOM.TREE_NODE_IDS.CONTENT}`,
  // );
  await clickWithMouseMarker(page, treeFrame.locator(`#${TEST_CONST.SITECORE.DOM.TREE_NODE_IDS.CONTENT}`), "Tree node");

  const foblesFrame = await findFoblesFrame(page);
  await logActivationState(foblesFrame, "[fobles] LBolt setup before click");
  await ensureMouseMarkerExists(foblesFrame);
  await clickLbolt(page);
  console.log(`[fobles] persisted state now ${await foblesFrame.evaluate(() => localStorage.getItem("fobles_state"))}`);
  return foblesFrame;
}
