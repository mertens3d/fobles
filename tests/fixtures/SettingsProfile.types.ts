import type { BrowserContext } from "@playwright/test";

// A named, swappable starting state for every Fobles setting - applied once per test (see the
// foblesTest.extend auto fixture in playwright.ts) so a test never inherits leftover state from
// whichever test ran before it in this shared persistent profile. New profiles (e.g. a corrupt-data
// one - see docs/TODO.md) are added here as additional functions with this same signature, never
// by changing call sites. Deliberately uses only fixtures/extension.ts (not
// e2e/options-test-helpers.ts, which imports fixtures/playwright.ts) to avoid a circular import,
// since playwright.ts itself needs to call a profile from its own auto fixture.

export type SettingsProfile = (context: BrowserContext) => Promise<void>;
