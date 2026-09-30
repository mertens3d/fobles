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