// @source-path [fobles] src/content/shell/utility/fobles-utility-lock.ts
import { UTILITY_LOCK_MESSAGE, type UtilityLockResponse } from "../../../shared/utility/fobles-utility-lock.messages";

type OwnershipLostHandler = () => void;
const lostHandlersByOwnershipId = new Map<string, OwnershipLostHandler>();
let listenerRegistered = false;

export async function acquireFoblesUtilityLock(ownershipId: string): Promise<boolean> {
  registerOwnershipLostListener();
  const response = await send({ type: UTILITY_LOCK_MESSAGE.ACQUIRE, ownershipId, origin: location.origin });
  return response.acquired;
}

export async function takeOverFoblesUtilityLock(ownershipId: string): Promise<boolean> {
  registerOwnershipLostListener();
  const response = await send({ type: UTILITY_LOCK_MESSAGE.TAKE_OVER, ownershipId, origin: location.origin });
  return response.acquired;
}

export async function releaseFoblesUtilityLock(ownershipId: string): Promise<void> {
  lostHandlersByOwnershipId.delete(ownershipId);
  await chrome.runtime.sendMessage({ type: UTILITY_LOCK_MESSAGE.RELEASE, ownershipId, origin: location.origin });
}

export function subscribeFoblesUtilityLockLost(ownershipId: string, onLost: OwnershipLostHandler): () => void {
  registerOwnershipLostListener();
  lostHandlersByOwnershipId.set(ownershipId, onLost);
  return () => { if (lostHandlersByOwnershipId.get(ownershipId) === onLost) lostHandlersByOwnershipId.delete(ownershipId); };
}

function registerOwnershipLostListener(): void {
  if (listenerRegistered) return;
  listenerRegistered = true;
  chrome.runtime.onMessage.addListener((message: unknown) => {
    if (!message || typeof message !== "object" || !("type" in message) || message.type !== UTILITY_LOCK_MESSAGE.OWNERSHIP_LOST || !("ownershipId" in message) || typeof message.ownershipId !== "string") return;
    const handler = lostHandlersByOwnershipId.get(message.ownershipId);
    lostHandlersByOwnershipId.delete(message.ownershipId);
    handler?.();
  });
}

async function send(message: { type: string; ownershipId: string; origin: string }): Promise<UtilityLockResponse> {
  return await chrome.runtime.sendMessage(message) as UtilityLockResponse;
}
