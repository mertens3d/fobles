export type LockMessage = { type: string; ownershipId: string; origin: string };

export type RuntimeResponse = { acquired: boolean } | null;
