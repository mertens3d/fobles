import { _SITECORE_COLORS } from "./base/_sc-colors";
import type { TestSpeed } from "../settings/test-speed.types";
import { _TESTING_MOUSE } from "./base/_testing-mouse";
import type { HighlightStyle } from "./CONST.Types";
import { TEST_PAGE_JUMP_TARGETS, TEST_TREE_JUMP_TARGETS } from "./testing/page-jump-targets";
import { FOBLES_PAGES } from "./testing/pages";
import { SELECTED_SPEED } from "../settings/settings";
import { _FOBLES_OPTIONS } from "./base/_fobles-options";
import { DIAGNOSTIC } from "./testing/diagnostic";

export const TESTING = {
  PAGE_JUMP_TARGETS: TEST_PAGE_JUMP_TARGETS,
  TREE_JUMP_TARGETS: TEST_TREE_JUMP_TARGETS,
  DIAGNOSTIC: DIAGNOSTIC,
  ADDITIONAL_SETTINGS: {
    AI_PAGES: {
      GROUP_NAME_PREFIX: "Fobles E2E ",
      CONTENT_ROOT: "/sitecore/content/FoblesE2E/",
      NORMALIZED_CONTENT_ROOT: "/sitecore/content/FoblesE2E",
      ORGANIZATION: "org_fobles_e2e",
      SITE: "fobles-e2e-site",
      TENANT_NAME: "tenant_fobles_e2e",
    },
    ADMIN_PAGE: {
      ICON: " /~/icon/applicationsv2/32x32/unicorn.png ",
      INTEGRATION_LABEL_PREFIX: "Fobles E2E Toolbar Admin ",
      INTEGRATION_URL_ENCODED:
        "/sitecore/shell/Applications/Content%20Editor.aspx?sc_bw=1",
      LABEL_PREFIX: "Fobles E2E Admin ",
      NORMALIZED_ICON: "/-/icon/applicationsv2/32x32/unicorn.png",
      NORMALIZED_URL: "/unicorn.aspx",
      URL: "  unicorn.aspx  ",
    },
    TEST_JUMP: {
      label: "QA User Tree Jump",
      pathSuffixRaw: "/content/Home",
      iconRaw: "applicationsv2/32x32/bookmark_green.png",
    },
    TEST_JUMP_ICON_NORMALIZED:
      "/-/icon/applicationsv2/32x32/bookmark_green.png",
    TEST_JUMP_PATH: "/sitecore/content/Home",
  },
  BILLBOARD: {
    ID: "playwright-billboard",
    STYLE_CSS: `
      #playwright-billboard {
        position: fixed;
        z-index: 2147483647;
        max-width: 480px;
        padding: 14px 22px;
        background: #fff;
        border: 3px solid #111;
        border-radius: 18px;
        font: 700 19px/1.35 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #111;
        text-align: center;
        box-shadow: 0 4px 14px rgba(0, 0, 0, .35);
        pointer-events: none;
        display: none;
      }`,
    STYLE_ID: "playwright-billboard-style",
  },
  CLICK_FLASH: {
    COLOR: "#840b18",
    DURATION_MS: 400,
  },
  EXTENSION_PAGES: {
    OPTIONS: "options",
    OPTIONS_URL_PATTERN: /options\.html$/,
    POPUP: "popup",
  },
  LOG: {
    STEP_DIVIDER: "--------------------------------------------------",
    TEST_DIVIDER: "==================================================",
  },

  HUMAN_PAUSE_MS: 1_000,
  MOUSE: _TESTING_MOUSE,
  NAVIGATION: {
    HOLD_MULTIPLIER: 2,
    NEW_TAB_HOLD_MULTIPLIER: 2,
  },
  OPTIONS: _FOBLES_OPTIONS,
  POPUP: {
    ADDITIONAL_SETTINGS_BUTTON: "Additional Settings",
    HEADING: "Fobles Settings",
    PREFERENCE_IDS: [
      "fobles-nav-visible",
      "fobles-nav-warning-visible",
      "turn-off-fobles-after-navigation",
    ],
    RELOAD_EXTENSION_BUTTON_SELECTOR: "#reload-extension",
    RELOAD_EXTENSION_BUTTON_TEXT: "Reload Extension",
    PREFERENCE_SELECTOR_PREFIX: "#",
  },
  REPORT_SCREENSHOTS: {
    ADMIN_PAGE_DISABLED: "admin-page-disabled.png",
    ADMIN_PAGE_ENABLED: "admin-page-enabled.png",
    AI_MAPPINGS_SAVED: "ai-mappings-saved.png",
    DEBUG_LOGGING_DISABLED: "debug-logging-disabled.png",
    DEBUG_LOGGING_ENABLED: "debug-logging-enabled.png",
    DEVELOPER_SETTINGS: "developer-settings.png",
    POPUP_DEFAULT: "popup-default.png",
    POPUP_PREFERENCES_SAVED: "popup-preferences-saved.png",
    STORAGE_CLEARED: "storage-cleared.png",
    STORAGE_BEFORE_CLEAR: "storage-before-clear.png",
    USER_TREE_JUMP_FLYOUT: "user-tree-jump-flyout.png",
    USER_ADMIN_PAGE_SAVED: "user-admin-page-saved.png",
  },
  SCREENSHOT: {
    MASK_COLOR: _SITECORE_COLORS.scLightGray,
    BLUR_PX: 8,
  },
  JUMP_FLYOUT: {
    ADMIN_PAGES_COLUMN_SELECTOR: ".jump-flyout-column",
    ADMIN_PAGES_GROUP_LABEL: "User Admin Pages",
    ADMIN_PAGES_INTEGRATION_LABEL_PREFIX: "Fobles E2E Toolbar Admin ",
    USER_ADMIN_PAGE_ENABLED_INPUT: "input[name='enabled']",
    USER_ADMIN_PAGE_LABEL_INPUT: "input[name='label']",
    USER_ADMIN_PAGE_REMOVE_SELECTOR: ".user-admin-page-remove",
  },
  SELECTORS: {
    AI_MAPPING_CONTENT_ROOT_INPUT: "input[name='contentRoot']",
    AI_MAPPING_NAME_INPUT: "input[name='name']",
    AI_MAPPING_ORGANIZATION_INPUT: "input[name='organization']",
    AI_MAPPING_SITE_INPUT: "input[name='site']",
    AI_MAPPING_TENANT_NAME_INPUT: "input[name='tenantName']",
  },
  CONTENT_EDITOR_DEBUG: {
    LOG_MARKER: "Fobles flyout eligibility decision",
    OPEN_CONSOLE_SHORTCUT: "Control+Shift+J",
  },
  SPEAK_BUBBLE: {
    DEFAULT_SPEECH_POSITION: { xPercent: 50, yPercent: 90 },
    ID: "playwright-speak-bubble",
    STYLE_CSS: `
      #playwright-speak-bubble {
        position: fixed;
        z-index: 2147483647;
        max-width: 480px;
        padding: 14px 22px;
        background: #fff;
        border: 3px solid #111;
        border-radius: 18px;
        font: 700 19px/1.35 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #111;
        text-align: center;
        box-shadow: 0 4px 14px rgba(0, 0, 0, .35);
        pointer-events: none;
        display: none;
      }
    `,
    STYLE_ID: "playwright-speak-bubble-style",
  },
  TIMEOUTS: {
    DISCOVERY_MS: 30_000,
    AUTO_LOGIN_WAIT_MS: 20_000,
    // Redirect to the login page after openSitecorePage's navigate is asynchronous (observed
    // ~1-2s) - a plain instant count() check for the login form races that redirect and wrongly
    // concludes "already logged in". Bounded wait long enough to cover the redirect, short enough
    // not to delay the common already-authenticated case.
    LOGIN_FORM_DETECT_MS: 5_000,
    LOGIN_WAIT_MS: 10 * 60 * 1_000,
    MENU_VISIBLE_MS: 15_000,
    MENU_TRIGGER_VISIBLE_MS: 30_000,
    QUICK_INFO_VISIBLE_MS: 15_000,
    URL_WAIT_MS: 30_000,
    TEST_SUITE_MS: 10 * 60 * 1_000,
    // Was 25_000 - shorter than URL_WAIT_MS itself, so a slow-to-render page (e.g. showconfig.aspx,
    // which dumps the whole live web.config and can take a while to build the XML viewer tree)
    // could exceed the step's own budget before its URL wait even finished.
    STEP_TIMEOUT_MS: 45_000,
    DISMISS_OPEN_SAME_PAGE_WAIT_MS: 1_500,
  },
  SPEED: {
    SELECTED: SELECTED_SPEED,
    SETTINGS: {
      CRAWL: { STEP_WAIT_MS: 500, MOUSE_PX_PER_SECOND: 3_000 },
      WALK: { STEP_WAIT_MS: 200, MOUSE_PX_PER_SECOND: 4_000 },
      SPRINT: { STEP_WAIT_MS: 0, MOUSE_PX_PER_SECOND: 4_000 },
    } satisfies Record<
      TestSpeed,
      { STEP_WAIT_MS: number; MOUSE_PX_PER_SECOND: number }
    >,
  },
  TOOLBAR_DRAG_POSITIONS: {
    DEFAULT_UR: { corner: "upper-right", offsetX: 280, offsetY: 80 },
    POSITION_1_UR: { corner: "upper-right", offsetX: 200, offsetY: 160 },
    POSITION_2_BL: { corner: "bottom-left", offsetX: 300, offsetY: 265 },
    POSITION_3_BR: { corner: "bottom-right", offsetX: 200, offsetY: 165 },
  },
  TREE_PANEL_WIDTH_PX: 250,
  FOBLES_PAGES : FOBLES_PAGES,
} as const;
