import { FOBLES } from "./constants/fobles-constants";
import { SITECORE } from "./constants/sitecore-constants";
import { TESTING } from "./constants/testing-constants";

export const CONST = {
  DOM: {
    SELECTORS: {
      FRAMES: "iframe,frame",
    },
  },
  ENVIRONMENT: {
    ENV_VAR: "SITECORE_TEST_ENVIRONMENTS",
    AUTH_DIR_ENV_VAR: "PLAYWRIGHT_AUTH_DIR",
    AUTH_DIR: "./tests/test-artifacts/auth",
  },
  FOBLES,
  SITECORE,
  TESTING,
} as const;