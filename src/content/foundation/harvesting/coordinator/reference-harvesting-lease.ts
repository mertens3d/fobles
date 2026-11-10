// @source-path [fobles] src/content/foundation/harvesting/coordinator/reference-harvesting-lease.ts
import {
  type UtilityLockResponse,
} from "../../../../shared/utility/fobles-utility-lock.messages.types.ts";
import { UTILITY_LOCK_MESSAGE } from "../../../../shared/utility/UTILITY_LOCK_MESSAGE.const.ts";
import { HARVESTING_LEASE } from "./reference-harvesting-lease.const.ts";
import type { HarvestingLeaseOptions } from "./reference-harvesting-lease.types.ts";

export async function runWithReferenceHarvestingLease<T>(run: () => Promise<T>, options: HarvestingLeaseOptions = {}): Promise<T> {
  const ownershipId = crypto.randomUUID();
  const timeoutMs = options.timeoutMs ?? HARVESTING_LEASE.ACQUISITION_TIMEOUT_MS;
  const startedAt = performance.now();
  let acquired = false;
  try {
    while (!acquired) {
      options.signal?.throwIfAborted();
      if (performance.now() - startedAt >= timeoutMs) {
        throw new Error(`Timed out waiting for the Fobles harvesting lease after ${timeoutMs} ms`);
      }
      acquired = await acquire(ownershipId);
      if (!acquired) {
        await delay(Math.min(HARVESTING_LEASE.RETRY_INTERVAL_MS, timeoutMs));
      }
    }
    options.signal?.throwIfAborted();
    return await run();
  } finally {
    if (acquired) {
      await release(ownershipId);
    }
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
