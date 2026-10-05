import { type Frame, type Locator, type Page } from "../fixtures/playwright";
import { CONST } from "../CONST";
import { getTestEnvironment } from "../fixtures/environment";
import {
  clickWithMouseMarker,
  ensureMouseMarkerExists,
} from "../helpers/mouse-proxy";
import {
  findFoblesFrame,
  findFrameWithSelector,
} from "../helpers/frame-finder";
import {
  dismissFoblesConfirmDialogIfPresent,
  openJumpFlyout,
} from "./fobles-macros";
import { pauseForHuman } from "../helpers/wait-helpers";

// Reusable stock Sitecore Content Editor UI interactions (ribbon tabs, galleries), plus Fobles'
// own toolbar toggle since it's just as much a canned click sequence any spec reuses - kept
// separate from fobles-helpers.ts (which is about asserting Fobles' resulting behavior, not about
// how to reach the UI that triggers it) and out of any one spec file.

export async function clickScRibbonTab(
  page: Page,
  frame: Frame,
  accessKey: string,
): Promise<void> {
  console.log("[Macro: clickScRibbonTab] - Start");
  const scRibbonTab = frame.locator(`a[accesskey="${accessKey}"]`).first();
  await clickWithMouseMarker(
    page,
    scRibbonTab,
    `ribbon tab (${accessKey})`,
  );
}

// Switches to Content Editor's "Content" tab if it's showing - idempotent no-op when the item
// has no tabs, or the Content tab is already selected. Finds its own fobles frame fresh (see
// clickTreeJump) rather than accepting one from the caller.
export async function clickContentTabIfPresent(page: Page): Promise<void> {
  console.log("[Macro: clickContentTabIfPresent] - Start");
  const foblesFrame = await findFoblesFrame(page);
  const contentTab = foblesFrame
    .locator(CONST.SITECORE.SELECTORS.CONTENT_TAB)
    .first();

  console.log(
    `[fobles] Checking for a visible Content tab (selector: ${CONST.SITECORE.SELECTORS.CONTENT_TAB})`,
  );
  if (await contentTab.isVisible().catch(() => false)) {
    // await moveMouseToLocator(page, contentTab,  "Content Editor tab header");
    await clickWithMouseMarker(page, contentTab, "Content Editor tab header");
  }
}

// Opens the jump flyout (if not already open) and clicks the tree jump button for the given path
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
  await ensureMouseMarkerExists(page);
  await ensureMouseMarkerExists(foblesFrame);
  await openJumpFlyout(page, foblesFrame);
  const jumpButtonSelector = `[data-fobles-tree-jump-path="${path}"]`;
  const jumpButton = foblesFrame.locator(jumpButtonSelector);
  console.log(
    `[fobles] Waiting for tree jump button (selector: ${jumpButtonSelector})`,
  );
  await jumpButton.waitFor({ state: "visible" });

  const opensNewTab = options?.modifiers?.includes("Control") ?? false;
  const newTabPromise = opensNewTab
    ? page.context().waitForEvent("page")
    : null;
  await clickWithMouseMarker(
    page,
    jumpButton,
    path,
    options?.modifiers ? { modifiers: options.modifiers } : undefined,
  );

  if (newTabPromise) return { jumpButton, newTab: await newTabPromise };
  if (!options?.skipDialogDismiss) {
    await dismissFoblesConfirmDialogIfPresent(page, { turnOffWarning: options?.turnOffWarning ?? true });
  }
  return { jumpButton, newTab: null };
}

