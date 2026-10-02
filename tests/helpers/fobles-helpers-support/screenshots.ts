import { type Frame, type Locator, type Page, type TestInfo } from "@playwright/test";
import { CONST } from "../../CONST";
import { CAPTURE_STEP_SCREENSHOTS } from "../../settings/settings";
import { highlightScreenShot } from "../mouse-proxy-support/mouse-interactions";

export type Screenshottable = Pick<Locator, "screenshot">;

// toHaveScreenshot() only attaches its comparison images to the test result on a mismatch/missing
// baseline - a clean pass produces no attachment for the report to link to. Attach one ourselves
// so the report always has a link, pass or fail. Must use `path` (not `body`) - the reporter links
// to attachments by file path, and body-only attachments never get one.
export async function attachLocatorScreenshot(
  testInfo: TestInfo,
  target: Locator,
  name: string,
  options?: { mask?: Locator[] },
): Promise<void> {
  if (!CAPTURE_STEP_SCREENSHOTS) return;
  await highlightScreenShot( target,`${name} - ${attachLocatorScreenshot.name}`);
  const filePath = testInfo.outputPath(name);
  const { hardMasks, blurTargets } = await getSensitiveAutoMasks(target);
  const mask = [...(options?.mask ?? []), ...hardMasks];
  await applyBlur(blurTargets);
  try {
    // Matches toHaveScreenshot()'s defaults - reduces (but can't fully eliminate) visible flicker
    // from CDP's screenshot capture in headed mode.
    await target.screenshot({
      path: filePath,
      animations: "disabled",
      caret: "hide",
      mask: mask.length ? mask : undefined,
      maskColor: CONST.TESTING.SCREENSHOT.MASK_COLOR,
    });
  } finally {
    await removeBlur(blurTargets);
  }
  await testInfo.attach(name, { path: filePath, contentType: "image/png" });
}

export async function attachPageScreenshot(
  testInfo: TestInfo,
  target: Screenshottable,
  name: string,
  options?: { mask?: Locator[] },
): Promise<void> {
  if (!CAPTURE_STEP_SCREENSHOTS) return;
  const filePath = testInfo.outputPath(name);
  const { hardMasks, blurTargets } = await getSensitiveAutoMasks(target);
  const mask = [...(options?.mask ?? []), ...hardMasks];
  await applyBlur(blurTargets);
  // Matches toHaveScreenshot()'s defaults - reduces (but can't fully eliminate) visible flicker
  // from CDP's screenshot capture in headed mode.
  try {
    await target.screenshot({
      path: filePath,
      animations: "disabled",
      caret: "hide",
      mask: mask.length ? mask : undefined,
      maskColor: CONST.TESTING.SCREENSHOT.MASK_COLOR,
    });
  } finally {
    await removeBlur(blurTargets);
  }
  await testInfo.attach(name, { path: filePath, contentType: "image/png" });
}

// filter/blur renders an element's entire subtree as one composited bitmap before blurring it - a
// descendant can't opt out via its own "filter: none", since the ancestor already consumed it
// into that bitmap. To keep specific elements sharp while blurring everything else under a
// container, mark every branch that doesn't lead to a kept element, recursing only into branches
// that contain one (not into a kept element itself - a matched element's own rendered content,
// e.g. a tree node's icon+label span, must never be touched, since Sitecore nests an item's real
// children in a sibling container, not inside that item's own element). This naturally reveals a
// kept node's direct children as labels while leaving deeper, non-kept descendants blurred, since
// each child is its own wrapper containing the next anchor as a sibling of its own children
// container - add a child to keepSelectors to chain the same reveal one level further.
// A kept anchor's own row furniture (e.g. a tree node's expand/collapse glyph, or Fobles' own
// tree button - both siblings of the anchor, not descendants of it) is matched by neither rule
// above, so furnitureSelectors explicitly allowlists which siblings count as decorative chrome
// to exempt alongside a kept sibling. This must be an explicit allowlist, not inferred (e.g. "the
// one lone non-matching sibling") - an expanded kept node's real children container is ALSO a
// lone non-matching sibling of its anchor, and inferring furniture from that would wrongly leave
// its real (non-kept) descendants sharp instead of recursing into them.
// keepSubtreeSelectors is a second, distinct kind of "keep" - not just the matched element's own
// label, but its ENTIRE real subtree, however deep, stays sharp (e.g. Fobles' own test fixture
// data, safe to show in full). Once inside such a subtree, nothing is ever marked for blur again.
// keepSelectors/furnitureSelectors/keepSubtreeSelectors are plain CSS selectors (e.g. "#exact-id"
// or "[id$='-suffix']") checked via querySelector against each branch's subtree, not against the
// branch root itself only.
const BLUR_BRANCH_MARKER = "data-fobles-blur-branch";

