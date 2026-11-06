import { expect, foblesTest } from "../../../fixtures/playwright";
import { openContentEditor } from "../../../fixtures/sitecore";
import {
  getScRawValuesState,
  getScStandardFieldsState,
  setScRawValuesState,
  setScStandardFieldsState,
} from "../../../macros/sitecore-macros";

foblesTest("resets Sitecore editor settings for strategy tests", async ({ page }) => {
  await openContentEditor(page);
  await setScRawValuesState(page, false);
  await setScStandardFieldsState(page, false);

  expect(await getScRawValuesState(page)).toBe(false);
  expect(await getScStandardFieldsState(page)).toBe(false);
});
