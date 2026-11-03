// @source-path [fobles] tests/e2e/extension-ui/toolbar-integration/item-history.helpers.ts

import type { BrowserContext } from "@playwright/test";
import { SITECORE } from "../../../../src/constants/sitecore";
import { HISTORY_CLASS } from "../../../../src/content/toolbar/history/history.const";
import { ITEM_HISTORY } from "../../../../src/shared/item-history/item-history.const";
import { historyStorageKey } from "../../../../src/shared/item-history/item-history-model";
import type { HistoryItem, HistoryScope, HistoryVisit } from "../../../../src/shared/item-history/item-history.types";
import { expect, type Frame, type Locator, type Page } from "../../../fixtures/playwright";
import { openContentEditor } from "../../../fixtures/sitecore";
import { findFoblesFrame, findFrameWithSelector } from "../../../helpers/frame-finder";
import { STRATEGY_SCENARIOS } from "../../strategies/support/strategy-scenarios";

export const SCENARIO = STRATEGY_SCENARIOS.DROP_LINK;

export function canonicalGuid(id: string): string {
  const unbraced = id.trim().replace(/[{}]/g, "").toUpperCase();
  const dashed = /^[\dA-F]{32}$/.test(unbraced)
    ? `${unbraced.slice(0, 8)}-${unbraced.slice(8, 12)}-${unbraced.slice(12, 16)}-${unbraced.slice(16, 20)}-${unbraced.slice(20)}`
    : unbraced;
  return `{${dashed}}`;
}

export async function readQuickInfo(frame: Frame): Promise<HistoryVisit> {
  return frame.evaluate(({ selector, labels }) => {
    const values: Record<string, string> = {};
    for (const table of document.querySelectorAll<HTMLTableElement>(selector)) {
      for (const row of Array.from(table.rows)) {
        const label = row.cells.item(0)?.textContent?.trim().toLowerCase() ?? "";
        for (const [key, prefix] of Object.entries(labels)) {
          if (label.startsWith(prefix.toLowerCase())) {
            const cell = row.cells.item(1);
            const input = cell?.querySelector<HTMLInputElement>("input.scEditorHeaderQuickInfoInput[readonly]");
            values[key] = (key === "name" ? cell?.querySelector("span")?.textContent : input?.value) ??
              cell?.textContent ?? "";
          }
        }
      }
    }
    return { id: values.id?.trim() ?? "", name: values.name?.trim() ?? "", path: values.path?.trim() ?? "" };
  }, {
    selector: SITECORE.SELECTORS.QUICK_INFO_TABLE,
    labels: {
      id: SITECORE.QUICK_INFO.LABEL_PREFIX.ITEM_ID,
      name: SITECORE.QUICK_INFO.LABEL_PREFIX.ITEM_NAME,
      path: SITECORE.QUICK_INFO.LABEL_PREFIX.ITEM_PATH,
    },
  });
}

export function historyPanel(frame: Frame): Locator {
  return frame.locator(`.${HISTORY_CLASS.PANEL}`);
}

export function historyLink(frame: Frame, name: string): Locator {
  return historyPanel(frame).getByRole("link", { name, exact: true });
}

export async function pinHistory(frame: Frame): Promise<void> {
  const tab = frame.locator(`.${HISTORY_CLASS.TAB}`);
  if (await tab.getAttribute("aria-pressed") !== "true") {
    await tab.click();
  }
  await expect(tab).toHaveAttribute("aria-pressed", "true");
  await expect(historyPanel(frame)).toBeVisible();
}