async function blurTreeExcept(
  frame: Frame,
  containerSelector: string,
  keepSelectors: string[],
  furnitureSelectors: string[] = [],
  keepSubtreeSelectors: string[] = [],
): Promise<Locator> {
  await frame.locator(containerSelector).evaluateAll(
    (containers, { keepSelectors, furnitureSelectors, keepSubtreeSelectors, marker }) => {
      const matchesAny = (element: Element, selectors: string[]): boolean =>
        selectors.some((selector) => element.matches(selector));
      const containsKeptElement = (element: Element): boolean =>
        [...keepSelectors, ...keepSubtreeSelectors].some(
          (selector) => element.querySelector(selector) !== null,
        );

      const markBranches = (node: Element, insideKeptSubtree: boolean): void => {
        const children = Array.from(node.children);
        const hasKeptSibling = children.some((child) => matchesAny(child, keepSelectors));
        const hasKeptSubtreeSibling = children.some((child) =>
          matchesAny(child, keepSubtreeSelectors),
        );

        for (const child of children) {
          child.removeAttribute(marker);
          if (matchesAny(child, keepSelectors) || matchesAny(child, keepSubtreeSelectors)) continue;
          if (
            (hasKeptSibling || hasKeptSubtreeSibling) &&
            matchesAny(child, furnitureSelectors)
          ) {
            continue;
          }
          if (insideKeptSubtree || hasKeptSubtreeSibling) {
            markBranches(child, true);
          } else if (containsKeptElement(child)) {
            markBranches(child, false);
          } else {
            child.setAttribute(marker, "1");
          }
        }
      };

      for (const container of containers) markBranches(container, false);
    },
    { keepSelectors, furnitureSelectors, keepSubtreeSelectors, marker: BLUR_BRANCH_MARKER },
  );

  return frame.locator(`${containerSelector} [${BLUR_BRANCH_MARKER}]`);
}


// Playwright's own mask option only ever paints an opaque box - there's no built-in "blur"
// alternative. This fakes it with a plain CSS filter applied directly to each target element
// right before the screenshot, then removed again - only for content that's fine to merely
// obscure (operational metadata), never for real secrets/identity (those stay hard-masked via
// Playwright's mask option instead, since blur is comparatively easier to reverse).
async function applyBlur(locators: Locator[]): Promise<void> {
  for (const locator of locators) {
    await locator
      .evaluateAll((elements, blurPx) => {
        for (const element of elements) {
          (element as HTMLElement).style.filter = `blur(${blurPx}px)`;
        }
      }, CONST.TESTING.SCREENSHOT.BLUR_PX)
      .catch(() => {
        // Best-effort - a since-removed element must never mask the screenshot's own outcome.
      });
  }
}

async function removeBlur(locators: Locator[]): Promise<void> {
  for (const locator of locators) {
    await locator
      .evaluateAll((elements, marker) => {
        for (const element of elements) {
          (element as HTMLElement).style.removeProperty("filter");
          element.removeAttribute(marker); // no-op for elements blurTreeExcept never marked
        }
      }, BLUR_BRANCH_MARKER)
      .catch(() => {
        // Best-effort - see applyBlur.
      });
  }
}

// A Locator knows its owning Page; a Page is already one. Needed because a screenshot target can
// be either (a field's own table, a Quick Info row, or the whole page), but the locators below
// always live on the top-level page regardless of which frame/element is being screenshotted.
function getOwningPage(target: Screenshottable): Page {
  return typeof (target as Locator).page === "function"
    ? (target as Locator).page()
    : (target as Page);
}

// page.locator() only searches the main frame - some jump-menu targets (e.g. the Installation
// Wizard shell application) render inside a nested iframe instead, so a selector's presence has to
// be checked frame-by-frame rather than assumed to be in the top-level document.
async function framesWithSelector(
  page: Page,
  selector: string,
): Promise<Frame[]> {
  const matches: Frame[] = [];
  for (const frame of page.frames()) {
    if (
      (await frame
        .locator(selector)
        .count()
        .catch(() => 0)) > 0
    )
      matches.push(frame);
  }
  return matches;
}

