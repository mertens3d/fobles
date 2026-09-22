import { type Frame, type Locator, type Page } from "./fixtures/playwright";
import { CONST } from "./CONST";
import { getTestEnvironment } from "./fixtures/environment";
import {
  clickWithMouseMarker,
  getLastKnownMousePosition,
  moveMouseTo,
  moveMouseToPosition,
  showMouseMarker,
  type MousePosition,
} from "./mouse-proxy";
import { findFoblesFrame, findFrameWithSelector } from "./frame-finder";

// Reusable stock Sitecore Content Editor UI interactions (ribbon tabs, galleries), plus Fobles'
// own toolbar toggle since it's just as much a canned click sequence any spec reuses - kept
// separate from fobles-helpers.ts (which is about asserting Fobles' resulting behavior, not about
// how to reach the UI that triggers it) and out of any one spec file.

export async function clickRibbonTab(page: Page, frame: Frame, accessKey: string): Promise<void> {
  console.log("[Macro: clickRibbonTab] - Start");
  await clickWithMouseMarker(page, frame.locator(`a[accesskey="${accessKey}"]`).first(), `ribbon tab (${accessKey})`);
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
  const menuButton = foblesFrame.locator(CONST.SITECORE.SELECTORS.MENU_TRIGGER);
  console.log(`[fobles] Looking for menu trigger (selector: ${CONST.SITECORE.SELECTORS.MENU_TRIGGER})`);
  await clickWithMouseMarker(page, menuButton, "Tree jump menu");
  console.log(
    `[fobles] Waiting for quick menu flyout's ${CONST.SITECORE.ATTRIBUTES.MENU_VISIBLE} attribute to become "true"`,
  );
  await foblesFrame
    .locator(`${CONST.SITECORE.SELECTORS.QUICK_MENU}[${CONST.SITECORE.ATTRIBUTES.MENU_VISIBLE}="true"]`)
    .waitFor({ state: "attached" });
}

// Opens the quick menu (if not already open) and clicks the tree jump button for the given path
// (see CONST.SITECORE.TREE_JUMP_PATHS - never a raw path literal at the call site). Finds its own
// fobles frame fresh rather than accepting one from the caller, since a frame handed in from an
// earlier navigation/activation step can go stale by the time this actually runs. Dismisses
// Fobles' own confirm dialog afterward unless modifiers includes "Control" (a Ctrl+click opens a
// new tab and never shows that dialog) or skipDialogDismiss is set (for a caller that wants to
// inspect/interact with the dialog itself, e.g. asserting whether it appeared at all).
// turnOffWarning is passed straight through to that dismiss. Returns the new tab for a Ctrl+click,
// or null for a plain click.
export async function clickTreeJump(
  page: Page,
  path: string,
  options?: {
    modifiers?: Array<"Alt" | "Control" | "Meta" | "Shift">;
    turnOffWarning?: boolean;
    skipDialogDismiss?: boolean;
  },
): Promise<{ jumpButton: Locator; newTab: Page | null }> {
  console.log("[Macro: clickTreeJump] - Start");
  const foblesFrame = await findFoblesFrame(page);
  await showMouseMarker(page);
  await showMouseMarker(foblesFrame);
  await openQuickMenu(page, foblesFrame);
  const jumpButtonSelector = `[data-fobles-tree-jump-path="${path}"]`;
  const jumpButton = foblesFrame.locator(jumpButtonSelector);
  console.log(`[fobles] Waiting for tree jump button (selector: ${jumpButtonSelector})`);
  await jumpButton.waitFor({ state: "visible" });

  const opensNewTab = options?.modifiers?.includes("Control") ?? false;
  const newTabPromise = opensNewTab ? page.context().waitForEvent("page") : null;
  await clickWithMouseMarker(page, jumpButton, path, options?.modifiers ? { modifiers: options.modifiers } : undefined);

  if (newTabPromise) return { jumpButton, newTab: await newTabPromise };
  if (!options?.skipDialogDismiss) {
    await dismissFoblesConfirmDialogIfPresent(page, { turnOffWarning: options?.turnOffWarning });
  }
  return { jumpButton, newTab: null };
}

// Clicks the Content tab (if present) then triple-clicks to select the Item path value in Quick
// Info - highlights to a viewer watching the recording which item the page just navigated to.
// Finds its own fobles frame fresh (see clickTreeJump) rather than accepting one from the caller.
export async function highlightQuickInfoPath(page: Page): Promise<void> {
  console.log("[Macro: highlightQuickInfoPath] - Start");
  const foblesFrame = await findFoblesFrame(page);
  await showMouseMarker(page);
  await showMouseMarker(foblesFrame);
  const contentTab = foblesFrame
    .locator(CONST.SITECORE.SELECTORS.CONTENT_TAB, { hasText: CONST.SITECORE.LABELS.CONTENT_TAB })
    .first();
  console.log(`[fobles] Checking for a visible Content tab (selector: ${CONST.SITECORE.SELECTORS.CONTENT_TAB})`);
  if (await contentTab.isVisible().catch(() => false)) {
    await clickWithMouseMarker(page, contentTab, "Content Editor tab header");
  }

  const itemPathRow = foblesFrame
    .locator(`${CONST.SITECORE.SELECTORS.QUICK_INFO_TABLE} tr`, { hasText: CONST.SITECORE.LABELS.ITEM_PATH })
    .first();
  const itemPathValue = itemPathRow.locator("input").first();
  console.log(
    `[fobles] Waiting for the Item path value (selector: ${CONST.SITECORE.SELECTORS.QUICK_INFO_TABLE} tr input, text: "${CONST.SITECORE.LABELS.ITEM_PATH}")`,
  );
  await itemPathValue.waitFor({ state: "visible" });
  await clickWithMouseMarker(page, itemPathValue, "Item path", { clickCount: 3, corner: "top-left" });
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
    for (const frame of page.frames()) {
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
    }
    await page.waitForTimeout(150);
  } while (Date.now() < deadline);
  console.log("[fobles] No confirm dialog appeared within 3000ms - treating as not shown");
}

// Opens Content Editor's "Links" gallery (Navigate ribbon tab > Links button), which lists every
// item referencing the open item and every item it refers to in turn. Sitecore loads the gallery
// into its own dynamically created frame (see the button's showGallery(...) target), not the
// ribbon's own frame, so the panel is found by searching every frame on the page rather than
// assuming it lands in `frame`. Returns the gallery panel locator once it's visible.
export async function openLinksGallery(page: Page, frame: Frame): Promise<Locator> {
  console.log("[Macro: openLinksGallery] - Start");
  await clickRibbonTab(page, frame, "N");
  await clickWithMouseMarker(
    page,
    frame.locator('a[title="Show referenced and referred items."]').first(),
    "Links gallery button",
  );

  const galleryFrame = await findFrameWithSelector(page, "#Links", "Links gallery panel", 10_000);
  const linksPanel = galleryFrame.locator("#Links");
  await linksPanel.waitFor({ state: "visible" });
  return linksPanel;
}

// Clicks the LBolt button via clickWithMouseMarker, which already pauses afterward so the click's
// effect is visible on screen before the next interaction fires.
export async function clickLboltButton(
  page: Page,
  lboltButton: Locator,
): Promise<void> {
  console.log("[Macro: clickLboltButton] - Start");
  await clickWithMouseMarker(page, lboltButton, "LBolt button");
}

// Self-sufficient variant of clickLboltButton - finds its own fobles frame and LBolt button
// rather than accepting a pre-resolved locator from the caller (see clickTreeJump).
export async function clickLbolt(page: Page): Promise<void> {
  console.log("[Macro: clickLbolt] - Start");
  const foblesFrame = await findFoblesFrame(page);
  await showMouseMarker(page);
  await showMouseMarker(foblesFrame);
  const lboltButton = foblesFrame.locator(CONST.SITECORE.SELECTORS.LBOLT_BUTTON);
  await clickWithMouseMarker(page, lboltButton, "LBolt button");
}

// Scrolls the tree panel (a native Sitecore element, present before Fobles/LBolt ever runs) to a
// fixed scrollTop - called before clickLbolt so the target node is already in view once Fobles
// decorates it, rather than trying to scroll to the fobles button itself (which doesn't exist
// until after LBolt is clicked).
export async function scrollTreeContainer(page: Page, scrollTopPx: number): Promise<void> {
  console.log("[Macro: scrollTreeContainer] - Start");
  const containerSelector = "#ContentTreeInnerPanel";
  const treeFrame = await findFrameWithSelector(page, containerSelector, "tree scroll container", 10_000);
  const container = treeFrame.locator(containerSelector).first();
  await container.evaluate((el, top) => {
    el.scrollTop = top;
  }, scrollTopPx);
  await page.waitForTimeout(600);
}

// Sets the scContentEditorFoldersWidth cookie Sitecore's tree/editor splitter reads its width
// from on page load - call before navigating, since Sitecore only reads it at load time (setting
// it after the fact and dragging the splitter live fights the splitter's own internal state).
export async function setTreePanelWidth(page: Page, widthPx: number): Promise<void> {
  console.log("[Macro: setTreePanelWidth] - Start");
  const { baseUrl } = getTestEnvironment();
  await page.context().addCookies([
    { name: "scContentEditorFoldersWidth", value: String(widthPx), url: baseUrl },
  ]);
}

// Clicks the fobles button a specific tree node got decorated with, once LBolt is on. Scoped to
// the tree button's own class plus the target item's id, since the id alone isn't guaranteed
// unique (a field elsewhere could reference the same item) - .first() is safe here regardless,
// since any such duplicate would still navigate to the same item. Dismisses Fobles' own confirm
// dialog afterward, same as clickTreeJump.
export async function clickTreeFoblesButton(
  page: Page,
  itemId: string,
  options?: { turnOffWarning?: boolean; skipDialogDismiss?: boolean },
): Promise<void> {
  console.log("[Macro: clickTreeFoblesButton] - Start");
  const buttonSelector = `${CONST.SITECORE.SELECTORS.TREE_FOBLES_BUTTON}[data-fobles-item-id="${itemId}"]`;
  const treeFrame = await findFrameWithSelector(page, buttonSelector, "tree fobles button", 10_000);
  await showMouseMarker(page);
  await showMouseMarker(treeFrame);
  const button = treeFrame.locator(buttonSelector).first();
  console.log(`[fobles] Waiting for tree fobles button (selector: ${buttonSelector})`);
  await button.waitFor({ state: "visible" });
  await clickWithMouseMarker(page, button, "Tree fobles button");
  if (!options?.skipDialogDismiss) {
    await dismissFoblesConfirmDialogIfPresent(page, { turnOffWarning: options?.turnOffWarning });
  }
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
  grip: Locator,
  targetPosition: MousePosition,
): Promise<void> {
  console.log("[Macro: dragToolbarTo] - Start");
  const mousePosition: MousePosition = getLastKnownMousePosition();
  await moveMouseTo(page, grip, mousePosition, "Toolbar grip");
  await page.mouse.down();
  await moveMouseToPosition(page, targetPosition, mousePosition, "Toolbar drag");
  await page.mouse.up();
  await page.waitForTimeout(CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS);
}
