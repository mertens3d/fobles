import type { BrowserContext, Page } from "@playwright/test";

// MV3 service workers register asynchronously - if the worker hasn't spun up yet (e.g. right
// after launchPersistentContext), wait for it instead of assuming serviceWorkers() is non-empty.
export async function getExtensionId(context: BrowserContext): Promise<string> {
  const [existingWorker] = context.serviceWorkers();
  const worker = existingWorker ?? (await context.waitForEvent("serviceworker"));
  return new URL(worker.url()).host;
}

// Options/popup pages are genuine extension contexts (unlike the injected Sitecore content
// script), so they're the only place tests can read/write chrome.storage directly.
export async function openExtensionPage(
  context: BrowserContext,
  extensionId: string,
  page: "options" | "popup",
): Promise<Page> {
  const extensionPage = await context.newPage();
  await extensionPage.goto(`chrome-extension://${extensionId}/${page}.html`);
  return extensionPage;
}
