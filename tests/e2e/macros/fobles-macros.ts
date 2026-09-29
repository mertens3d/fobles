import type { Frame, Locator, Page } from "@playwright/test";
import { CONST } from "../CONST";
import {
    clickWithMouseMarker,
    moveMouseToPosition,
    resolveCornerPosition,
    ensureMouseMarkerExists,
    highlightLocator,
    moveMouseToBoundingBox,
} from "../mouse-proxy";
import type { CornerPosition, MouseCoordinates } from "../mouse-proxy.types";
import { findFoblesFrame, findFrameWithSelector } from "../frame-finder";
import { walkFrameDocuments } from "../helpers/frame-helpers";
import { showBillboard } from "../billboard";

export async function ClickFoblesMenuButton(
    page: Page) {
    const foblesFrame = await findFoblesFrame(page);
    console.log(`[fobles Macro] ClickFoblesMenuButton`);
    const menuButton = foblesFrame.locator(CONST.SITECORE.SELECTORS.MENU_TRIGGER).first();
    await clickWithMouseMarker(page, menuButton, "Fobles Menu Button");
}


// Idempotent - only clicks the trigger if the flyout isn't already visible, since it's a toggle
// button (clicking it while already open would close it instead).
export async function openQuickMenu(page: Page, foblesFrame: Frame): Promise<void> {
    console.log("[Macro: openQuickMenu] - Start");
    console.log("[fobles] Checking whether the quick menu flyout is already visible");
    const menuFlyout = foblesFrame.locator(CONST.SITECORE.SELECTORS.QUICK_MENU);
    const isOpen =
        (await menuFlyout.getAttribute(CONST.SITECORE.ATTRIBUTES.MENU_VISIBLE).catch(() => null)) === "true";
    if (isOpen) {
        console.log("[fobles] Quick menu already visible - skipping trigger click");
        return;
    }

    await ClickFoblesMenuButton(page);

    console.log(
        `[fobles] Waiting for quick menu flyout's ${CONST.SITECORE.ATTRIBUTES.MENU_VISIBLE} attribute to become "true"`,
    );
    await foblesFrame
        .locator(`${CONST.SITECORE.SELECTORS.QUICK_MENU}[${CONST.SITECORE.ATTRIBUTES.MENU_VISIBLE}="true"]`)
        .waitFor({ state: "attached" });
}


// Drags the toolbar container to a target screen position via a real pointerdown -> pointermove
// -> pointerup sequence - the same gesture wireContainerDragging (src/content/toolbar/drag.ts)
// listens for, so this exercises the actual drag code path rather than just setting the
// container's position directly. Must start the gesture on the grip (not just anywhere in the
// container) since isInteractiveTarget's exclusions aside, any non-grip drag start still works in
// the real UI - the grip is used here only because it's guaranteed to be the non-interactive
// drag handle regardless of which toolbar buttons happen to be showing.
export async function dragToolbarTo(
    page: Page,
    gripLocator: Locator,
    targetPosition: MouseCoordinates,
): Promise<void> {
    console.log("[Macro: dragToolbarTo] - Start");
    //await moveMouseToLocatorCenter(page, gripLocator, "Toolbar grip");
    await moveMouseToBoundingBox(page, gripLocator, "Toolbar grip");
    await page.mouse.down();
    await moveMouseToPosition(page, targetPosition, "Toolbar drag");
    await page.mouse.up();
    // await foblesWaitForTimeout(page, CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS / 2);
}


export async function dragToolbarToCornerLocation(page: Page, cornerPosition: CornerPosition) {
    console.log(`[macro] dragToolbarToCornerLocation ${cornerPosition.corner}`)

    
    await showBillboard(page, `Find Fobles toolbar`);
    const foblesFrame = await findFrameWithSelector(page, CONST.SITECORE.SELECTORS.TOOLBAR_CONTAINER, "Fobles toolbar");
    
    await showBillboard(page, `Find Toolbar grip`);
    const toolbarGrip = foblesFrame.locator(CONST.SITECORE.SELECTORS.TOOLBAR_GRIP).first();
    highlightLocator(toolbarGrip, "Toolbar grip");
    
    console.log(`[macro] Found toolbar grip`);
    
    await dragToolbarTo(page, toolbarGrip, resolveCornerPosition(page, cornerPosition));
    
}




