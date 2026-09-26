import { scenarios } from "./scenarios";
import { SELECTED_SPEED } from "../settings/settings";
import type { TestSpeed } from "./types";

export const CONST = {
  SCENARIOS: scenarios,
  SPEED: {
    SELECTED: SELECTED_SPEED,
    SETTINGS: {
      CRAWL: { STEP_WAIT_MS: 1_000, MOUSE_PX_PER_SECOND: 2_000 },
      WALK: { STEP_WAIT_MS: 500, MOUSE_PX_PER_SECOND: 3_000 },
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
  TOOLBAR_DRAG_POSITIONS: {
    DEFAULT: { corner: "upper-right", offsetX: 80, offsetY: 80 },
    POSITION_2: { corner: "bottom-right", offsetX: 66.78125, offsetY: 66.609375 },
    POSITION_3: { corner: "bottom-right", offsetX: 66.78125, offsetY: 66.609375 },
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
  SPEAK_BUBBLE: {
    ID: "playwright-speak-bubble",
    STYLE_ID: "playwright-speak-bubble-style",
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
  },
  ENVIRONMENT: {
    ENV_VAR: "SITECORE_TEST_ENVIRONMENTS",
    AUTH_DIR_ENV_VAR: "PLAYWRIGHT_AUTH_DIR",
    AUTH_DIR: "./tests/test-artifacts/auth",
  },
  SITECORE: {
    VERSIONS:{

    },
    PATHS: {
      CONTENT_EDITOR: "/sitecore/shell/Applications/Content Editor.aspx?sc_bw=1",
      LICENSE_STARTPAGE: "/sitecore/client/Applications/LicenseOptions/StartPage",
      IDENTITY_AUTHORIZE: "/connect/authorize",
    },
    SELECTORS: {
      TOOLBAR_CONTAINER: ".fobles-toolbar-container",
      TOOLBAR_GRIP: ".fobles-toolbar-grip",
      QUICK_MENU: ".fobles-quick-menu",
      TOOLBAR_TOGGLE_BUTTON: "button[title='Toggle Fobles navigation']",
      // Targets the actual <button> by its own unique role attribute (see
      // ATTRIBUTE.DATA.KEY.NAV_BUTTON_ROLE in src/content/constants.ts) rather than a CSS class or
      // the wrapping wrapper <div> - every persistent nav button (LBolt, this, Proxy Buttons)
      // shares the same "data-fobles-nav-owner" attribute and "fobles-nav-button" class, so either
      // of those alone can't tell them apart.
      MENU_TRIGGER: "[data-fobles-nav-button-role='quick-menu-trigger']",
      PROXY_BUTTONS_TRIGGER: "[data-fobles-nav-button-role='proxy-buttons-trigger']",
      TOOLBAR_CLOSE_BUTTON: ".fobles-toolbar-close-button",
      LBOLT_BUTTON: "[data-fobles-nav-button-role='lbolt']",
      CONTENT_TAB: "span.scEditorTabHeaderNormal",
      QUICK_INFO_TABLE: ".scEditorQuickInfo",
      ACCOUNT_INFO: "ul.sc-accountInformation",
      TREE_JUMP_BUTTON: "[data-fobles-tree-jump-path]",
      TREE_FOBLES_BUTTON: ".tree-fobles-button",
      CONFIRM_DIALOG: ".fobles-confirm-dialog",
      CONFIRM_DIALOG_CONTINUE: ".fobles-confirm-dialog-continue",
      CONFIRM_DIALOG_SETTING: ".fobles-confirm-dialog-setting",
    },
    ATTRIBUTES: {
      MENU_VISIBLE: "data-visible",
    },
    // Real paths from the fixed Tree Jump catalog (src/shared/quick-menu/menu-groups.ts) - named
    // so a spec can target one specific tree jump without a magic string or an opaque index.
    TREE_JUMP_PATHS: {
      LAYOUT_PLACEHOLDERS: "/sitecore/layout/Placeholder Settings",
      LAYOUT_RENDERINGS: "/sitecore/layout/Renderings",
      MEDIA_LIBRARY: "/sitecore/media library",
      TEMPLATES: "/sitecore/templates",
    },
    ITEMS: {
      // /sitecore/layout/Renderings/System/FieldRenderer
      FIELD_RENDERER: "E1AF4AA3-3B5D-4611-8C71-959AD261E5B7",
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
} as const;
