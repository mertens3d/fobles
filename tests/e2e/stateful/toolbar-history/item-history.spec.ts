// @source-path [fobles] tests/e2e/stateful/toolbar-history/item-history.spec.ts

import { ITEM_HISTORY_CAPTURE } from "../../../../src/content/item-history/item-history.const";
import { HISTORY_CLASS, HISTORY_TEXT, HISTORY_UI } from "../../../../src/content/toolbar/history/history.const";
import { historyStorageKey } from "../../../../src/shared/item-history/item-history-model";
import { TEST_CONST } from "../../../constants/TEST_CONST";
import { expect, foblesTest } from "../../../fixtures/playwright";
import { findFoblesFrame } from "../../../helpers/frame-finder";
import { locateLBoltButton } from "../../../helpers/locator-helpers";
import { STRATEGY_SCENARIOS } from "../../shared/strategies/support/strategy-scenarios";
import {
  canonicalGuid,
  expectHistoryDestination,
  historyLink,
  historyPanel,
  mutateHistoryDatabase,
  mutateQuickInfo,
  openHistoryEditor,
  pinHistory,
  readHistoryScope,
  readStoredHistory,
  readStoredHistoryScopes,
  SCENARIO,
} from "../user-jumps/toolbar-integration/item-history.helpers";

