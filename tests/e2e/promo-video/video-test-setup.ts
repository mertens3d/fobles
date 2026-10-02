import { type Page } from "../../fixtures/playwright";
import { CONST } from "../../CONST";
import { openSitecorePage } from "../../fixtures/sitecore";

export async function videoTestSetup(page: Page): Promise<void> {
  await openSitecorePage(page, `${CONST.SITECORE.PATHS.CONTENT_EDITOR}&fo=${CONST.SITECORE.ITEMS.FIELD_RENDERER}`);
}
