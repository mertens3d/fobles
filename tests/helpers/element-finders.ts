import type { Page, Locator } from "@playwright/test";
import { openJumpFlyout } from "../macros/fobles-macros";
import { findFoblesFrame } from "./frame-finder";

export async function getTreeJumpFlyoutButton(page: Page, treeJumpPath: string): Promise<Locator> {
    console.log(`[Macro: getTreeJumpFlyoutButton] - Start (treeJumpPath: ${treeJumpPath})`);
    const foblesFrame = await findFoblesFrame(page);
    await openJumpFlyout(page, foblesFrame);
    //const jumpFlyoutButton = foblesFrame.locator(CONST.FOBLES.LOCATORS.DATA_PAGE_JUMP_URL).nth(index);
    const treeJumpFlyoutButton = foblesFrame.locator(`[data-fobles-tree-jump-path="${treeJumpPath}"]`);

    await treeJumpFlyoutButton.waitFor({ state: "visible" });
    return treeJumpFlyoutButton;
}

// Clicks the nth "other jump flyout button" (a plain external-URL jump-flyout entry - CONST.FOBLES.LOCATORS.MENU_URL,
// distinct from a tree-jump button, which targets a Sitecore item path) and dismisses Fobles' own
// confirm dialog afterward. Opens the jump flyout itself first (idempotent, see openJumpFlyout)
// rather than requiring the caller to resolve a frame/open the jump flyout beforehand.

export async function getPageJumpFlyoutButton(page: Page, pageJumpUrl: string): Promise<Locator> {
    console.log(`[Macro: getPageJumpFlyoutUrlButton] - Start (pageJumpUrl: ${pageJumpUrl})`);
    const foblesFrame = await findFoblesFrame(page);
    await openJumpFlyout(page, foblesFrame);
    //const jumpFlyoutButton = foblesFrame.locator(CONST.FOBLES.LOCATORS.DATA_PAGE_JUMP_URL).nth(index);
    const jumpFlyoutButton = foblesFrame.locator(`[data-fobles-page-jump-url="${pageJumpUrl}"]`);

    await jumpFlyoutButton.waitFor({ state: "visible" });
    return jumpFlyoutButton;
    // await clickWithMouseMarker(page, jumpFlyoutButton, `Menu ${label}`);
    // await dismissFoblesConfirmDialogIfPresent(page, { turnOffWarning: true });
}
