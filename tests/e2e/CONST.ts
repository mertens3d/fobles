import { scenarios } from "./scenarios";
import type { TestSpeed } from "./types";

const ATTRIBUTES = {
  FOBLE_BUTTON: "data-is-foble-button",
  FOBLE_WRAPPER: "data-foble-wrapper",
  NAV: "data-foble-nav",
  NAV_OWNER: "data-foble-nav-owner",
  MENU_URL: "data-foble-menu-url",
  MENU_VISIBLE: "data-visible",
  TREE_JUMP_PATH: "data-foble-tree-jump-path",
  VALUE: {
    PRESENT: "1",
    TRUE: "true",
    FALSE: "false",
  },
} as const;

export const CONST = {
  ATTRIBUTES,
  SCENARIOS: scenarios,
  LOGGING: {
    IGNORED_BROWSER_ERRORS: [
      "auth.sitecorecloud.io/favicon.ico",
      "/-/icon/Applications/48x48/chart.png",
      "/-/icon/Applications/48x48/database.png",
      "Tracking Prevention blocked access to storage for https://s.gravatar.com/avatar/",
      "Tracking Prevention blocked access to storage for https://i0.wp.com/cdn.auth0.com/avatars/gr.png",
      "Permissions policy violation: unload is not allowed in this document.",
    ],
  },
  SPEED: {
    SELECTED: "WALK" as TestSpeed,
    SETTINGS: {
      CRAWL: { STEP_WAIT_MS: 3_000, MOUSE_PX_PER_SECOND: 800 },
      WALK: { STEP_WAIT_MS: 1_000, MOUSE_PX_PER_SECOND: 2_000 },
      RUN: { STEP_WAIT_MS: 250, MOUSE_PX_PER_SECOND: 4_000 },
    } satisfies Record<
      TestSpeed,
      { STEP_WAIT_MS: number; MOUSE_PX_PER_SECOND: number }
    >,
  },
  NAVIGATION: {
    NEW_TAB_HOLD_MULTIPLIER: 2,
    HOLD_MULTIPLIER: 2,
  },
  MOUSE: {
    SPEED_MULTIPLIER: 1,
    UPDATE_HZ: 60,
    HOVER_CLEARANCE_PX: 24,
  },
  MARKER: {
    ID: "playwright-mouse-marker",
    CSS_TEXT: [
      "position: fixed",
      "left: 0px",
      "top: 0px",
      "z-index: 2147483647",
      "width: 12px",
      "height: 12px",
      "border: 2px solid #fff",
      "border-radius: 50%",
      "background: #d6336c",
      "box-shadow: 0 0 0 2px #d6336c, 0 2px 6px rgba(0, 0, 0, .45)",
      "pointer-events: none",
      "transform: translate(-50%, -50%)",
      "transition: left 16ms linear, top 16ms linear",
      "display: block !important",
      "visibility: visible !important",
      "opacity: 1 !important",
    ],
  },
  ENVIRONMENT: {
    ENV_VAR: "SITECORE_TEST_ENVIRONMENTS",
    AUTH_DIR_ENV_VAR: "PLAYWRIGHT_AUTH_DIR",
    AUTH_DIR: "./test-artifacts/auth",
  },
  SITECORE: {
    SELECTORS: {
      EDITOR_TABS: "#EditorTabs",
      LBOLT_BUTTON: "button.foble-nav-lbolt-button",
      TOOLBAR: `[${ATTRIBUTES.NAV}]`,
      QUICK_MENU_TRIGGER: `[${ATTRIBUTES.NAV_OWNER}='${ATTRIBUTES.VALUE.PRESENT}']`,
      QUICK_MENU: ".fobles-quick-menu",
      TOOLBAR_TOGGLE_BUTTON: "button[title='Toggle Foble navigation']",
      MENU_TRIGGER: ".fobles-quick-menu-trigger",
      TREE_JUMP_BUTTON: `[${ATTRIBUTES.TREE_JUMP_PATH}]`,
      MENU_URL_BUTTON: `[${ATTRIBUTES.MENU_URL}]`,
    },
    LABELS: {
      TOGGLE_FOBLES: /toggle fobles/i,
    },
  },
  TIMEOUTS: {
    DISCOVERY_MS: 30_000,
    MENU_VISIBLE_MS: 15_000,
    MENU_TRIGGER_VISIBLE_MS: 30_000,
    URL_WAIT_MS: 30_000,
    TEST_SUITE_MS: 10 * 60 * 1_000,
    STEP_TIMEOUT_MS: 25_000,
  },
} as const;
