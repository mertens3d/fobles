// @source-path [fobles] src/content/item-history/quick-info-observer.ts

import { SITECORE } from "../../constants/sitecore.const.ts";
import { extensionLog } from "../logger.ts";
import { ITEM_HISTORY_CAPTURE } from "./item-history.const.ts";
import type { ItemHistoryCleanup, QuickInfoChangeHandler } from "./item-history.types.ts";

function getElement(node: Node): Element | null {
  return node.nodeType === 1 ? node as Element : node.parentElement;
}

function isQuickInfoOrDatabase(node: Node): boolean {
  const element = getElement(node);
  return Boolean(element?.closest(SITECORE.SELECTORS.QUICK_INFO_TABLE) ||
    element?.matches(SITECORE.SELECTORS.DATABASE_INPUT));
}

function containsQuickInfoOrDatabase(node: Node): boolean {
  const element = getElement(node);
  return isQuickInfoOrDatabase(node) || Boolean(element?.querySelector(
    `${SITECORE.SELECTORS.QUICK_INFO_TABLE}, ${SITECORE.SELECTORS.DATABASE_INPUT}`,
  ));
}

function isRelevantMutation(mutation: MutationRecord): boolean {
  return isQuickInfoOrDatabase(mutation.target) || (mutation.type === "childList" &&
    [...mutation.addedNodes, ...mutation.removedNodes].some(containsQuickInfoOrDatabase));
}

export function observeQuickInfo(doc: Document, onChange: QuickInfoChangeHandler): ItemHistoryCleanup {
  const view = doc.defaultView;
  let stopped = false;
  let debounceTimer: number | undefined;
  let pollingTimer: number | undefined;
  let observer: MutationObserver | undefined;
  let observedTarget: Element | null = null;
  let observedDatabase: Element | null = null;

  function notify(): void {
    if (!stopped) {
      try {
        onChange();
      } catch (error) {
        extensionLog.error("Item history: Quick Info capture failed", error);
      }
    }
  }

  function scheduleCapture(): void {
    if (!stopped && view) {
      view.clearTimeout(debounceTimer);
      debounceTimer = view.setTimeout(() => {
        debounceTimer = undefined;
        notify();
      }, ITEM_HISTORY_CAPTURE.DEBOUNCE_MS);
    }
  }

  function handleInput(event: Event): void {
    const target = event.target as Node | null;
    if (target && isQuickInfoOrDatabase(target)) {
      scheduleCapture();
    }
  }

  function attachObserver(initial = false): void {
    if (!stopped && view) {
      const target = doc.querySelector(SITECORE.SELECTORS.EDITORS) ??
        doc.querySelector(SITECORE.SELECTORS.EDITOR_HEADER)?.parentElement ?? null;
      const databaseInput = doc.querySelector(SITECORE.SELECTORS.DATABASE_INPUT);
      if (target !== observedTarget || databaseInput !== observedDatabase) {
        observer?.disconnect();
        observedTarget = target;
        observedDatabase = databaseInput;
        observer ??= new view.MutationObserver((mutations) => {
          if (mutations.some(isRelevantMutation)) {
            scheduleCapture();
          }
        });
        if (target) {
          observer.observe(target, {
            ...ITEM_HISTORY_CAPTURE.MUTATION_OPTIONS,
            attributeFilter: [...ITEM_HISTORY_CAPTURE.MUTATION_OPTIONS.attributeFilter],
          });
        }
        if (databaseInput && !target?.contains(databaseInput)) {
          observer.observe(databaseInput, { attributes: true, attributeFilter: ["value"] });
        }
        if (!initial) {
          scheduleCapture();
        }
      }
    }
  }

  function cleanup(): void {
    stopped = true;
    observer?.disconnect();
    observer = undefined;
    observedTarget = null;
    observedDatabase = null;
    view?.clearTimeout(debounceTimer);
    view?.clearInterval(pollingTimer);
    view?.removeEventListener(ITEM_HISTORY_CAPTURE.PAGE_HIDE_EVENT, cleanup);
    for (const event of ITEM_HISTORY_CAPTURE.INPUT_EVENTS) {
      doc.removeEventListener(event, handleInput, true);
    }
  }

  if (view) {
    view.addEventListener(ITEM_HISTORY_CAPTURE.PAGE_HIDE_EVENT, cleanup);
    for (const event of ITEM_HISTORY_CAPTURE.INPUT_EVENTS) {
      doc.addEventListener(event, handleInput, true);
    }
    attachObserver(true);
    pollingTimer = view.setInterval(() => attachObserver(), ITEM_HISTORY_CAPTURE.ATTACHMENT_CHECK_MS);
  }
  notify();
  return cleanup;
}