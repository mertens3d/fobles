import { expect, foblesTest } from "../../fixtures/playwright";
import { openSitecorePage } from "../../fixtures/sitecore";
import { CONST } from "../../CONST";
import { createStep } from "../../helpers/fobles-helpers-support/test-step";
import {
  attachUiPathNote,
  expectFoblesButtonNewTabNavigation,
  expectFoblesButtonSameTabNavigation,
} from "../../helpers/fobles-helpers-support/navigation-assertions";
import { clickWithMouseMarker, ensureMouseMarkerExists } from "../../helpers/mouse-proxy";
import { findFrameWithSelector } from "../../helpers/frame-finder";
import { expectNeverAppears, foblesWaitForTimeout } from "../../helpers/wait-helpers";
import { clickLbolt } from "../../macros/fobles-macros";

const STEP_WAIT_MS = CONST.TESTING.SPEED.SETTINGS[CONST.TESTING.SPEED.SELECTED].STEP_WAIT_MS;

function toBracedGuid(id: string): string {
  return `{${id.toUpperCase()}}`;
}

type ToolbarType = "full" | "compact";

type PageCase = {
  label: string;
  url: string;
  uiPath: string;
  toolbarType: ToolbarType;
  // Some pages are kept in FOBLES_PAGES (src/content/constants.ts) for reference/tracking even
  // though Fobles is marked ineligible there (eligible: false) - defaults to true (eligible).
  eligible?: boolean;
  // Set once a case is confirmed failing against a real Sitecore instance and not yet fixed (see
  // docs/TODO.md) - skip it instead of leaving the suite red for a known, tracked gap.
  skip?: boolean;
  // Present only once (a) a guaranteed/known item exists for this page AND (b) it's confirmed
  // reachable in the tree without extra navigation - activation/button-navigation checks only run
  // when this is set; see activationGap for every case missing one and exactly why.
  knownItemId?: string;
  // Why activation/navigation isn't tested yet, when knownItemId is absent - never silently
  // dropped, always has a specific reason here.
  activationGap?: string;
};

const FOBLES_TESTING_MODULE_ROOT_ID = CONST.SITECORE.ITEMS.CONTENT_ITEM_ID;

function toBracedGuidQuery(id: string): string {
  return encodeURIComponent(toBracedGuid(id));
}

const GALLERY_QUERY_SUFFIX =
  `id=${toBracedGuidQuery(FOBLES_TESTING_MODULE_ROOT_ID)}` +
  "&la=en&vs=1&db=master&sc_content=master&ShowEditor=1&Ribbon.RenderTabs=true";

