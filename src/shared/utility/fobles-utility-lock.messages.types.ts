import type { UTILITY_LOCK_MESSAGE } from "./UTILITY_LOCK_MESSAGE.const";

export type UtilityLockAcquireMessage = {
  type: typeof UTILITY_LOCK_MESSAGE.ACQUIRE;
  ownershipId: string;
  origin: string;
};

export type UtilityLockReleaseMessage = {
  type: typeof UTILITY_LOCK_MESSAGE.RELEASE;
  ownershipId: string;
  origin: string;
};

export type UtilityLockTakeOverMessage = {
  type: typeof UTILITY_LOCK_MESSAGE.TAKE_OVER;
  ownershipId: string;
  origin: string;
};

export type UtilityLockMessage = UtilityLockAcquireMessage | UtilityLockReleaseMessage | UtilityLockTakeOverMessage;

export type UtilityLockResponse = { acquired: boolean; ownerTabId?: number; ownerOwnershipId?: string };
