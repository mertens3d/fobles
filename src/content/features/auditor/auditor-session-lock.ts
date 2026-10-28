// @source-path [fobles] src/content/features/auditor/auditor-session-lock.ts
export const AUDITOR_LOCK_ACQUIRE = "FOBLES_AUDITOR_LOCK_ACQUIRE" as const;
export const AUDITOR_LOCK_RELEASE = "FOBLES_AUDITOR_LOCK_RELEASE" as const;
export type AuditorLockResult = {
    acquired: boolean;
};
export async function acquireAuditorSessionLock(): Promise<boolean> {
    const result = await chrome.runtime.sendMessage({ type: AUDITOR_LOCK_ACQUIRE });
    return result.acquired;
}
export async function releaseAuditorSessionLock(): Promise<void> {
    await chrome.runtime.sendMessage({ type: AUDITOR_LOCK_RELEASE });
}
