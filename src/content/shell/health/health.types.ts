// @source-path [fobles] src/content/shell/health/health.types.ts
export type HealthState = "healthy" | "degraded" | "unhealthy";
export type HealthReport = { owner: string; state: HealthState; checkedAt: number; lastProgressAt: number; noProgressMs: number; reason?: string; activeCount: number; recoveryCount: number; children?: readonly HealthReport[]; };
export type HealthProvider = { getHealth: () => HealthReport; };
