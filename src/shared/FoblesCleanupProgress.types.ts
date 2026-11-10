export type FoblesCleanupProgress = {
  removed: number;
  total: number;
  remainingSeconds: number;
  phase: "disposing" | "failsafe" | "complete";
};
