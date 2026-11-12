// @source-path [Fobles] src/background/fobles-utility-lock.ts
/// <reference types="chrome" />

import type { UtilityOwner } from "./background.types";
import {
  type UtilityLockMessage,
  type UtilityLockResponse,
} from "../shared/utility/fobles-utility-lock.messages.types";
import { UTILITY_LOCK_MESSAGE } from "../shared/utility/UTILITY_LOCK_MESSAGE.const";

const ownersByOrigin = new Map<string, UtilityOwner>();

function acquire(message: UtilityLockMessage, tabId: number | undefined): UtilityLockResponse {
  if (tabId === undefined) {
    return { acquired: false };
  }
  const current = ownersByOrigin.get(message.origin);
  if (!current || (current.tabId === tabId && current.ownershipId === message.ownershipId)) {
    ownersByOrigin.set(message.origin, { tabId, ownershipId: message.ownershipId, origin: message.origin });
    return { acquired: true, ownerTabId: tabId, ownerOwnershipId: message.ownershipId };
  }
  return { acquired: false, ownerTabId: current.tabId, ownerOwnershipId: current.ownershipId };
}

function release(message: UtilityLockMessage, tabId: number | undefined): void {
  if (tabId === undefined) {
    return;
  }
  const current = ownersByOrigin.get(message.origin);
  if (current?.tabId === tabId && current.ownershipId === message.ownershipId) {
    ownersByOrigin.delete(message.origin);
  }
}

async function takeOver(message: UtilityLockMessage, tabId: number | undefined): Promise<UtilityLockResponse> {
  if (tabId === undefined) {
    return { acquired: false };
  }
  const current = ownersByOrigin.get(message.origin);
  if (current && current.tabId !== tabId) {
    await chrome.tabs
      .sendMessage(current.tabId, {
        type: UTILITY_LOCK_MESSAGE.OWNERSHIP_LOST,
        ownershipId: current.ownershipId,
        origin: current.origin,
      })
      .catch(() => undefined);
  }
  ownersByOrigin.set(message.origin, { tabId, ownershipId: message.ownershipId, origin: message.origin });
  return { acquired: true, ownerTabId: tabId, ownerOwnershipId: message.ownershipId };
}

export function registerFoblesUtilityLock(): void {
  chrome.tabs.onRemoved.addListener((tabId) => {
    for (const [origin, owner] of ownersByOrigin) {
      if (owner.tabId === tabId) {
        ownersByOrigin.delete(origin);
      }
    }
  });
  chrome.runtime.onMessage.addListener((request: unknown, sender, sendResponse) => {
    if (!request || typeof request !== "object" || !("type" in request)) {
      return false;
    }
    const message = request as UtilityLockMessage;
    if (message.type === UTILITY_LOCK_MESSAGE.ACQUIRE) {
      sendResponse(acquire(message, sender.tab?.id));
      return false;
    }
    if (message.type === UTILITY_LOCK_MESSAGE.RELEASE) {
      release(message, sender.tab?.id);
      sendResponse({ released: true });
      return false;
    }
    if (message.type === UTILITY_LOCK_MESSAGE.TAKE_OVER) {
      void takeOver(message, sender.tab?.id).then(sendResponse);
      return true;
    }
    return false;
  });
}
