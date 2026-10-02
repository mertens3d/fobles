import { COLORS } from "../CONST.colors";
import { SELECTED_SPEED } from "../settings/settings";
import type { TestSpeed } from "../settings/test-speed.types";
import type { HighlightStyle } from "./CONST.Types";

export const TESTING = {
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
      INTEGRATION_URL:
        "/sitecore/shell/Applications/Content Editor.aspx?sc_bw=1",
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
  MOUSE: {
    HOVER_CLEARANCE_PX: 24,
    SPEED_MULTIPLIER: 1,
    UPDATE_HZ: 60,
  },
  HUMAN_PAUSE_MS: 2_000,
  MOUSE_PATH: {
    ANIMATION_DURATION_MS: 3_000,
    COLOR: "#474747",
    DEBUG_LINE_ID: "__fobles-debug-line",
    ENDPOINT_FILL: "lime",
    ENDPOINT_RADIUS: "8",
    SVG_NAMESPACE: "http://www.w3.org/2000/svg",
    STROKE_WIDTH: "2",
    OPACITY: "0.8",
    TAGS: {
      CIRCLE: "circle",
      LINE: "line",
      SVG: "svg",
    },
    VIEWPORT_STYLE: {
      HEIGHT: "100vh",
      LEFT: "0",
      POINTER_EVENTS: "none",
      POSITION: "fixed",
      TOP: "0",
      WIDTH: "100vw",
      Z_INDEX: "2147483647",
    },
    LINE_ATTRIBUTES: {
      X1: "x1",
      X2: "x2",
      Y1: "y1",
      Y2: "y2",
      STROKE: "stroke",
      STROKE_WIDTH: "stroke-width",
    },
    ENDPOINT_ATTRIBUTES: {
      CX: "cx",
      CY: "cy",
      FILL: "fill",
      RADIUS: "r",
    },
  },
  MOUSE_PROXY: {
    CORNER: {
      CENTER: "center",
      TOP_LEFT: "top-left",
    },
    DEFAULT_LABELS: {
      CENTER_OF_MONITOR: "center of monitor",
      MOUSE_TO_DEFAULT: "Mouse to default",
    },
    ERROR_MESSAGES: {
      COULD_NOT_GET_BOUNDING_BOX: "Could not get bounding box for mouse target",
      COULD_NOT_LOCATE_HOVER_REGION: "Could not locate Fobles hover region",
      COULD_NOT_LOCATE_TARGET: "Could not locate mouse target",
      COULD_NOT_MEASURE_BUTTON: "Could not measure the hovered toolbar button",
      COULD_NOT_READ_VIEWPORT: "Could not read viewport size",
      LABEL_NOT_DEFINED: "Label is not defined",
      MOUSE_TARGET_NOT_VISIBLE: "Mouse target is not visible",
      NO_MOUSE_TARGET_PROVIDED: "no mouse target provided",
      PAGE_NOT_DEFINED: "Page is not defined",
      TARGET_NOT_VISIBLE_PREFIX: "Target is not visible for label: ",
      TARGET_NOT_PROVIDED_PREFIX: "no mouse target provided for '",
    },
    EXCLUDED_FRAME_URL_FRAGMENT: "sitecore/shell/Applications/-/media",
    HIGHLIGHT: {
      VISIBLE_DELAY_MS: 500,
            RESTORE_DELAY_MS: 1_000,
      STYLES: {
        SCREEN_SHOT: {
          BACKGROUND_COLOR: COLORS.scSoftYellow,
          COLOR: "black",
          OUTLINE: "5px solid " + COLORS.scSoftYellow,
          OUTLINE_OFFSET: "2px",
          RESTORE_DELAY_MS: 2_000,
          TRANSITION: "background-color 0.5s ease, outline-color 0.5s ease",
          VISIBLE_DELAY_MS: 500,
        } satisfies HighlightStyle,
        CLICK: {
          BACKGROUND_COLOR: "none",
          COLOR: "black",
          OUTLINE: "5px solid " +  COLORS.scRed,
          OUTLINE_OFFSET: "2px",
          RESTORE_DELAY_MS: 2_000,
          TRANSITION: "background-color 0.5s ease, outline-color 0.5s ease",
          VISIBLE_DELAY_MS: 500,
        } satisfies HighlightStyle,
      },
    },
    HTML_TAG: "html",
    OPEN_DIALOG_SELECTOR: "dialog[open]",
    PREFLIGHT_POSITION: "100px",
    PREFLIGHT_POSITION_PX: 100,
    PREFLIGHT_TRANSITION: "none",
    RACE_TIMEOUT_MS: 1_000,
    SELECTOR_PREFIX: "#",
  },
  MOUSE_MARKER: {
    CSS_TEXT: [
      "position: fixed",
      "left: 0px",
      "top: 0px",
      "z-index: 2147483647",
      "width: 12px",
      "height: 12px",
      "border: 2px solid #fff",
      "border-radius: 50%",
      "background: " + COLORS.scRed,
      "box-shadow: 0 0 0 2px " +
        COLORS.scRed +
        ", 0 2px 6px rgba(0, 0, 0, .45)",
      "pointer-events: none",
      "transform: translate(-50%, -50%)",
      "transition: left 16ms linear, top 16ms linear",
      "display: block !important",
      "visibility: visible !important",
      "opacity: 1 !important",
    ],
    ID: "playwright-mouse-marker",
  },
  NAVIGATION: {
    HOLD_MULTIPLIER: 2,
    NEW_TAB_HOLD_MULTIPLIER: 2,
  },
  OPTIONS: {
    AI_PAGES: {
      ADD_GROUP_BUTTON: "Add group",
      COMPLETE_FIELDS_STATUS: "Complete the highlighted fields before saving.",
      GROUP_SELECTOR: "#groups .group",
      MAPPINGS_SAVED_STATUS: "Mappings saved.",
      REMOVE_GROUP_BUTTON: "Remove group",
      SAVE_MAPPINGS_BUTTON: "Save mappings",
      SECTION_TITLE: "Additional Settings",
      STATUS_SELECTOR: "#status",
      VALIDATION_ERROR_SELECTOR: "input[aria-invalid='true']",
    },
    ADMIN_PAGES: {
      ADD_BUTTON: "+ Add User Admin Page",
      COLUMN_TITLE: "Admin Pages",
      ICON_INPUT: "input[name='icon']",
      LABEL_INPUT: "input[name='label']",
      JUMP_MENU_SECTION_TITLE: "Jump Menu Buttons",
      REMOVE_BUTTON_TITLE: "Remove this Admin Page",
      ROW_SELECTOR: ".user-admin-page-row",
      SAVE_BUTTON: "Save jump menu buttons",
      STATUS_SELECTOR: "#jump-menu-buttons-status",
      SAVE_STATUS: "Jump menu buttons saved.",
      URL_INPUT: "input[name='url']",
    },
    DEVELOPER: {
      DEBUG_LOGGING_SELECTOR: "#debug-logging",
      RELOAD_BUTTON_SETTING_SELECTOR: "#show-reload-extension-button",
      SAVE_BUTTON: "Save developer settings",
      STATUS_SELECTOR: "#debug-status",
      SAVE_STATUS: "Developer settings saved.",
      SECTION_TITLE: "Developer Settings",
    },
    TREE_JUMPS_COLUMN_TITLE: "Tree Jumps",
    STORAGE: {
      CLEAR_BUTTON: "Clear all stored settings",
      CLEAR_CONFIRM: "Clear all stored Fobles settings? This can't be undone.",
      CLEAR_STATUS: "All stored settings cleared.",
      CLEAR_STATUS_SELECTOR: "#clear-stored-settings-status",
      OUTPUT_SELECTOR: "#stored-settings-output",
      SECTION_TITLE: "Storage",
      VIEW_BUTTON: "View Fobles Storage",
    },
    HEADING: "Fobles Settings",
    SECTION_SELECTOR: "details.settings-section",
    SUMMARY_SELECTOR: "summary",
    SUMMARY_DIRECT_CHILD_SELECTOR: ":scope > summary",
  },
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
    USER_TREE_JUMP_MENU: "user-tree-jump-menu.png",
    USER_ADMIN_PAGE_SAVED: "user-admin-page-saved.png",
  },
  SCREENSHOT: {
    MASK_COLOR: COLORS.scLightGray,
  },
  JUMP_MENU: {
    ADMIN_PAGES_COLUMN_SELECTOR: ".jump-menu-column",
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
    LOG_MARKER: "Fobles menu eligibility decision",
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
} as const;
