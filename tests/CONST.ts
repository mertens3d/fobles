import { FOBLES } from "./constants/fobles-constants";
import { SITECORE } from "./constants/sitecore-constants";
import { TESTING } from "./constants/testing-constants";
import { BLUR_KEEP } from "./constants/blur-keep-selectors";

export const CONST = {
  BLUR_KEEP,
  DOM: {
    SELECTORS: {
      FRAMES: "iframe,frame",
    },
  },
  ENVIRONMENT: {
    AUTH_DIR_ENV_VAR: "PLAYWRIGHT_AUTH_DIR",
    AUTH_DIR: "./tests/test-artifacts/auth",
  },
  FOBLES,
  SITECORE,
  TESTING,
} as const;
