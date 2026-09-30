import type { BrowserContext, Locator, Page } from "@playwright/test";
import { clickWithMouseMarker, ensureMouseMarkerExists } from "../helpers/mouse-proxy";
import { bringPageToFront } from "../helpers/page-switch";
import { CONST } from "../CONST";

// MV3 service workers register asynchronously - if the worker hasn't spun up yet (e.g. right
// after launchPersistentContext), wait for it instead of assuming serviceWorkers() is non-empty.
export async function getExtensionId(context: BrowserContext): Promise<string> {
  const [existingWorker] = context.serviceWorkers();
  const worker = existingWorker ?? (await context.waitForEvent("serviceworker"));
  return new URL(worker.url()).host;
}

// Options/popup pages are genuine extension contexts (unlike the injected Sitecore content
// script), so they're the only place tests can reach the extension's own settings UI directly.
export async function openExtensionPage(
  context: BrowserContext,
  extensionId: string,
  page: "options" | "popup",
): Promise<Page> {
  const extensionPage = await context.newPage();
  await extensionPage.goto(`chrome-extension://${extensionId}/${page}.html`);
  await bringPageToFront(extensionPage);
  await ensureMouseMarkerExists(extensionPage);
  return extensionPage;
}

export async function clickExtensionControl(
  page: Page,
  control: Locator,
  label: string,
): Promise<void> {
  await bringPageToFront(page);
  await clickWithMouseMarker(page, control, label);
}

export async function fillExtensionInput(
  page: Page,
  input: Locator,
  value: string,
  label: string,
): Promise<void> {
  await bringPageToFront(page);
  await clickWithMouseMarker(page, input, label);
  await input.fill(value);
}

export async function setExtensionCheckbox(
  page: Page,
  checkbox: Locator,
  checked: boolean,
  label: string,
): Promise<void> {
  if ((await checkbox.isChecked()) !== checked) {
    await bringPageToFront(page);
    await clickWithMouseMarker(page, checkbox, label);
  }
}

// Sets the popup's "Warn before same-tab Fobles navigation" checkbox via a real click (it saves
// on change, no separate Save button) rather than writing chrome.storage directly - tests should
// only ever reach this setting the same way a real user would.
export async function setFoblesNavWarningVisible(
  context: BrowserContext,
  extensionId: string,
  visible: boolean,
): Promise<void> {
  const popupPage = await openExtensionPage(context, extensionId, "popup");
  const preferenceId = CONST.TESTING.POPUP.PREFERENCE_IDS[1];
  const checkbox = popupPage.locator(
    `${CONST.TESTING.POPUP.PREFERENCE_SELECTOR_PREFIX}${preferenceId}`,
  );
  await setExtensionCheckbox(popupPage, checkbox, visible, preferenceId);
  await popupPage.close();
}
