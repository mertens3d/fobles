/// <reference types="chrome" />
import type { BrowserContext, Frame, Locator, Page } from "@playwright/test";
import { CONST } from "../CONST";
import {
    clickWithMouseMarker,
    moveMouseToPosition,
    resolveCornerPosition,
    ensureMouseMarkerExists,
    moveMouseToBoundingBox,
} from "../helpers/mouse-proxy";
import type { CornerPosition, MouseCoordinates } from "../helpers/mouse-proxy.types";
import { findFoblesFrame, findFrameWithSelector } from "../helpers/frame-finder";
import { walkFrameDocuments } from "../helpers/frame-helpers";
import { showBillboard } from "../helpers/billboard";
import { expectJumpMenuFlyoutVisible } from "../expect-snippets/expect-snippets";

export async function ClickFoblesJumpButton(
    page: Page) {
    const foblesFrame = await findFoblesFrame(page);
    console.log(`[fobles Macro] ClickFoblesJumpButton`);
    const menuButton = foblesFrame.locator(CONST.FOBLES.SELECTORS.JUMP_MENU_TRIGGER).first();
    await clickWithMouseMarker(page, menuButton, "Fobles Jump Button");
    await expectJumpMenuFlyoutVisible(foblesFrame);
}


// Idempotent - only clicks the trigger if the flyout isn't already visible, since it's a toggle
// button (clicking it while already open would close it instead).
export async function openJumpMenu(page: Page, foblesFrame: Frame): Promise<void> {
    console.log("[Macro: openJumpMenu] - Start");
    console.log("[fobles] Checking whether the jump menu flyout is already visible");
    const menuFlyout = foblesFrame.locator(CONST.FOBLES.SELECTORS.JUMP_MENU_FLYOUT);
    const isOpen =
        (await menuFlyout.getAttribute(CONST.FOBLES.ATTRIBUTES.MENU_VISIBLE).catch(() => null)) === "true";
    if (isOpen) {
        console.log("[fobles] Jump menu already visible - skipping trigger click");
        return;
    }

    // ClickFoblesJumpButton already waits for the flyout to become visible.
    await ClickFoblesJumpButton(page);
}


// Clicks the nth "other menu button" (a plain external-URL jump-menu entry - CONST.FOBLES.LOCATORS.MENU_URL,
// distinct from a tree-jump button, which targets a Sitecore item path) and dismisses Fobles' own
// confirm dialog afterward. Opens the jump menu itself first (idempotent, see openJumpMenu)
// rather than requiring the caller to resolve a frame/open the menu beforehand.
export async function clickJumpMenuUrlButton(page: Page, index: number, label: string): Promise<void> {
    console.log(`[Macro: clickJumpMenuUrlButton] - Start (index: ${index})`);
    const foblesFrame = await findFoblesFrame(page);
    await openJumpMenu(page, foblesFrame);
    const menuButton = foblesFrame.locator(CONST.FOBLES.LOCATORS.MENU_URL).nth(index);
    await menuButton.waitFor({ state: "visible" });
    await clickWithMouseMarker(page, menuButton, `Menu ${label}`);
    await dismissFoblesConfirmDialogIfPresent(page, { turnOffWarning: true });
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
    // await foblesWaitForTimeout(page, CONST.TESTING.SPEED.SETTINGS[CONST.TESTING.SPEED.SELECTED].STEP_WAIT_MS / 2);
}


