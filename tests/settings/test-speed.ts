import type { TestSpeed } from "../e2e/types";

// Flip by hand to slow down (CRAWL) or speed up (SPRINT) every test's own pacing - see
// tests/e2e/CONST.ts's SPEED.SETTINGS for what each speed actually controls.
export const SELECTED_SPEED: TestSpeed = "WALK";