foblesTest.describe("Toolbar item history", () => {
  foblesTest("captures the initially selected real Sitecore item without a DOM mutation", async ({ page, sharedBrowserContext }) => {
    const { frame, initial } = await openHistoryEditor(page);
    await expect(historyPanel(frame).locator(`.${HISTORY_CLASS.ROW}`)).toHaveCount(1);
    await expect.poll(() => readStoredHistory(sharedBrowserContext, frame)).toEqual([
      expect.objectContaining({
        id: canonicalGuid(SCENARIO.itemId).slice(1, -1).toLowerCase(),
        name: initial.name,
        path: initial.path,
        category: "Content",
        lastVisitedAt: expect.any(Number),
      }),
    ]);
  });

  foblesTest("captures Quick Info mutations, orders newest first, and deduplicates normalized GUID revisits", async ({ page, sharedBrowserContext }) => {
    const { frame, initial } = await openHistoryEditor(page);
    const second = { id: STRATEGY_SCENARIOS.DROP_TREE.itemId, name: "History second", path: "/sitecore/content/History second" };
    await mutateQuickInfo(frame, second);
    await expect(historyPanel(frame).locator(`.${HISTORY_CLASS.LINK}`)).toHaveText([second.name, initial.name]);
    const before = await readStoredHistory(sharedBrowserContext, frame);
    const revisit = { ...initial, id: canonicalGuid(initial.id).slice(1, -1).toLowerCase(), name: "History revisited" };
    await mutateQuickInfo(frame, revisit);
    await expect(historyPanel(frame).locator(`.${HISTORY_CLASS.LINK}`)).toHaveText([revisit.name, second.name]);
    await expect(historyLink(frame, initial.name)).toHaveCount(0);
    await expect.poll(async () => {
      const items = await readStoredHistory(sharedBrowserContext, frame);
      return items.length === 2 && items[0].name === revisit.name &&
        items[0].lastVisitedAt > before.find((item) => item.name === initial.name)!.lastVisitedAt;
    }).toBe(true);
    const revisitedTimestamp = (await readStoredHistory(sharedBrowserContext, frame))[0].lastVisitedAt;
    await mutateQuickInfo(frame, { ...revisit, id: canonicalGuid(initial.id).replace(/[{}-]/g, "") });
    await page.waitForTimeout(ITEM_HISTORY_CAPTURE.DEBOUNCE_MS + 100);
    expect((await readStoredHistory(sharedBrowserContext, frame))[0].lastVisitedAt).toBe(revisitedTimestamp);
    await expect(historyPanel(frame).locator(`.${HISTORY_CLASS.ROW}`)).toHaveCount(2);
    await expect.poll(async () => (await readStoredHistory(sharedBrowserContext, frame)).map((item) => item.name))
      .toEqual([revisit.name, second.name]);
  });

  for (const placement of ["outside", "inside"] as const) {
    foblesTest(`switches to web history when the actual database input is ${placement} #Editors`, async ({ page, sharedBrowserContext }) => {
      const { frame } = await openHistoryEditor(page);
      const sourceScope = await readHistoryScope(frame);
      const webKey = historyStorageKey({ origin: sourceScope.origin, database: "web" });
      const before = await readStoredHistoryScopes(sharedBrowserContext);
      const visit = {
        id: STRATEGY_SCENARIOS.DROP_TREE.itemId,
        name: `History web ${placement}`,
        path: `/sitecore/content/History web ${placement}`,
      };
      await mutateHistoryDatabase(frame, "web", placement);
      await mutateQuickInfo(frame, visit);
      expect(await readHistoryScope(frame)).toEqual({ origin: sourceScope.origin, database: "web" });
      const target = new URL((await historyLink(frame, visit.name).getAttribute("href"))!);
      expect(target.searchParams.get("sc_content")).toBe("web");
      await expect.poll(async () => (await readStoredHistory(sharedBrowserContext, frame)).some((item) => item.name === visit.name))
        .toBe(true);
      await page.waitForTimeout(ITEM_HISTORY_CAPTURE.DEBOUNCE_MS + 100);
      const after = await readStoredHistoryScopes(sharedBrowserContext);
      expect(Object.entries(after).filter(([, items]) => items.some((item) => item.name === visit.name)).map(([key]) => key))
        .toEqual([webKey]);
      expect(Object.fromEntries(Object.entries(after).filter(([key]) => key !== webKey)))
        .toEqual(Object.fromEntries(Object.entries(before).filter(([key]) => key !== webKey)));
    });
  }

  foblesTest("persists previously captured rows across a page reload without restarting the browser", async ({ page, sharedBrowserContext }) => {
    const { frame } = await openHistoryEditor(page);
    const visit = { id: STRATEGY_SCENARIOS.DROP_TREE.itemId, name: "History persisted", path: "/sitecore/content/History persisted" };
    await mutateQuickInfo(frame, visit);
    await expect.poll(async () => (await readStoredHistory(sharedBrowserContext, frame)).some((item) => item.name === visit.name)).toBe(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    const reloadedFrame = await findFoblesFrame(page);
    await pinHistory(reloadedFrame);
    await expect(historyLink(reloadedFrame, visit.name)).toBeVisible();
    await expect(historyLink(reloadedFrame, visit.name)).toHaveAttribute("href", new RegExp(encodeURIComponent(canonicalGuid(visit.id))));
  });

  foblesTest("groups Content, Templates, Layouts and PowerShell without Site grouping", async ({ page }) => {
    const { frame } = await openHistoryEditor(page);
    await historyPanel(frame).getByRole("button", { name: HISTORY_TEXT.CLEAR, exact: true }).click();
    await expect(frame.locator(`.${HISTORY_CLASS.EMPTY}`)).toBeVisible();
    const visits = [
      { id: SCENARIO.itemId, name: "History site A", path: "/sitecore/content/Site A/Home" },
      { id: STRATEGY_SCENARIOS.DROP_TREE.itemId, name: "History site B", path: "/sitecore/content/Site B/Home" },
      { id: STRATEGY_SCENARIOS.GENERAL_LINK.itemId, name: "History template", path: "/sitecore/templates/History template" },
      { id: STRATEGY_SCENARIOS.INTERNAL_LINK.itemId, name: "History layout", path: "/sitecore/layout/Layouts/History layout" },
      { id: STRATEGY_SCENARIOS.TREE_LIST.itemId, name: "History script", path: "/sitecore/system/Modules/PowerShell/Script Library/History script" },
    ];
    for (const visit of visits) {
      await mutateQuickInfo(frame, visit);
    }
    const panel = historyPanel(frame);
    await expect(panel.locator(`.${HISTORY_CLASS.GROUP} h3`)).toHaveText(["Content", "Templates", "Layouts", "PowerShell"]);
    await expect(panel.getByRole("region", { name: "Content", exact: true }).getByRole("link"))
      .toHaveText(["History site B", "History site A"]);
    for (const [category, name] of [["Templates", "History template"], ["Layouts", "History layout"], ["PowerShell", "History script"]]) {
      await expect(panel.getByRole("region", { name: category, exact: true }).getByRole("link")).toHaveText(name);
    }
    await expect(panel.getByRole("heading", { name: /^Site(?: A| B)?$/ })).toHaveCount(0);
  });

  foblesTest("hover opens and closes History; clicking pins and unpins it without changing LBolt size", async ({ page }) => {
    const { frame } = await openHistoryEditor(page);
    const tab = frame.locator(`.${HISTORY_CLASS.TAB}`);
    const lbolt = await locateLBoltButton(page);
    const originalSize = await lbolt.boundingBox();
    expect(originalSize).not.toBeNull();
    await tab.click();
    await page.mouse.move(0, 0);
    await expect(historyPanel(frame)).toBeHidden();
    await tab.hover();
    await expect(historyPanel(frame)).toBeVisible();
    await expect(tab).toHaveAttribute("aria-pressed", "false");
    await page.mouse.move(0, 0);
    await expect(historyPanel(frame)).toBeHidden();
    await tab.click();
    await page.mouse.move(0, 0);
    await expect(tab).toHaveAttribute("aria-pressed", "true");
    await page.waitForTimeout(600);
    await expect(historyPanel(frame)).toBeVisible();
    await lbolt.hover();
    await page.waitForTimeout(200);
    const hoveredSize = await lbolt.boundingBox();
    expect(hoveredSize?.width).toBeCloseTo(originalSize!.width, 1);
    expect(hoveredSize?.height).toBeCloseTo(originalSize!.height, 1);
    await tab.click();
    await page.mouse.move(0, 0);
    await expect(tab).toHaveAttribute("aria-pressed", "false");
    await expect(historyPanel(frame)).toBeHidden();
  });

  foblesTest("delays body-appended Tippy details for 500 ms and shows path, braced GUID and last visited", async ({ page, sharedBrowserContext }) => {
    const { frame, initial } = await openHistoryEditor(page);
    const [stored] = await readStoredHistory(sharedBrowserContext, frame);
    const lastVisited = await frame.evaluate((timestamp) => new Date(timestamp).toLocaleString(), stored.lastVisitedAt);
    const tooltip = frame.locator(`body > .${HISTORY_CLASS.TOOLTIP}`);
    await historyLink(frame, initial.name).hover();
    await page.waitForTimeout(200);
    expect(await tooltip.isVisible()).toBe(false);
    await page.waitForTimeout(HISTORY_UI.TOOLTIP_DELAY - 200 + 100);
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveAttribute("role", "tooltip");
    await expect(tooltip).toHaveText([
      `${HISTORY_TEXT.PATH}: ${initial.path}`,
      `${HISTORY_TEXT.GUID}: ${canonicalGuid(initial.id)}`,
      `${HISTORY_TEXT.LAST_VISITED}: ${lastVisited}`,
    ].join("\n"), { useInnerText: true });
    await expect(historyPanel(frame).locator(`.${HISTORY_CLASS.TOOLTIP}`)).toHaveCount(0);
    await page.mouse.move(0, 0);
    await expect(tooltip).toBeHidden();
  });

  foblesTest("removes a row without navigating and clears all history to the disabled empty state", async ({ page, sharedBrowserContext }) => {
    const { frame, initial } = await openHistoryEditor(page);
    const second = { id: STRATEGY_SCENARIOS.DROP_TREE.itemId, name: "History removable", path: "/sitecore/content/History removable" };
    await mutateQuickInfo(frame, second);
    const sourceUrl = page.url();
    await historyPanel(frame).getByRole("button", { name: `${HISTORY_TEXT.REMOVE} ${second.name}`, exact: true }).click();
    await expect(historyLink(frame, second.name)).toHaveCount(0);
    await expect(historyLink(frame, initial.name)).toBeVisible();
    expect(page.url()).toBe(sourceUrl);
    await expect.poll(async () => (await readStoredHistory(sharedBrowserContext, frame)).map((item) => item.name)).toEqual([initial.name]);
    const clear = historyPanel(frame).getByRole("button", { name: HISTORY_TEXT.CLEAR, exact: true });
    await clear.click();
    await expect(frame.locator(`.${HISTORY_CLASS.EMPTY}`)).toHaveText(HISTORY_TEXT.EMPTY);
    await expect(historyPanel(frame).locator(`.${HISTORY_CLASS.ROW}`)).toHaveCount(0);
    await expect(historyPanel(frame).locator(`.${HISTORY_CLASS.GROUP}`)).toHaveCount(0);
    await expect(clear).toBeDisabled();
    await expect.poll(() => readStoredHistory(sharedBrowserContext, frame)).toEqual([]);
    expect(page.url()).toBe(sourceUrl);
  });

  foblesTest("plain click navigates the top-level tab to a real scenario item after Continue", async ({ page }) => {
    const { frame, initial } = await openHistoryEditor(page);
    const sourceScope = await readHistoryScope(frame);
    const link = historyLink(frame, initial.name);
    const target = new URL((await link.getAttribute("href"))!);
    const sourceOrigin = new URL(page.url()).origin;
    expect(target.origin).toBe(sourceOrigin);
    expect(target.searchParams.get("fo")).toBe(canonicalGuid(SCENARIO.itemId));
    expect(target.searchParams.get("sc_content")).toBe(sourceScope.database);
    await link.click();
    const dialog = frame.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: TEST_CONST.FOBLES.LABELS.CONTINUE_BUTTON, exact: true }).click();
    await expectHistoryDestination(page, SCENARIO.itemId, sourceScope.database);
  });

  for (const modifier of ["Control", "Meta"] as const) {
    foblesTest(`${modifier}-click opens the real scenario item in a new tab and leaves the source URL unchanged`, async ({ page, sharedBrowserContext }) => {
      const { frame, initial } = await openHistoryEditor(page);
      const sourceUrl = page.url();
      const sourceScope = await readHistoryScope(frame);
      const link = historyLink(frame, initial.name);
      const target = new URL((await link.getAttribute("href"))!);
      expect(target.searchParams.get("sc_content")).toBe(sourceScope.database);
      const popupPromise = sharedBrowserContext.waitForEvent("page");
      await link.click({ modifiers: [modifier] });
      const popup = await popupPromise;
      try {
        await expectHistoryDestination(popup, SCENARIO.itemId, sourceScope.database);
        expect(new URL(popup.url()).origin).toBe(new URL(sourceUrl).origin);
        expect(page.url()).toBe(sourceUrl);
        await expect(frame.getByRole("dialog")).toBeHidden();
        await expect(historyPanel(frame)).toBeHidden();
      } finally {
        await popup.close();
        await page.bringToFront();
      }
      expect(page.url()).toBe(sourceUrl);
    });
  }
});