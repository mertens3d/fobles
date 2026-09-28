// Fobles-generated selectors/attributes/classes asserted against by the strategy-scenario tests.
// Duplicated (not imported) from src/content/features/augmentor/constants.ts, since these tests
// exercise the built extension at runtime rather than the TypeScript source.

import { CONST } from "../CONST";

export const FOBLES_HIDDEN_CLASS_PATTERN = new RegExp(CONST.FOBLES.CLASSES.HIDDEN);

// Per-field screenshot names built from a test's own base name plus its stage. Restored reuses the
// default-stage suffix, since it should look identical to default.
const FIELD_SCREENSHOT_STAGE_SUFFIX = {
  DEFAULT: "",
  FOBLES_ON: "-fobles-on",
} as const;

export function fieldScreenshotName(
  baseName: string,
  stage: keyof typeof FIELD_SCREENSHOT_STAGE_SUFFIX,
): string {
  return `${baseName}${FIELD_SCREENSHOT_STAGE_SUFFIX[stage]}.png`;
}
