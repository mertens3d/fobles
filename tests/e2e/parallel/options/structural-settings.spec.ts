import { expect, foblesTest } from "../../../fixtures/playwright";
import { getExtensionId, openExtensionPage, setExtensionCheckbox } from "../../../fixtures/extension";
import { createFoblesStep } from "../../../helpers/fobles-helpers-support/test-step";
import {
  clickOptionsButton,
  fillOptionsInput,
  openSettingsSection,
  TESTING,
} from "../../shared/extension-ui/options-test-helpers";
import { STRUCTURAL } from "../../../../src/shared/structural/structural.const";
import { knownSitesStorageKey, normalizeKnownSites } from "../../../../src/shared/known-sites/known-sites-model";
import { STRUCTURAL_OPTIONS } from "../../../../src/options/structural/structural-options.const";
import { STRUCTURAL_TEST } from "./structural-settings.const";

foblesTest.describe("Structural Options", () => {
  foblesTest(
    "validates settings and administers Known Sites without crossing scope boundaries",
    async ({ sharedBrowserContext }, testInfo) => {
      const extensionId = await getExtensionId(sharedBrowserContext);
      const options = await openExtensionPage(sharedBrowserContext, extensionId, TESTING.EXTENSION_PAGES.OPTIONS);
      const step = createFoblesStep(options, testInfo, options, "Structural Options");
      const scope = { origin: STRUCTURAL_TEST.ORIGIN, database: STRUCTURAL_TEST.DATABASE };
      const otherDatabase = { ...scope, database: STRUCTURAL_TEST.OTHER_DATABASE };
      const otherOrigin = { ...scope, origin: STRUCTURAL_TEST.OTHER_ORIGIN };
      const keys = {
        sync: [STRUCTURAL.SETTINGS_KEY],
        local: [knownSitesStorageKey(scope), knownSitesStorageKey(otherDatabase), knownSitesStorageKey(otherOrigin)],
      };
      const snapshot = await options.evaluate(
        async (keys) => ({
          sync: await chrome.storage.sync.get(keys.sync),
          local: await chrome.storage.local.get(keys.local),
        }),
        keys,
      );

      try {
        await options.evaluate(
          async ({ keys, site }) => {
            await chrome.storage.sync.remove(keys.sync);
            await chrome.storage.local.set(Object.fromEntries(keys.local.map((key) => [key, [site]])));
          },
          { keys, site: STRUCTURAL_TEST.SITE },
        );
        await options.reload();

        await step("cache age is absent and diagnostics default off; invalid paths do not save", async () => {
          await openSettingsSection(options, STRUCTURAL_OPTIONS.TITLE);
          const diagnostic = options.getByLabel(STRUCTURAL_OPTIONS.DIAGNOSTIC_LABEL);
          await expect(diagnostic).toBeEnabled();
          await expect(options.getByLabel(STRUCTURAL_TEST.UI.LEGACY_AGE_LABEL)).toHaveCount(0);
          await expect(diagnostic).not.toBeChecked();
          await fillOptionsInput(options, options.getByLabel("Page base template paths"), "/sitecore/content/Invalid");
          await clickOptionsButton(options, STRUCTURAL_OPTIONS.SAVE_LABEL);
          await expect(options.getByRole("status").filter({ hasText: STRUCTURAL_OPTIONS.INVALID_PATHS })).toBeVisible();
        });

        await step("settings, disabled categories, and diagnostic visibility persist across reload", async () => {
          await fillOptionsInput(options, options.getByLabel("Page base template paths"), STRUCTURAL_TEST.PAGE_PATH);
          await fillOptionsInput(options, options.getByLabel("Site base template paths"), "");
          await fillOptionsInput(options, options.getByLabel("Tenant base template paths"), "");
          const diagnostic = options.getByLabel(STRUCTURAL_OPTIONS.DIAGNOSTIC_LABEL);
          await setExtensionCheckbox(options, diagnostic, true, STRUCTURAL_OPTIONS.DIAGNOSTIC_LABEL);
          await clickOptionsButton(options, STRUCTURAL_OPTIONS.SAVE_LABEL);
          await expect(options.getByRole("status").filter({ hasText: STRUCTURAL_OPTIONS.SAVED })).toBeVisible();
          await options.reload();
          await openSettingsSection(options, STRUCTURAL_OPTIONS.TITLE);
          await expect(options.getByLabel(STRUCTURAL_TEST.UI.LEGACY_AGE_LABEL)).toHaveCount(0);
          const save = options.getByRole("button", { name: STRUCTURAL_OPTIONS.SAVE_LABEL });
          await expect(save).toHaveClass("settings-button");
          const widths = await save.evaluate((button) => ({
            button: button.getBoundingClientRect().width,
            section: button.closest("fieldset")!.getBoundingClientRect().width,
          }));
          expect(widths.button).toBeLessThan(widths.section);
          await expect(options.getByLabel("Page base template paths")).toHaveValue(STRUCTURAL_TEST.PAGE_PATH);
          await expect(options.getByLabel("Site base template paths")).toHaveValue("");
          await expect(options.getByLabel("Tenant base template paths")).toHaveValue("");
          await expect(diagnostic).toBeChecked();
        });

        await step(
          "environment and database inspection rejects invalid URLs and exposes delegated cache actions",
          async () => {
            await openSettingsSection(options, STRUCTURAL_OPTIONS.KNOWN_SITES_TITLE);
            await expect(options.getByLabel(STRUCTURAL_TEST.UI.STORED_ENVIRONMENT_LABEL)).toBeVisible();
            await fillOptionsInput(
              options,
              options.getByLabel(STRUCTURAL_TEST.UI.ENVIRONMENT_LABEL),
              "file:///invalid",
            );
            await fillOptionsInput(options, options.getByLabel("Database", { exact: true }), scope.database);
            await clickOptionsButton(options, "Inspect Known Sites");
            await expect(
              options.getByRole("status").filter({ hasText: STRUCTURAL_OPTIONS.INVALID_ENVIRONMENT }),
            ).toBeVisible();
            await expect(options.getByRole("region", { name: STRUCTURAL_TEST.UI.PANEL_LABEL })).toHaveCount(0);
            await fillOptionsInput(options, options.getByLabel(STRUCTURAL_TEST.UI.ENVIRONMENT_LABEL), scope.origin);
            await clickOptionsButton(options, "Inspect Known Sites");
            await expect(
              options.getByRole("heading", { name: `${scope.origin} / ${scope.database}`, exact: true }),
            ).toBeVisible();
            await expect(options.getByRole("button", { name: "Invalidate structural cache" })).toBeEnabled();
            await expect(options.getByRole("button", { name: "Rediscover structural data" })).toBeEnabled();
            await expect(options.getByText(STRUCTURAL_OPTIONS.COMMAND_HELP, { exact: true })).toBeVisible();
          },
        );

        await step("invalid site edits are rejected; valid edits use the background writer", async () => {
          const row = options.locator(".known-site-row");
          await expect(row).toHaveCount(1);
          await row.locator("summary").click();
          await fillOptionsInput(options, row.getByLabel("Site path"), "/outside");
          await clickOptionsButton(options, "Save site");
          await expect(options.getByRole("status").filter({ hasText: "Invalid" })).toBeVisible();
          await fillOptionsInput(options, row.getByLabel("Site name"), STRUCTURAL_TEST.EDITED_NAME);
          await fillOptionsInput(options, row.getByLabel("Site path"), STRUCTURAL_TEST.EDITED_PATH);
          await clickOptionsButton(options, "Save site");
          await expect(
            options.getByRole("region", { name: STRUCTURAL_TEST.UI.PANEL_LABEL }).getByRole("status"),
          ).toHaveText("Known Sites updated for this Sitecore environment and database.");
          await expect(row.locator("summary")).toContainText(STRUCTURAL_TEST.EDITED_NAME);
          const stored = await options.evaluate(
            async (key) => (await chrome.storage.local.get(key))[key],
            keys.local[0],
          );
          expect(stored).toEqual([
            {
              ...STRUCTURAL_TEST.SITE,
              name: STRUCTURAL_TEST.EDITED_NAME,
              path: STRUCTURAL_TEST.EDITED_PATH,
              validatedAt: expect.any(Number),
            },
          ]);
          expect(normalizeKnownSites(stored)[0].validatedAt).toBeGreaterThan(STRUCTURAL_TEST.SITE.validatedAt);
        });

        await step("removal cancellation and confirmation preserve all other origin/database scopes", async () => {
          options.once("dialog", (dialog) => void dialog.dismiss());
          await clickOptionsButton(options, "Remove site");
          await expect(options.locator(".known-site-row")).toHaveCount(1);
          options.once("dialog", (dialog) => void dialog.accept());
          await clickOptionsButton(options, "Remove site");
          await expect(
            options.getByText("No Known Sites for this Sitecore environment and database.", { exact: true }),
          ).toBeVisible();
          for (const otherScope of [otherDatabase, otherOrigin]) {
            await options
              .getByLabel(STRUCTURAL_TEST.UI.STORED_ENVIRONMENT_LABEL)
              .selectOption(knownSitesStorageKey(otherScope));
            await expect(options.locator(".known-site-row summary")).toContainText(STRUCTURAL_TEST.SITE.name);
          }
          await options
            .getByLabel(STRUCTURAL_TEST.UI.STORED_ENVIRONMENT_LABEL)
            .selectOption(knownSitesStorageKey(otherDatabase));
          options.once("dialog", (dialog) => void dialog.accept());
          await clickOptionsButton(options, "Remove all Known Sites");
          await expect(
            options.getByText("No Known Sites for this Sitecore environment and database.", { exact: true }),
          ).toBeVisible();
          await options
            .getByLabel(STRUCTURAL_TEST.UI.STORED_ENVIRONMENT_LABEL)
            .selectOption(knownSitesStorageKey(otherOrigin));
          await expect(options.locator(".known-site-row summary")).toContainText(STRUCTURAL_TEST.SITE.name);
        });
      } finally {
        if (!options.isClosed()) {
          await options.evaluate(
            async ({ keys, snapshot }) => {
              await chrome.storage.sync.remove(keys.sync);
              await chrome.storage.local.remove(keys.local);
              await chrome.storage.sync.set(snapshot.sync);
              await chrome.storage.local.set(snapshot.local);
            },
            { keys, snapshot },
          );
          await options.close();
        }
      }
    },
  );
});
