export type TestSpeed = "CRAWL" | "WALK" | "SPRINT";

export type SitecoreVersion = "xm" | "xp" | "sitecoreai";

export type SitecoreEnvironment = {
  endpoint: string;
  friendlyName: string;
  version: SitecoreVersion;
};

export type TestEnvironment = SitecoreEnvironment & {
  baseUrl: string;
  loginUrl: string;
};
