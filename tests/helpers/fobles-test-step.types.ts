export type FoblesTestStep = (
  title: string,
  body: (fullTitle: string) => Promise<void>,
  options?: { timeout?: number; screenshot?: boolean },
) => Promise<void>;