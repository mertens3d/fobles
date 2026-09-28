export type TestSpeed = "CRAWL" | "WALK" | "SPRINT";

export type SitecoreVersion = "xm" | "xp" | "ai";

export type SitecoreEnvironment = {
  endpoint: string;
  friendlyName: string;
  version: SitecoreVersion;
};

export type TestEnvironment = SitecoreEnvironment & {
  baseUrl: string;
  loginUrl: string;
};


export type FoblesTestStep = (
  title: string,
  body: (fullTitle: string) => Promise<void>,
  options?: { timeout?: number; screenshot?: boolean },
) => Promise<void>;