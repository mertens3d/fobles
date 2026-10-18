import { type Page } from "../../fixtures/playwright";
import { TEST_CONST } from "../../TEST_CONST";
import { openSitecorePage } from "../../fixtures/sitecore";

export async function videoTestSetup(page: Page): Promise<void> {
  await openSitecorePage(page, `${TEST_CONST.SITECORE.PATHS.CONTENT_EDITOR_BW_ENCODED}&fo=${TEST_CONST.SITECORE.ITEMS.FIELD_RENDERER}`);
}
