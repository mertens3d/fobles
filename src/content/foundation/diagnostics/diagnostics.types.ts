export type HealthState = "healthy" | "degraded" | "unhealthy";

export type HealthReport = {
  owner: string;
  state: HealthState;
  checkedAt: number;
  lastProgressAt: number;
  noProgressMs: number;
  reason?: string;
  activeCount: number;
  recoveryCount: number;
  children?: readonly HealthReport[];
};

export type HealthProvider = { getHealth: () => HealthReport };

export type ChromiumPerformance = Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } };
