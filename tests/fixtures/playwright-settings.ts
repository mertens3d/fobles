// @source-path [fobles] tests/fixtures/playwright-settings.ts

import path from "node:path";
import { RECORD_VIDEO } from "../settings/settings";
import { TEST_CONSTB } from "./playwright.const";

export const PLAYWRIGHT_SETTINGS = {
  extensionPath: path.resolve("./dist/unpacked"),
  VIEWPORT_SIZE: RECORD_VIDEO ? TEST_CONSTB.VIEWPORT.RECORDING : TEST_CONSTB.VIEWPORT.DEFAULT,
};