// Clicks the Content tab (if present) then triple-clicks to select the Item path value in Quick
// Info - highlights to a viewer watching the recording which item the page just navigated to.
// Finds its own fobles frame fresh (see clickTreeJump) rather than accepting one from the caller.
export async function highlightQuickInfoPath(page: Page): Promise<void> {
  console.log("[Macro: highlightQuickInfoPath] - Start");
  const foblesFrame = await findFoblesFrame(page);
  await ensureMouseMarkerExists(page);
  await ensureMouseMarkerExists(foblesFrame);
  await clickContentTabIfPresent(page);

  const itemPathRow = foblesFrame
    .locator(`${CONST.SITECORE.SELECTORS.QUICK_INFO_TABLE} tr`, {
      hasText: CONST.SITECORE.LABELS.ITEM_PATH,
    })
    .first();
  const itemPathValue = itemPathRow.locator("input").first();
  console.log(
    `[fobles] Waiting for the Item path value (selector: ${CONST.SITECORE.SELECTORS.QUICK_INFO_TABLE} tr input, text: "${CONST.SITECORE.LABELS.ITEM_PATH}")`,
  );
  await itemPathValue.waitFor({
    state: "visible",
    timeout: CONST.TESTING.TIMEOUTS.QUICK_INFO_VISIBLE_MS,
  });
  await clickWithMouseMarker(page, itemPathValue, "Item path", {
    clickCount: 3,
    corner: "top-left",
  });
}

// Opens Content Editor's "Links" gallery (Navigate ribbon tab > Links button), which lists every
// item referencing the open item and every item it refers to in turn. Sitecore loads the gallery
// into its own dynamically created frame (see the button's showGallery(...) target), not the
// ribbon's own frame, so the panel is found by searching every frame on the page rather than
// assuming it lands in `frame`. Returns the gallery panel locator once it's visible.
export async function openScLinksGallery(
  page: Page,
  frame: Frame,
): Promise<Locator> {
  console.log(`[Macro: ${openScLinksGallery.name}] - Start`);
  await clickScRibbonTab(page, frame, "N");
  await clickWithMouseMarker(
    page,
    frame
      .locator(
        CONST.SITECORE.SELECTORS.RIBBON_TAB.NAVIGATE.LINKS_GALLERY_BUTTON,
      )
      .first(),
    "Links gallery button",
  );

  const galleryFrame = await findFrameWithSelector(
    page,
    CONST.SITECORE.SELECTORS.RIBBON_TAB.NAVIGATE.LINKS,
    "Links gallery panel",
    10_000,
  );
  const linksPanel = galleryFrame.locator(
    CONST.SITECORE.SELECTORS.RIBBON_TAB.NAVIGATE.LINKS,
  );
  await linksPanel.waitFor({ state: "visible" });
  return linksPanel;
}

// Scrolls the tree panel (a native Sitecore element, present before Fobles/LBolt ever runs) to a
// fixed scrollTop - called before clickLbolt so the target node is already in view once Fobles
// decorates it, rather than trying to scroll to the fobles button itself (which doesn't exist
// until after LBolt is clicked).
export async function scrollTreeContainer(
  page: Page,
  scrollTopPx: number,
): Promise<void> {
  console.log("[Macro: scrollTreeContainer] - Start");
  const containerSelector = "#ContentTreeInnerPanel";
  const treeFrame = await findFrameWithSelector(
    page,
    containerSelector,
    "tree scroll container",
    10_000,
  );
  const container = treeFrame.locator(containerSelector).first();
  await container.evaluate((el, top) => {
    el.scrollTop = top;
  }, scrollTopPx);
  
  await pauseForHuman(page, 600);
}

// Sets the scContentEditorFoldersWidth cookie Sitecore's tree/editor splitter reads its width
// from on page load - call before navigating, since Sitecore only reads it at load time (setting
// it after the fact and dragging the splitter live fights the splitter's own internal state).
export async function setTreePanelWidth(
  page: Page,
  widthPx: number,
): Promise<void> {
  console.log("[Macro: setTreePanelWidth] - Start");
  const { baseUrl } = getTestEnvironment();
  await page
    .context()
    .addCookies([
      {
        name: "scContentEditorFoldersWidth",
        value: String(widthPx),
        url: baseUrl,
      },
    ]);
}

export async function ceRibbonOpenHome(page: Page) {
  await findFrameWithSelector(
    page,
    'a[accesskey="H"]',
    "Content Editor Home ribbon tab",
  )
    .then((frame) => clickScRibbonTab(page, frame, "H"))
    .catch(() => undefined);
}
