// @source-path [fobles] src/content/foundation/harvesting/coordinator/reference-harvesting-lease.ts
import { UTILITY_LOCK_MESSAGE, type UtilityLockResponse } from "../../../../shared/utility/fobles-utility-lock.messages";
const RETRY_INTERVAL_MS = 250;
export async function runWithReferenceHarvestingLease<T>(run: () => Promise<T>): Promise<T> {
  const ownershipId = crypto.randomUUID();
  let acquired = false;
  try {
    while (!acquired) {
      acquired = await acquire(ownershipId);
      if (!acquired) await delay(RETRY_INTERVAL_MS);
    }
    return await run();
  } finally {
    if (acquired) await release(ownershipId);
  }
}
async function acquire(ownershipId: string): Promise<boolean> {
  const response = await chrome.runtime.sendMessage<unknown, UtilityLockResponse>({
    type: UTILITY_LOCK_MESSAGE.ACQUIRE,
    ownershipId,
    origin: location.origin,
  });
  return response.acquired;
}
async function release(ownershipId: string): Promise<void> {
  await chrome.runtime.sendMessage({ type: UTILITY_LOCK_MESSAGE.RELEASE, ownershipId, origin: location.origin });
}
function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
