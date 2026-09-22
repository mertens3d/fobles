import { scenarios } from "./scenarios";
import { SELECTED_SPEED } from "../settings/test-speed";
import type { TestSpeed } from "./types";

export const CONST = {
  SCENARIOS: scenarios,
  SPEED: {
    SELECTED: SELECTED_SPEED,
    SETTINGS: {
      CRAWL: { STEP_WAIT_MS: 3_000, MOUSE_PX_PER_SECOND: 800 },
      WALK: { STEP_WAIT_MS: 1_000, MOUSE_PX_PER_SECOND: 2_000 },
      SPRINT: { STEP_WAIT_MS: 0, MOUSE_PX_PER_SECOND: 4_000 },
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
  CLICK_FLASH: {
    // Dark red - marker's normal pink (#d6336c = 214,51,108) blended 2/3 of the way to black
    // (#471124), then shifted 1/3 of the way from that toward pure red (#ff0000) since #471124
    // read as near-black on screen.
    COLOR: "#840b18",
    DURATION_MS: 400,
  },
  ENVIRONMENT: {
    ENV_VAR: "SITECORE_TEST_ENVIRONMENTS",
    AUTH_DIR_ENV_VAR: "PLAYWRIGHT_AUTH_DIR",
    AUTH_DIR: "./tests/test-artifacts/auth",
  },
  SITECORE: {
    PATHS: {
      CONTENT_EDITOR: "/sitecore/shell/Applications/Content Editor.aspx?sc_bw=1",
      LICENSE_STARTPAGE: "/sitecore/client/Applications/LicenseOptions/StartPage",
      IDENTITY_AUTHORIZE: "/connect/authorize",
    },
    SELECTORS: {
      TOOLBAR_CONTAINER: ".fobles-toolbar-container",
      QUICK_MENU_TRIGGER: "[data-fobles-nav-owner='1']",
      QUICK_MENU: ".fobles-quick-menu",
      TOOLBAR_TOGGLE_BUTTON: "button[title='Toggle Fobles navigation']",
      MENU_TRIGGER: ".fobles-quick-menu-trigger",
      PROXY_BUTTONS_TRIGGER: ".fobles-proxy-buttons-trigger",
      TOOLBAR_CLOSE_BUTTON: ".fobles-toolbar-close-button",
      LBOLT_BUTTON: "button.fobles-nav-lbolt-button",
      CONTENT_TAB: "span.scEditorTabHeaderNormal",
      QUICK_INFO_TABLE: ".scEditorQuickInfo",
      ACCOUNT_INFO: "ul.sc-accountInformation",
      TREE_JUMP_BUTTON: "[data-fobles-tree-jump-path]",
    },
    ATTRIBUTES: {
      MENU_VISIBLE: "data-visible",
    },
    LABELS: {
      TOGGLE_FOBLES: /toggle fobles/i,
      CONTENT_TAB: "Content",
      ITEM_PATH: "Item path:",
      CONTINUE_BUTTON: "Continue",
    },
  },
  TIMEOUTS: {
    DISCOVERY_MS: 30_000,
    LOGIN_WAIT_MS: 10 * 60 * 1_000,
    MENU_VISIBLE_MS: 15_000,
    MENU_TRIGGER_VISIBLE_MS: 30_000,
    URL_WAIT_MS: 30_000,
    TEST_SUITE_MS: 10 * 60 * 1_000,
    // Was 25_000 - shorter than URL_WAIT_MS itself, so a slow-to-render page (e.g. showconfig.aspx,
    // which dumps the whole live web.config and can take a while to build the XML viewer tree)
    // could exceed the step's own budget before its URL wait even finished.
    STEP_TIMEOUT_MS: 45_000,
  },
} as const;