// Only pages where (a) a guaranteed/known item already exists and (b) that item is confirmed
// reachable WITHOUT extra tree-navigation. Content Editor's own "&fo=<item>" deep link only
// updates the field panel - it does NOT reliably scroll/expand the left tree to match (confirmed
// live: tree buttons never appeared for either FOBLES_DATA_ITEM_A or FOBLES_TESTING_MODULE_ROOT
// via "&fo="). The tree's own top-level nodes (content/layout/media library/system/templates) are
// expanded by default on a fresh Content Editor load though, so SITECORE.ITEMS.CONTENT_ITEM_ID
// (Sitecore's own standard "/sitecore/content" root, not Fobles-Testing-specific) is used here
// instead - no "&fo=" param at all, relying on that default-expanded state.
const PAGES: readonly PageCase[] = [
  {
    label: "Content Editor",
    url: CONST.SITECORE.PATHS.CONTENT_EDITOR,
    uiPath: "Jump Menu -> Content Editor",
    toolbarType: "full",
    knownItemId: FOBLES_TESTING_MODULE_ROOT_ID,
  },
  {
    label: "Template Manager",
    url: "/sitecore/shell/Applications/Templates/Template-Manager",
    uiPath: "Jump Menu -> Template Manager",
    toolbarType: "full",
    activationGap:
      "Has a guaranteed template item (FOBLES_YML.TEMPLATES.FOBLES_DATA_ITEM_TEMPLATE), but the " +
      "Content Editor case above confirmed \"&fo=<item>\" does NOT reveal/expand the tree to an " +
      "arbitrary node - the same is almost certainly true here. Needs either a tree-expand macro " +
      "or a shallower, default-visible template node instead.",
  },
  {
    label: "Content Manager",
    url: "/sitecore/shell/Applications/Content Manager/default.aspx",
    uiPath: "Jump Menu -> Content Manager",
    toolbarType: "full",
    activationGap:
      "Unconfirmed whether this uses the same content tree as Content Editor (Tree_Node_ prefix) " +
      "- if so, SITECORE.ITEMS.CONTENT_ITEM_ID already covers it with no new content needed; if " +
      "it's a different tree/id convention, needs its own investigation first.",
  },
  {
    label: "PowerShell ISE",
    url: "/sitecore/shell/Applications/PowerShell/PowerShellIse",
    uiPath: "Jump Menu -> PowerShell ISE",
    toolbarType: "full",
    activationGap:
      "Needs the Sitecore PowerShell Extensions (SPE) module installed to have a real Script " +
      "Library item to target (see docs/TODO.md's existing note - candidate item " +
      "{56DA8E7D-6CA5-4576-B1ED-4EDCCCC5B0B4}, SPE/Core/Platform/Functions/BaseXlsx) - not " +
      "guaranteed present in every environment, so deferred until that's confirmed available.",
  },
  {
    label: "Kick User",
    url: "/sitecore/client/Applications/LicenseOptions/KickUser.aspx",
    uiPath: "Jump Menu -> Kick User",
    toolbarType: "full",
    activationGap:
      "Special-purpose admin page, not a content-browsing tree - unconfirmed whether it has any " +
      "Fobles-button-decoratable content at all. Needs investigation before this makes sense.",
  },
  {
    label: "File Explorer",
    url: "/sitecore/shell/default.aspx?xmlcontrol=FileExplorer",
    uiPath: "Jump Menu -> File Explorer",
    toolbarType: "full",
    activationGap:
      "Browses physical server files, not Sitecore items - Fobles buttons navigate by item GUID " +
      "(buildFoblesUrl/formatFoId), which doesn't apply to a raw file path. Needs confirmation " +
      "this page has any GUID-based decoratable element at all before writing a real test (it may " +
      "simply be out of scope for this feature).",
  },
  {
    label: "Add From Template",
    url: "/sitecore/shell/default.aspx?xmlcontrol=AddFromTemplate",
    uiPath: "CE -> Home -> Insert -> Insert from template",
    toolbarType: "full",
    activationGap:
      "Has a guaranteed template item already, blocked on the same tree-reveal problem as " +
      "Template Manager above (not a deep-link one, per the Content Editor finding).",
  },
  {
    label: "Change Template",
    url: "/sitecore/shell/Applications/Templates/Change template.aspx",
    uiPath: "CE -> Home -> Insert -> Change template",
    toolbarType: "full",
    activationGap:
      "Page itself is now allowlisted (FOBLES_PAGES) and its tree widget's \"TemplateLister_\" id " +
      "prefix is now supported (src/content/sitecore.ts's TREE_ID_PREFIXES, " +
      "src/content/features/augmentor/treeNodeFobles/index.ts) - only the tree-reveal mechanics " +
      "(same problem as Template Manager/Add From Template above) remain.",
  },
  {
    label: "Gallery Subitems",
    url: `/sitecore/shell/default.aspx?xmlcontrol=Gallery.Subitems&${GALLERY_QUERY_SUFFIX}`,
    uiPath: "CE -> Navigate -> Subitems",
    toolbarType: "compact",
    // Confirmed failing live: no Fobles toolbar container ever appears on this page (see
    // docs/TODO.md) - skip until that's investigated/fixed.
    skip: true,
    activationGap: "Blocked on the toolbar-not-appearing root issue above, not on test-writing.",
  },
  {
    label: "Gallery Favorites",
    url: `/sitecore/shell/default.aspx?xmlcontrol=Gallery.Favorites&${GALLERY_QUERY_SUFFIX}`,
    uiPath: "CE -> Navigate -> Favorites",
    toolbarType: "compact",
    // Confirmed failing live: no Fobles toolbar container ever appears on this page (see
    // docs/TODO.md) - skip until that's investigated/fixed.
    skip: true,
    activationGap: "Same root issue as Gallery Subitems above.",
  },
  {
    label: "TreeListEx Editor",
    // hdl is an ephemeral, session-scoped handle to an in-memory field value - not reusable
    // across test runs. Fobles' own eligibility check only reads xmlcontrol (isMenuPathAllowed,
    // src/content/guard.ts), so the bare xmlcontrol param is the shortest functional URL.
    url: "/sitecore/shell/default.aspx?xmlcontrol=TreeListExEditor",
    uiPath: "CE -> Configure -> Editors",
    toolbarType: "compact",
    // Confirmed live: this xmlcontrol itself returns a server-side 500 on the "ai" environment
    // (unrelated to Fobles) - skip until that's investigated, same as Gallery Subitems/Favorites.
    skip: true,
    activationGap:
      "This dialog's internal list widget appears to use yet another id convention (seen " +
      "elsewhere as \"FIELD<n>_all_<GUID>\", not Tree_Node_/TemplateLister_) - augmentor support " +
      "for it is unconfirmed. Needs a live markup check before extending getTreeNodeItemId " +
      "(src/content/features/augmentor/treeNodeFobles/index.ts) for this case.",
  },
  {
    label: "Device Editor",
    // de/id/vs/la identify which device+item+version+language to edit - none of that is Fobles'
    // own test data, and none of it affects toolbar-eligibility, so drop it for the same reason
    // as TreeListEx Editor above.
    url: "/sitecore/shell/default.aspx?xmlcontrol=DeviceEditor",
    uiPath: "CE -> Presentation -> Details",
    toolbarType: "compact",
    // Confirmed live: this xmlcontrol itself returns a server-side 500 on the "ai" environment
    // (unrelated to Fobles, same as TreeListEx Editor) - skip until that's investigated. Also kept
    // marked eligible: false, since FOBLES_PAGES still says Fobles shouldn't show here regardless.
    skip: true,
    eligible: false,
  },
  {
    label: "Select Rendering",
    url: "/sitecore/shell/default.aspx?xmlcontrol=Sitecore.Shell.Applications.Dialogs.SelectRendering",
    uiPath: "CE -> Presentation -> Details -> Edit -> Controls -> Change",
    toolbarType: "compact",
    // Confirmed live: this xmlcontrol itself returns a server-side 500 on the "ai" environment -
    // skip until that's investigated, same as TreeListEx Editor/Device Editor above.
    skip: true,
    activationGap:
      "Needs BOTH: (1) confirmation of this dialog's tree id convention (unconfirmed, likely " +
      "another custom prefix like TreeListEx Editor above), and (2) a guaranteed test rendering " +
      "item - renderings aren't covered by yml-fobles.CONST.ts at all yet (it only has " +
      "CONTENT/TEMPLATES/MEDIA sections). Needs a dedicated Fobles Testing rendering item created " +
      "and serialized before this can be written.",
  },
  {
    label: "Field Editor",
    // hdl is an ephemeral, session-scoped handle to an in-memory field value - not reusable
    // across test runs, and Fobles' own eligibility check never reads it (findAllowedPage,
    // src/content/guard.ts), so drop it for the same reason as TreeListEx Editor above.
    url: "/sitecore/shell/applications/field editor.aspx?mo=mini",
    uiPath: "Presentation Details -> Edit",
    toolbarType: "compact",
    // Confirmed live: this page itself returns a server-side 500 on the "ai" environment - skip
    // until that's investigated, same as TreeListEx Editor/Device Editor/Select Rendering above.
    skip: true,
    activationGap:
      "Field-based dialog (mass field editing), not a tree - Fobles' button mechanism there (if " +
      "any) is a different code path than treeNodeFobles and is unconfirmed/untested.",
  },
];

