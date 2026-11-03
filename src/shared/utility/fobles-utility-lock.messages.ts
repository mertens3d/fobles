// @source-path [fobles] src/shared/utility/fobles-utility-lock.messages.ts
export const UTILITY_LOCK_MESSAGE = {
  ACQUIRE: "FOBLES_UTILITY_LOCK_ACQUIRE",
  RELEASE: "FOBLES_UTILITY_LOCK_RELEASE",
  TAKE_OVER: "FOBLES_UTILITY_LOCK_TAKE_OVER",
  OWNERSHIP_LOST: "FOBLES_UTILITY_LOCK_OWNERSHIP_LOST",
} as const;

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