export async function dragToolbarToCornerLocation(page: Page, cornerPosition: CornerPosition) {
    console.log(`[macro] dragToolbarToCornerLocation ${cornerPosition.corner}`)

    
    // await showBillboard(page, `Find Fobles toolbar`);
    const foblesFrame = await findFrameWithSelector(page, CONST.FOBLES.SELECTORS.TOOLBAR_CONTAINER, "Fobles toolbar");
    
    // await showBillboard(page, `Find Toolbar grip`);
    const toolbarGrip = foblesFrame.locator(CONST.FOBLES.SELECTORS.TOOLBAR_GRIP).first();
    //await highlightClickTarget(toolbarGrip, "Toolbar grip");
    
    // console.log(`[macro] Found toolbar grip`);
    
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
    const buttonSelector = `${CONST.FOBLES.SELECTORS.TREE_FOBLES_BUTTON}[data-fobles-item-id="${itemId}"]`;
    const treeFrame = await findFrameWithSelector(page, buttonSelector, "tree fobles button", 10_000);
    await ensureMouseMarkerExists(page);
    await ensureMouseMarkerExists(treeFrame);
    const button = treeFrame.locator(buttonSelector).first();
    console.log(`[fobles] Waiting for tree fobles button (selector: ${buttonSelector})`);
    await button.waitFor({ state: "visible" });
    await clickWithMouseMarker(page, button, "Tree fobles button");
    if (!options?.skipDialogDismiss) {
        await dismissFoblesConfirmDialogIfPresent(page, { turnOffWarning: options?.turnOffWarning ?? true });
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
        `[fobles] Polling up to 3000ms for a visible confirm dialog (selector: ${CONST.FOBLES.SELECTORS.CONFIRM_DIALOG})`,
    );
    const deadline = Date.now() + 3_000;
    do {
       await walkFrameDocuments(page, async (frame) => {
            const dialog = frame.locator(CONST.FOBLES.SELECTORS.CONFIRM_DIALOG).first();
            if (await dialog.isVisible().catch(() => false)) {
                console.log("[fobles] Confirm dialog found - dismissing");
                if (options?.turnOffWarning) {
                    const warningCheckbox = dialog
                        .locator(CONST.FOBLES.SELECTORS.CONFIRM_DIALOG_SETTING)
                        .locator("input[type='checkbox']");
                    await clickWithMouseMarker(page, warningCheckbox, "Turn off same-tab navigation warning");
                }
                await clickWithMouseMarker(
                    page,
                    dialog.locator(CONST.FOBLES.SELECTORS.CONFIRM_DIALOG_CONTINUE),
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
    const lboltButton = foblesFrame.locator(CONST.FOBLES.SELECTORS.LBOLT_BUTTON);
    await clickWithMouseMarker(page, lboltButton, "LBolt button");
}

// Triggers a chrome.commands shortcut's relay logic directly from the background service worker,
// the same way src/background/index.ts's own onCommand listener would - page.keyboard.press(...)
// does NOT work for this: CDP-synthesized key events never reach Chrome's own global accelerator
// table, so chrome.commands.onCommand never fires no matter what combo is "pressed". This skips
// only that untestable OS-level dispatch step and exercises everything downstream of it for real.
async function triggerExtensionCommand(context: BrowserContext, command: string): Promise<void> {
    console.log(`[Macro: triggerExtensionCommand] - Start (command: ${command})`);
    const [existingWorker] = context.serviceWorkers();
    const worker = existingWorker ?? (await context.waitForEvent("serviceworker"));
    await worker.evaluate((relayedCommand) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            if (activeTab?.id !== undefined) {
                void chrome.tabs.sendMessage(activeTab.id, { action: relayedCommand });
            }
        });
    }, command);
}

// Triggers the chrome.commands "toggle-lbolt" shortcut's relay logic - exercises the hotkey
// wiring (background -> content toolbar-runtime -> toggleLightningBolt) rather than the LBolt
// button's own click handler, and works even when the toolbar itself is hidden.
export async function pressToggleLboltHotkey(context: BrowserContext): Promise<void> {
    console.log("[Macro: pressToggleLboltHotkey] - Start");
    await triggerExtensionCommand(context, CONST.FOBLES.HOTKEYS.TOGGLE_LBOLT_COMMAND);
}

// Triggers the chrome.commands "toggle-fobles" shortcut's relay logic - flips Fobles nav
// visibility, the same as the popup's "Fobles navigation visible" checkbox (see
// showFoblesToolbar/hideFoblesToolbar vs. the nav-visible toggle in src/content/toolbar-runtime.ts).
export async function pressToggleFoblesToolbarHotkey(context: BrowserContext): Promise<void> {
    console.log("[Macro: pressToggleFoblesToolbarHotkey] - Start");
    await triggerExtensionCommand(context, CONST.FOBLES.HOTKEYS.TOGGLE_FOBLES_COMMAND);
}
