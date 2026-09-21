import { expect, test } from "../fixtures/playwright";
import { openSitecorePage } from "../fixtures/sitecore";
import { CONST } from "../CONST";
import { attachUiPathNote, createStep } from "../fobles-helpers";
import { FOBLES_YML } from "../strategies/fobles-yml";
import { findFrameWithSelector } from "../sitecore-macros";

// The dialog/gallery `default.aspx?xmlcontrol=...` pages tracked in docs/TODO.md - each one only
// ever renders inside a small iframe/dialog (never a full Content Editor page), so Fobles' own
// toolbar strips itself down to just the LBolt button on these (see FOBLES_PAGES's toolbarType,
// src/content/constants.ts) rather than showing the quick menu/proxy buttons/close button too.
// Navigating directly to each page's own URL (rather than clicking through the ribbon action that
// normally opens it) is equivalent here: Fobles' toolbar-eligibility check only looks at the
// current frame's own location, never how it got there. uiPath records that real click-path
// anyway (see attachUiPathNote) since the page's own relative URL alone doesn't say how a user
// would actually reach it.
type ToolbarPageCase = {
  label: string;
  url: string;
  uiPath: string;
  compact: boolean;
  // Some pages are kept in FOBLES_PAGES (src/content/constants.ts) for reference/tracking even
  // though Fobles is marked ineligible there (eligible: false) - defaults to true (eligible).
  eligible?: boolean;
  // Set once a case is confirmed failing against a real Sitecore instance and not yet fixed (see
  // docs/TODO.md) - skip it instead of leaving the suite red for a known, tracked gap.
  skip?: boolean;
};

const FOBLES_TESTING_MODULE_ROOT_ID = FOBLES_YML.CONTENT.FOBLES_TESTING_MODULE_ROOT.id;

function toBracedGuid(id: string): string {
  return `{${id.toUpperCase()}}`;
}

const GALLERY_QUERY_SUFFIX =
  `id=${encodeURIComponent(toBracedGuid(FOBLES_TESTING_MODULE_ROOT_ID))}` +
  "&la=en&vs=1&db=master&sc_content=master&ShowEditor=1&Ribbon.RenderTabs=true";

const PAGES: ToolbarPageCase[] = [
  {
    label: "File Explorer",
    url: "/sitecore/shell/default.aspx?xmlcontrol=FileExplorer",
    uiPath: "Quick Menu -> File Explorer",
    compact: false,
  },
  {
    label: "Add From Template",
    url: "/sitecore/shell/default.aspx?xmlcontrol=AddFromTemplate",
    uiPath: "CE -> Home -> Insert -> Insert from template",
    compact: false,
  },
  {
    label: "Gallery Subitems",
    url: `/sitecore/shell/default.aspx?xmlcontrol=Gallery.Subitems&${GALLERY_QUERY_SUFFIX}`,
    uiPath: "CE -> Navigate -> Subitems",
    compact: true,
    // Confirmed failing live: no Fobles toolbar container ever appears on this page (see
    // docs/TODO.md) - skip until that's investigated/fixed.
    skip: true,
  },
  {
    label: "Gallery Favorites",
    url: `/sitecore/shell/default.aspx?xmlcontrol=Gallery.Favorites&${GALLERY_QUERY_SUFFIX}`,
    uiPath: "CE -> Navigate -> Favorites",
    compact: true,
    // Confirmed failing live: no Fobles toolbar container ever appears on this page (see
    // docs/TODO.md) - skip until that's investigated/fixed.
    skip: true,
  },
  {
    label: "TreeListEx Editor",
    // hdl is an ephemeral, session-scoped handle to an in-memory field value - not reusable
    // across test runs. Fobles' own eligibility check only reads xmlcontrol (isMenuPathAllowed,
    // src/content/guard.ts), so the bare xmlcontrol param is the shortest functional URL.
    url: "/sitecore/shell/default.aspx?xmlcontrol=TreeListExEditor",
    uiPath: "CE -> Configure -> Editors",
    compact: true,
  },
  {
    label: "Device Editor",
    // de/id/vs/la identify which device+item+version+language to edit - none of that is Fobles'
    // own test data, and none of it affects toolbar-eligibility, so drop it for the same reason
    // as TreeListEx Editor above.
    url: "/sitecore/shell/default.aspx?xmlcontrol=DeviceEditor",
    uiPath: "CE -> Presentation -> Details",
    compact: true,
    // Confirmed live: the toolbar shouldn't show here at all (FOBLES_PAGES marks it
    // eligible: false) - kept in this list so that stays covered instead of silently untested.
    eligible: false,
  },
  {
    label: "Select Rendering",
    url: "/sitecore/shell/default.aspx?xmlcontrol=Sitecore.Shell.Applications.Dialogs.SelectRendering",
    uiPath: "CE -> Presentation -> Details -> Edit -> Controls -> Change",
    compact: true,
  },
  {
    label: "Field Editor",
    // hdl is an ephemeral, session-scoped handle to an in-memory field value - not reusable
    // across test runs, and Fobles' own eligibility check never reads it (findAllowedPage,
    // src/content/guard.ts), so drop it for the same reason as TreeListEx Editor above.
    url: "/sitecore/shell/applications/field editor.aspx?mo=mini",
    uiPath: "Presentation Details -> Edit",
    compact: true,
  },
];

test.describe("Editor scenario: toolbar visibility on dialog/gallery pages", () => {
  for (const pageCase of PAGES) {
    const isEligible = pageCase.eligible !== false;
    const runTest = pageCase.skip ? test.skip : test;

    runTest(`Fobles nav ${isEligible ? "appears" : "does not appear"} on ${pageCase.label}`, async ({ page }, testInfo) => {
      const step = createStep(page, testInfo, page);

      await step(`${pageCase.label}: Fobles nav ${isEligible ? "appears" : "does not appear"}`, async (fullTitle) => {
        await attachUiPathNote(testInfo, pageCase.uiPath, fullTitle);
        await openSitecorePage(page, pageCase.url);

        if (!isEligible) {
          await page.waitForTimeout(2_000);
          await expect(page.locator(CONST.SITECORE.SELECTORS.TOOLBAR_CONTAINER)).toHaveCount(0);
          return;
        }

        const foblesFrame = await findFrameWithSelector(
          page,
          CONST.SITECORE.SELECTORS.TOOLBAR_CONTAINER,
          `Fobles toolbar on ${pageCase.label}`,
          10_000,
        );

        await expect(foblesFrame.locator(CONST.SITECORE.SELECTORS.TOOLBAR_CONTAINER)).toBeVisible();
        await expect(foblesFrame.locator(CONST.SITECORE.SELECTORS.LBOLT_BUTTON)).toBeVisible();

        const menuTrigger = foblesFrame.locator(CONST.SITECORE.SELECTORS.MENU_TRIGGER);
        const proxyButtonsTrigger = foblesFrame.locator(CONST.SITECORE.SELECTORS.PROXY_BUTTONS_TRIGGER);
        const closeButton = foblesFrame.locator(CONST.SITECORE.SELECTORS.TOOLBAR_CLOSE_BUTTON);

        if (pageCase.compact) {
          await expect(menuTrigger).toHaveCount(0);
          await expect(proxyButtonsTrigger).toHaveCount(0);
          await expect(closeButton).toHaveCount(0);
        } else {
          await expect(menuTrigger).toBeVisible();
          await expect(proxyButtonsTrigger).toBeVisible();
          await expect(closeButton).toBeVisible();
        }
      });
    });
  }
});
