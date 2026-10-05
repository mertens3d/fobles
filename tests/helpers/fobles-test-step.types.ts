export type FoblesStep = (
  title: string,
  body: (fullTitle: string) => Promise<void>,
  options?: { timeout?: number; screenshot?: boolean },
) => Promise<void>;