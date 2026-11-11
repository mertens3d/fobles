

export type MemoryContext = Readonly<Record<string, unknown>>;

export type PerformanceWithMemory = Performance & {
  memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
};