export async function openHistoryEditor(page: Page): Promise<{ frame: Frame; initial: HistoryVisit }> {
  await openContentEditor(page, SCENARIO.itemId);
  const frame = await findFoblesFrame(page);
  await expect.poll(async () => canonicalGuid((await readQuickInfo(frame)).id)).toBe(canonicalGuid(SCENARIO.itemId));
  const initial = await readQuickInfo(frame);
  expect(initial.name).not.toBe("");
  expect(initial.path).toMatch(/^\/sitecore\//i);
  await pinHistory(frame);
  await expect(historyLink(frame, initial.name)).toBeVisible();
  return { frame, initial };
}

export async function mutateQuickInfo(frame: Frame, visit: HistoryVisit): Promise<void> {
  await frame.evaluate(({ selector, fields }) => {
    const matched = new Set<string>();
    for (const table of document.querySelectorAll<HTMLTableElement>(selector)) {
      for (const row of Array.from(table.rows)) {
        const label = row.cells.item(0)?.textContent?.trim().toLowerCase() ?? "";
        for (const field of fields) {
          if (label.startsWith(field.label.toLowerCase())) {
            const cell = row.cells.item(1);
            if (!cell) {
              throw new Error(`Quick Info value cell missing: ${field.label}`);
            }
            const input = cell.querySelector<HTMLInputElement>("input.scEditorHeaderQuickInfoInput[readonly]");
            const span = cell.querySelector("span");
            if (field.label === "Item Name" && span) {
              span.textContent = field.value;
            } else if (input) {
              input.value = field.value;
              input.setAttribute("value", field.value);
              input.dispatchEvent(new Event("input", { bubbles: true }));
            } else {
              cell.textContent = field.value;
            }
            matched.add(field.label);
          }
        }
      }
    }
    if (matched.size !== fields.length) {
      throw new Error("The real Quick Info tables do not contain all required metadata rows");
    }
  }, {
    selector: SITECORE.SELECTORS.QUICK_INFO_TABLE,
    fields: [
      { label: SITECORE.QUICK_INFO.LABEL_PREFIX.ITEM_ID, value: visit.id },
      { label: SITECORE.QUICK_INFO.LABEL_PREFIX.ITEM_NAME, value: visit.name },
      { label: SITECORE.QUICK_INFO.LABEL_PREFIX.ITEM_PATH, value: visit.path },
    ],
  });
  await expect.poll(() => historyLink(frame, visit.name).count()).toBe(1);
}

export async function readHistoryScope(frame: Frame): Promise<HistoryScope> {
  return frame.evaluate(({ databaseSelector, databaseKeys }) => {
    const url = new URL(location.href);
    const database = (databaseKeys.map((key) => url.searchParams.get(key)?.trim()).find(Boolean) ||
      document.querySelector<HTMLInputElement>(databaseSelector)?.value.trim() || "master").toLowerCase();
    return { origin: url.origin, database };
  }, { databaseSelector: SITECORE.SELECTORS.DATABASE_INPUT, databaseKeys: SITECORE.SEARCH_PARAMS.DATABASE_KEYS });
}

export async function mutateHistoryDatabase(frame: Frame, database: string, placement: "outside" | "inside"): Promise<void> {
  await frame.evaluate(({ databaseSelector, databaseKeys, editorsSelector, database, placement }) => {
    const input = document.querySelector<HTMLInputElement>(databaseSelector);
    const editors = document.querySelector(editorsSelector);
    if (!input || !editors) {
      throw new Error("The real Content Editor database input or Editors container is missing");
    }
    const parent = placement === "inside" ? editors : document.body;
    if ((placement === "inside") !== editors.contains(input)) {
      parent.appendChild(input);
    }
    const url = new URL(location.href);
    if (databaseKeys.some((key) => url.searchParams.get(key)?.trim())) {
      for (const key of databaseKeys) {
        url.searchParams.set(key, database);
      }
      history.replaceState(history.state, "", url);
    }
    input.value = database;
    input.setAttribute("value", database);
  }, {
    databaseSelector: SITECORE.SELECTORS.DATABASE_INPUT,
    databaseKeys: SITECORE.SEARCH_PARAMS.DATABASE_KEYS,
    editorsSelector: SITECORE.SELECTORS.EDITORS,
    database,
    placement,
  });
}

export async function readStoredHistoryScopes(context: BrowserContext): Promise<Record<string, HistoryItem[]>> {
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
  return worker.evaluate(async (prefix) => {
    const stored = await chrome.storage.local.get(null);
    return Object.fromEntries(Object.entries(stored).filter(([key]) => key.startsWith(prefix))) as Record<string, HistoryItem[]>;
  }, ITEM_HISTORY.STORAGE_KEY_PREFIX);
}

export async function readStoredHistory(context: BrowserContext, frame: Frame): Promise<HistoryItem[]> {
  const scope = await readHistoryScope(frame);
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
  return worker.evaluate(async (key) => {
    const stored = await chrome.storage.local.get(key);
    return (stored[key] ?? []) as HistoryItem[];
  }, historyStorageKey(scope));
}

export async function expectHistoryDestination(page: Page, id: string, database: string): Promise<void> {
  await page.waitForURL((url) => url.searchParams.get("fo") === canonicalGuid(id));
  const url = new URL(page.url());
  expect(url.searchParams.get("fo")).toBe(canonicalGuid(id));
  expect(url.searchParams.get("sc_content")).toBe(database);
  expect(decodeURIComponent(url.pathname)).toBe(decodeURIComponent(SITECORE.RELATIVE_PATHS_ENCODED.CONTENT_EDITOR_LEGACY));
  const editor = await findFrameWithSelector(page, SITECORE.SELECTORS.QUICK_INFO_TABLE, "destination Quick Info", 15_000);
  await expect.poll(async () => canonicalGuid((await readQuickInfo(editor)).id)).toBe(canonicalGuid(id));
}