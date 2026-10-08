import type { TestSpeed } from "./test-speed.types";
export const SELECTED_SPEED: TestSpeed = "WALK";
export const RECORD_VIDEO = false;
// Report screenshots (createStep's auto-capture, attachLocatorScreenshot/attachPageScreenshot)
// cost real time (mask/blur detection, encoding, disk writes) on every step - turn off when a run
// doesn't need the HTML report's images, e.g. a quick pass/fail check. Does not affect
// toHaveScreenshot() visual-regression baselines, which are real assertions, not reporting.
export const CAPTURE_STEP_SCREENSHOTS = true;