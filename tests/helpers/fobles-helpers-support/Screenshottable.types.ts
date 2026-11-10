import type { Locator } from "@playwright/test";

export type Screenshottable = Pick<Locator, "screenshot">;