// Sensitive content that should never appear unmasked in a screenshot, regardless of which call
// site takes it - checked automatically instead of requiring every caller to opt in. Each entry
// resolves to no masks when its content isn't present on the page being screenshotted.
// hardMasks stay opaque (Playwright's mask option) - identity (usernames/owners) and anything
// that could be a real secret (config/connection strings, raw DB browsing, service internals).
// blurTargets get a CSS blur instead (see applyBlur) - POC, intentionally limited to the Jobs
// list for now; reclassify more entries into this group once the approach is confirmed good.
async function getSensitiveAutoMasks(
  target: Screenshottable,
): Promise<{ hardMasks: Locator[]; blurTargets: Locator[] }> {
  const page = getOwningPage(target);
  const masks: Locator[] = [];
  const blurTargets: Locator[] = [];

  // Sitecore's shell chrome shows the logged-in admin username next to their portrait image -
  // once in the visible header bar itself, and again inside ul.sc-accountInformation's own hover
  // dropdown (a second copy of the same li, sharing the same portrait id) - mask every occurrence
  // via the portrait image both copies share, rather than relying on the dropdown's li order
  // (ACCOUNT_INFO's last() alone missed the visible header copy entirely).
  const userPortraitLi = "li:has(img#globalHeaderUserPortrait)";
  for (const frame of await framesWithSelector(page, userPortraitLi)) {
    masks.push(frame.locator(userPortraitLi));
  }

  // Content Editor's Quick Info panel shows the item's owner as a domain\username (e.g.
  // "sitecore\admin") - same sensitivity as the account info username above. Item path and Item
  // owner render as cell pairs on the same <tr>, so masking the whole row's "input" would also
  // mask Item path's own value - scope to the <td> immediately after the "Item owner:" label cell
  // instead, so only that value is masked.
  const itemOwnerRow = "tr:has(td:text-is('Item owner:'))";
  for (const frame of await framesWithSelector(page, itemOwnerRow)) {
    masks.push(
      frame
        .locator(itemOwnerRow)
        .locator('td:text-is("Item owner:") + td')
        .locator("input"),
    );
  }

  // The browser's built-in XML viewer (e.g. /sitecore/admin/showconfig.aspx, reached via the
  // Fobles menu's "Show Config" button) marks each expanded node with class "opened" - showconfig
  // dumps the live web.config, including connection strings, so mask every expanded node.
  for (const frame of await framesWithSelector(page, ".opened")) {
    masks.push(frame.locator(".opened"));
  }

  // showservicesconfig.aspx ("Show Services Config" jump-menu button) lists every registered DI
  // service in a <tbody> - scope the mask to its own #ServicesForm container so unrelated tables
  // (e.g. Content Editor field tables) are never affected.
  for (const frame of await framesWithSelector(page, "#ServicesForm tbody")) {
    masks.push(frame.locator("#ServicesForm tbody"));
  }

  // cache.aspx ("Cache" jump-menu button) lists every cache's name/size in a nested table next
  // to the "Caches (NNN)" section title - find that nested table relative to the title span (it
  // has no id/class of its own) and blur it rather than the whole page. Blurred, not masked -
  // cache names/sizes are operational metadata, not a secret.
  for (const frame of await framesWithSelector(page, "#c_cacheTitle")) {
    blurTargets.push(
      frame.locator("#c_cacheTitle").locator("xpath=ancestor::tr[1]//table"),
    );
  }

  // jobs.aspx ("Jobs" jump-menu button) lists Running/Queued/Finished jobs, each rendered as
  // either a "No jobs" placeholder or a table.jobs-table - no per-section wrapper element exists,
  // so blur both possible shapes directly rather than trying to select "the section". Blurred
  // (not hard-masked) as this POC's one converted example - job names/status/times are
  // operational metadata, not a secret.
  const jobsSelector =
    '.wf-content table.jobs-table, .wf-content b:has-text("No jobs")';
  for (const frame of await framesWithSelector(page, jobsSelector)) {
    blurTargets.push(frame.locator(jobsSelector));
  }

  // logs.aspx ("Logs" jump-menu button) lists every log file name/link in #LogTypes - blurred,
  // not masked, since log file names are operational metadata, not a secret.
  for (const frame of await framesWithSelector(page, "#LogTypes")) {
    blurTargets.push(frame.locator("#LogTypes"));
  }

  // stats.aspx ("Stats" jump-menu button) lists rendering/item stats in plain, unstyled
  // <table>s scoped to its own #form1 - the first one is enough to obscure the data without
  // blacking out the whole page. Blurred - these are usage counts, not a secret.
  for (const frame of await framesWithSelector(page, "#form1 table")) {
    blurTargets.push(frame.locator("#form1 table").first());
  }

  // dbbrowser.aspx ("DB Browser" jump-menu button) shows a full item tree in div.content - scope
  // to a .content that actually contains the tree browser (#tree), since ".content" alone is too
  // generic to safely mask on every page. #dataBases (the master/web/filesystem/core database
  // tabs above the tree) is a sibling, not a descendant, so it needs its own entry.
  for (const frame of await framesWithSelector(
    page,
    "div.content:has(#tree)",
  )) {
    masks.push(frame.locator("div.content:has(#tree)"));
  }
  for (const frame of await framesWithSelector(page, "#dataBases")) {
    masks.push(frame.locator("#dataBases"));
  }

  // Installation Wizard ("Installation Wizard" jump-menu button, a shell application likely
  // rendered inside a nested frame) shows the selected package's filename in #PackageFile.
  for (const frame of await framesWithSelector(page, "#PackageFile")) {
    masks.push(frame.locator("#PackageFile"));
  }

  // Kick User/Control Panel/Launchpad ("Kick User"/"Control Panel"/"Launchpad" jump-menu
  // buttons) are all Sitecore client (SPA-shell) applications sharing the same main-content
  // region class, regardless of which application it is. Stays hard-masked (not blurred) - Kick
  // User's own content lists real logged-in usernames, same sensitivity as the account info
  // portrait/Item owner above, and this one selector covers all three pages at once.
  for (const frame of await framesWithSelector(
    page,
    ".sc-applicationContent-main",
  )) {
    masks.push(frame.locator(".sc-applicationContent-main"));
  }

  // File Explorer ("File Explorer" jump-menu button, xmlcontrol=FileExplorer) has no id/class of
  // its own on the layout table holding the actual folder/file listing - find it relative to
  // #FoldersAction (unique to this page) instead, and blur just its third row (the listing
  // itself, not the toolbar rows above it).
  const fileExplorerRow =
    "#FoldersAction ~ table[width='100%'][height='100%'] tr:nth-child(3)";
  for (const frame of await framesWithSelector(page, fileExplorerRow)) {
    blurTargets.push(frame.locator(fileExplorerRow));
  }

  // Content Editor's own content tree - blurred (not masked); this is by far the most
  // frequently-present entry (almost every strategy test screenshot has Content Editor open), so
  // converting it only affects report attachments, never toHaveScreenshot()'s own pixel-diff
  // baselines (those pass their own explicit mask option directly, independent of this function).
  // Keep lists live in CONST.BLUR_KEEP (constants/blur-keep-selectors.ts) - add more kept
  // selectors there, never inline them here.
  for (const frame of await framesWithSelector(page, CONST.BLUR_KEEP.CONTENT_TREE.CONTAINER_SELECTOR)) {
    blurTargets.push(
      await blurTreeExcept(
        frame,
        CONST.BLUR_KEEP.CONTENT_TREE.CONTAINER_SELECTOR,
        [...CONST.BLUR_KEEP.CONTENT_TREE.KEEP_SELECTORS],
        [...CONST.BLUR_KEEP.CONTENT_TREE.FURNITURE_SELECTORS],
        [...CONST.BLUR_KEEP.CONTENT_TREE.KEEP_SUBTREE_SELECTORS],
      ),
    );
  }

  // Content Editor's ribbon - same tree-prune technique, keeping every standard tab's button
  // strip sharp and blurring any other (e.g. My Toolbar, Developer).
  for (const frame of await framesWithSelector(page, CONST.BLUR_KEEP.RIBBON_BUTTONS.CONTAINER_SELECTOR)) {
    blurTargets.push(
      await blurTreeExcept(
        frame,
        CONST.BLUR_KEEP.RIBBON_BUTTONS.CONTAINER_SELECTOR,
        [...CONST.BLUR_KEEP.RIBBON_BUTTONS.KEEP_SELECTORS],
      ),
    );
  }

  // Desktop ("Desktop" jump-menu button) shows the current database name and a user's saved
  // desktop shortcuts - blurred, not masked; a db name and shortcut labels aren't identity/secrets.
  for (const frame of await framesWithSelector(page, "#DatabaseSelector")) {
    blurTargets.push(frame.locator("#DatabaseSelector"));
  }
  for (const frame of await framesWithSelector(page, "#DesktopLinks")) {
    blurTargets.push(frame.locator("#DesktopLinks"));
  }

  return { hardMasks: masks, blurTargets };
}
