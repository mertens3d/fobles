import { _FOBLES_BASE_CONST } from "./constants_partials/base/fobles-constants";
import { _SITECORE_BASE_CONST } from "./constants_partials/base/_sitecore-constants";
import { TESTING } from "./constants_partials/testing-constants";
import { BLUR_KEEP } from "./constants_partials/blur-keep-selectors";

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
  FOBLES: _FOBLES_BASE_CONST,
  SITECORE: _SITECORE_BASE_CONST,
  TESTING,
} as const;