// Clicks the fobles button a specific tree node got decorated with, once LBolt is on. Scoped to
// the tree button's own class plus the target item's id, since the id alone isn't guaranteed
// unique (a field elsewhere could reference the same item) - .first() is safe here regardless,
// since any such duplicate would still navigate to the same item. Dismisses Fobles' own confirm
// dialog afterward, same as clickTreeJump.
export async function clickFoblesTreeButton(
    page: Page,
    itemId: string,
    options?: { turnOffWarning?: boolean; skipDialogDismiss?: boolean },
): Promise<void> {
    console.log("[Macro: clickFoblesTreeButton] - Start");
    const buttonSelector = `${CONST.SITECORE.SELECTORS.TREE_FOBLES_BUTTON}[data-fobles-item-id="${itemId}"]`;
    const treeFrame = await findFrameWithSelector(page, buttonSelector, "tree fobles button", 10_000);
    await ensureMouseMarkerExists(page);
    await ensureMouseMarkerExists(treeFrame);
    const button = treeFrame.locator(buttonSelector).first();
    console.log(`[fobles] Waiting for tree fobles button (selector: ${buttonSelector})`);
    await button.waitFor({ state: "visible" });
    await clickWithMouseMarker(page, button, "Tree fobles button");
    if (!options?.skipDialogDismiss) {
        // await dismissFoblesConfirmDialogIfPresent(page, { turnOffWarning: options?.turnOffWarning ?? true });
        await dismissFoblesConfirmDialogIfPresent(page, { turnOffWarning: true });
    }
}



// Clicks through Fobles' own same-tab navigation confirmation dialog if it's showing (searches
// every frame, since the dialog renders wherever the clicked button lives) - a no-op otherwise.
// turnOffWarning also unchecks the dialog's warning checkbox first (see tests/README.md).
export async function dismissFoblesConfirmDialogIfPresent(
    page: Page,
    options?: { turnOffWarning?: boolean },
): Promise<void> {
    console.log("[Macro: dismissFoblesConfirmDialogIfPresent] - Start");
    console.log(
        `[fobles] Polling up to 3000ms for a visible confirm dialog (selector: ${CONST.SITECORE.SELECTORS.CONFIRM_DIALOG})`,
    );
    const deadline = Date.now() + 3_000;
    do {
       await walkFrameDocuments(page, async (frame) => {
            const dialog = frame.locator(CONST.SITECORE.SELECTORS.CONFIRM_DIALOG).first();
            if (await dialog.isVisible().catch(() => false)) {
                console.log("[fobles] Confirm dialog found - dismissing");
                if (options?.turnOffWarning) {
                    const warningCheckbox = dialog
                        .locator(CONST.SITECORE.SELECTORS.CONFIRM_DIALOG_SETTING)
                        .locator("input[type='checkbox']");
                    await clickWithMouseMarker(page, warningCheckbox, "Turn off same-tab navigation warning");
                }
                await clickWithMouseMarker(
                    page,
                    dialog.locator(CONST.SITECORE.SELECTORS.CONFIRM_DIALOG_CONTINUE),
                    "Confirm dialog Continue",
                );
                return;
            }
        });

        // await foblesWaitForTimeout(page, 150);
    } while (Date.now() < deadline);
    console.log("[fobles] No confirm dialog appeared within 3000ms - treating as not shown");
}

// Self-sufficient variant of clickLboltButton - finds its own fobles frame and LBolt button
// rather than accepting a pre-resolved locator from the caller (see clickTreeJump).
export async function clickLbolt(page: Page): Promise<void> {
    console.log("[Macro: clickLbolt] - Start");
    const foblesFrame = await findFoblesFrame(page);
    await ensureMouseMarkerExists(page);
    await ensureMouseMarkerExists(foblesFrame);
    const lboltButton = foblesFrame.locator(CONST.SITECORE.SELECTORS.LBOLT_BUTTON);
    await clickWithMouseMarker(page, lboltButton, "LBolt button");
}
