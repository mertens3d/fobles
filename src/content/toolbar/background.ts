import { CSS_PROPERTIES, SELECTORS } from "../constants";
import { SITECORE } from "../sitecore";
import type { ToolbarContext } from "./types";

const observedDocuments = new WeakSet<Document>();

export function updateToolbarBackground(context: ToolbarContext): void {
  const container = context.doc.querySelector<HTMLElement>(
    SELECTORS.TOOLBAR_CONTAINER,
  );
  if (!container) return;

  container.style.removeProperty(CSS_PROPERTIES.TOOLBAR_BACKGROUND);
  const globalHeader = context.doc.querySelector<HTMLElement>(SITECORE.SELECTORS.GLOBAL_HEADER);
  if (!globalHeader) return;

  const backgroundColor = context.win.getComputedStyle(globalHeader).backgroundColor;
  if (
    backgroundColor &&
    backgroundColor !== "transparent" &&
    backgroundColor !== "rgba(0, 0, 0, 0)"
  ) {
    container.style.setProperty(CSS_PROPERTIES.TOOLBAR_BACKGROUND, backgroundColor);
  }
}

export function observeToolbarBackground(context: ToolbarContext): void {
  if (observedDocuments.has(context.doc)) return;

  const header = context.doc.querySelector(SITECORE.SELECTORS.GLOBAL_HEADER);
  if (!header) return;

  const observer = new MutationObserver(() => updateToolbarBackground(context));
  observer.observe(header, { childList: true, subtree: true });
  observedDocuments.add(context.doc);
}