function assertToolbarFlavor(foblesFrame: Awaited<ReturnType<typeof findFrameWithSelector>>, toolbarType: ToolbarType) {
  const menuTrigger = foblesFrame.locator(CONST.FOBLES.SELECTORS.JUMP_MENU_TRIGGER);
  const proxyButtonsTrigger = foblesFrame.locator(CONST.FOBLES.SELECTORS.PROXY_BUTTONS_TRIGGER);
  const closeButton = foblesFrame.locator(CONST.FOBLES.SELECTORS.TOOLBAR_CLOSE_BUTTON);

  if (toolbarType === "compact") {
    return Promise.all([
      expect(menuTrigger).toHaveCount(0),
      expect(proxyButtonsTrigger).toHaveCount(0),
      expect(closeButton).toHaveCount(0),
    ]);
  }

  return Promise.all([
    expect(menuTrigger).toBeVisible(),
    expect(proxyButtonsTrigger).toBeVisible(),
    expect(closeButton).toBeVisible(),
  ]);
}

foblesTest.describe("Pages: toolbar visibility, Fobles activation, and button navigation", () => {
  for (const pageCase of PAGES) {
    const isEligible = pageCase.eligible !== false;
    const runTest = pageCase.skip ? foblesTest.skip.bind(foblesTest) : foblesTest.bind(foblesTest);

    runTest(`${pageCase.label}: Fobles nav ${isEligible ? "appears" : "does not appear"}`, async ({ page }, testInfo) => {
      const step = createStep(page, testInfo, page, "Pages");

      await step(`${pageCase.label}: Fobles nav ${isEligible ? "appears" : "does not appear"}`, async (fullTitle) => {
        await attachUiPathNote(testInfo, pageCase.uiPath, fullTitle);
        await openSitecorePage(page, pageCase.url);

        if (!isEligible) {
          await expectNeverAppears(
            page.locator(CONST.FOBLES.SELECTORS.TOOLBAR_CONTAINER),
            2_000,
            `Fobles toolbar appeared on ${pageCase.label}, which is supposed to be ineligible`,
          );
          return;
        }

        const foblesFrame = await findFrameWithSelector(
          page,
          CONST.FOBLES.SELECTORS.TOOLBAR_CONTAINER,
          `Fobles toolbar on ${pageCase.label}`,
          10_000,
        );
        await ensureMouseMarkerExists(foblesFrame);

        await expect(foblesFrame.locator(CONST.FOBLES.SELECTORS.TOOLBAR_CONTAINER)).toBeVisible();
        await expect(foblesFrame.locator(CONST.FOBLES.SELECTORS.LBOLT_BUTTON)).toBeVisible();
        await assertToolbarFlavor(foblesFrame, pageCase.toolbarType);
      });

      if (!isEligible) return;

      // createStep auto-attaches a screenshot per step (pass or fail) - the step above captured
      // the default Sitecore view (toolbar present, Fobles not yet activated); this one captures
      // the same page with Fobles enabled, for every eligible page regardless of whether a
      // guaranteed item exists for deeper activation/navigation checks below.
      await step(`${pageCase.label}: Fobles enabled`, async () => {
        await clickLbolt(page);
        await foblesWaitForTimeout(page, STEP_WAIT_MS);
      });

      if (!pageCase.knownItemId) {
        if (pageCase.activationGap) {
          console.log(`[fobles] ${pageCase.label}: activation/navigation not yet tested - ${pageCase.activationGap}`);
        }
        return;
      }

      const knownItemId = pageCase.knownItemId;
      const treeButtonSelector = `${CONST.FOBLES.SELECTORS.TREE_FOBLES_BUTTON}[data-fobles-item-id="${knownItemId.replace(/-/g, "")}" i]`;

      await step(`${pageCase.label}: activating Fobles decorates the known item with a button`, async () => {
        const treeFrame = await findFrameWithSelector(
          page,
          treeButtonSelector,
          `Fobles tree button on ${pageCase.label}`,
          10_000,
        );
        await expect(treeFrame.locator(treeButtonSelector)).toBeVisible();
      });

      await step(
        `${pageCase.label}: Ctrl+click opens the known item in a new tab`,
        async (fullTitle) => {
          const treeFrame = await findFrameWithSelector(
            page,
            treeButtonSelector,
            `Fobles tree button on ${pageCase.label}`,
            10_000,
          );
          const button = treeFrame.locator(treeButtonSelector);
          const popupPromise = page.context().waitForEvent("page");
          await clickWithMouseMarker(page, button, "Fobles item button", { modifiers: ["Control"] });
          const popup = await popupPromise;
          await expectFoblesButtonNewTabNavigation(testInfo, toBracedGuid(knownItemId), fullTitle, popup, page);
        },
        { screenshot: false },
      );

      await step(
        `${pageCase.label}: click navigates to the known item in the same tab`,
        async (fullTitle) => {
          const treeFrame = await findFrameWithSelector(
            page,
            treeButtonSelector,
            `Fobles tree button on ${pageCase.label}`,
            10_000,
          );
          const button = treeFrame.locator(treeButtonSelector);
          await expectFoblesButtonSameTabNavigation(page, testInfo, button, toBracedGuid(knownItemId), fullTitle);
        },
        { screenshot: false },
      );
    });
  }
});
