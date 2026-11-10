import type { BrowserContext } from "@playwright/test";

export type WorkerFixtures = { sharedBrowserContext: BrowserContext; sharedPage: import("@playwright/test").Page };

export type TestFixtures = { resetTestSettings: void };
