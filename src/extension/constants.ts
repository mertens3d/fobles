export const STORAGE = {
  KEY: {
    DEBUG_LOGGING: "debugLogging",
    SHOW_RELOAD_EXTENSION_BUTTON: "showReloadExtensionButton",
    FOBLES_STATE: "fobles_state",
    FOBLE_NAV_POSITION: "fobleNavPosition",
    SELECT_RENDERING_FOBLE_NAV_POSITION: "selectRenderingFobleNavPosition",
    FOBLE_NAV_VISIBLE: "fobleNavVisible",
    FOBLE_NAV_WARNING_VISIBLE: "fobleNavWarningVisible",
    TURN_OFF_FOBLES_AFTER_NAVIGATION: "turnOffFoblesAfterNavigation",
    AI_PAGES_MAPPINGS: "aiPagesMappings",
    KICK_ALL_USERS: "foble_kick_all_users",
  },
} as const;

export const MESSAGE = {
  ACTION: {
    PAGE_READY: "page-ready",
    TOGGLE_FOBLES: "toggle-fobles",
    RELOAD_EXTENSION: "reload-extension",
  },
} as const;

export const LOGGER = {
  NAMESPACE: "[scFobles]",
} as const;

export const SYMBOLS = {
  CLOSE: "\u00d7",
  LIGHTNING: "\u26A1\uFE0E",
  ROTATE_CLOCKWISE: "\u21bb",
} as const;

export const TEXT = {
  BUILD_LABEL: "Build:",
  CREATED_BY_LABEL: "Created by:",
  CREATOR: "Gregory Mertens",
  HIDE_NAV: "Hide Foble navigation",
  MOVE_NAV: "Move Foble navigation clockwise",
  PRODUCT_NAME: "scFobles",
  QUICK_MENU: "Menu",
  QUICK_MENU_TITLE: "Toggle quick jump, utilities & about",
  RELOAD_EXTENSION: "Reload Extension",
  RELOAD_EXTENSION_TITLE: "Reload the extension after a rebuild",
  TREE_JUMPS: "Tree Jumps",
  ADMIN_PAGES: "Admin Pages",
  LANDING_PAGES: "Landing Pages",
  SET_ISE_TAB_TITLE: "Set tab title",
  SET_ISE_TAB_TITLE_ERROR: "Script name not found.",
  SET_ISE_TAB_TITLE_TITLE:
    "Set the tab title from the current PowerShell script",
  TOGGLE_FEATURES: "Toggle tree and slide-out buttons",
  VIEW: "View",
  VIEW_TITLE: "Toggle view actions",
} as const;

const POWERSHELL_ISE_PATH =
  "/sitecore/shell/Applications/PowerShell/PowerShellIse";
const FIELD_EDITOR_PATH = "/sitecore/shell/Applications/Field Editor.aspx";
const SHELL_DEFAULT_PATH = "/sitecore/shell/default.aspx";
const FILE_EXPLORER_XML_CONTROL = "FileExplorer";
const SELECT_RENDERING_XML_CONTROL =
  "Sitecore.Shell.Applications.Dialogs.SelectRendering";

export const SITECORE = {
  ALLOWED_XML_CONTROLS: [
    FILE_EXPLORER_XML_CONTROL,
    SELECT_RENDERING_XML_CONTROL,
  ],
  CONTENT_EDITOR_PATH: "/sitecore/shell/Applications/Content Editor.aspx",
  DATABASE_QUERY_KEYS: ["db", "sc_content"],
  DATABASE_QUERY_PARAMETER: "db",
  ITEM_ID_QUERY_PARAMETER: "id",
  POWERSHELL_ISE_PATH,
  FIELD_EDITOR_PATH,
  KICK_USERS_PATH: "/sitecore/client/Applications/LicenseOptions/KickUser.aspx",
  MENU_PATHS: [
    "/sitecore/shell/Applications/Templates/Template-Manager",
    "/sitecore/shell/Applications/Content-Editor",
    "/sitecore/shell/Applications/Content Editor.aspx",
    "/sitecore/shell/Applications/Content Manager/default.aspx",
    FIELD_EDITOR_PATH,
    POWERSHELL_ISE_PATH,
    "/sitecore/client/Applications/LicenseOptions/KickUser.aspx",
  ],
  FILE_EXPLORER_XML_CONTROL,
  SHELL_DEFAULT_PATH,
  SELECT_RENDERING_XML_CONTROL,
  XML_CONTROL_QUERY_PARAMETER: "xmlcontrol",
} as const;

export const CLASS = {
  FOBLE_NAV_BUTTON: "foble-nav-button",
  FOBLE_NAV_BUTTON_COMPACT: "foble-nav-button--compact",
  QUICK_MENU: "fobles-quick-menu",
  QUICK_MENU_TRIGGER: "fobles-quick-menu-trigger",
  QUICK_MENU_COLUMNS: "fobles-quick-menu-columns",
  QUICK_MENU_COLUMN: "fobles-quick-menu-column",
  QUICK_MENU_COLUMN_TITLE: "fobles-quick-menu-column-title",
  QUICK_MENU_GROUP: "fobles-quick-menu-group",
  QUICK_MENU_GROUP_TITLE: "fobles-quick-menu-group-title",
  QUICK_MENU_ACTIONS: "fobles-quick-menu-actions",
  QUICK_MENU_ACTION: "fobles-quick-menu-action",
  QUICK_MENU_OPTION_ICON_BOX: "fobles-quick-menu-option-icon-box",
  QUICK_MENU_OPTION_ICON: "fobles-quick-menu-option-icon",
  QUICK_MENU_OPTION_LABEL: "fobles-quick-menu-option-label",
  QUICK_MENU_INFO: "fobles-quick-menu-info",
  QUICK_MENU_INFO_ROW: "fobles-quick-menu-info-row",
  QUICK_MENU_RELOAD_BUTTON: "fobles-quick-menu-reload-button",
  PROXY_BUTTONS: "fobles-proxy-buttons",
  PROXY_BUTTONS_TRIGGER: "fobles-proxy-buttons-trigger",
  PROXY_BUTTONS_ACTIONS: "fobles-proxy-buttons-actions",
  PROXY_BUTTONS_ACTION: "fobles-proxy-buttons-action",
  PROXY_BUTTON: "fobles-proxy-button",
  PROXY_BUTTON_INPUT: "fobles-proxy-button-input",
  PROXY_BUTTON_LABEL: "fobles-proxy-button-label",
  TOOLBAR_CONTAINER: "fobles-toolbar-container",
  TOOLBAR_CLOSE_BUTTON: "fobles-toolbar-close-button",
  TOOLBAR_POSITION_BUTTON: "fobles-toolbar-position-button",
  TOOLBAR_SET_ISE_TITLE_BUTTON: "foble-nav-set-ise-title-button",
  TOOLBAR_FEATURE_BUTTON: "foble-nav-button foble-nav-feature-button",
} as const;

export const SELECTORS = {
  QUICK_MENU: ".fobles-quick-menu",
  QUICK_MENU_TRIGGER: ".fobles-quick-menu-trigger",
  PROXY_BUTTONS: ".fobles-proxy-buttons",
  PROXY_BUTTONS_TRIGGER: ".fobles-proxy-buttons-trigger",
  TOOLBAR_CONTAINER: ".fobles-toolbar-container",
  TOOLBAR_CLOSE_BUTTON: ".fobles-toolbar-close-button",
  TOOLBAR_POSITION_BUTTON: ".fobles-toolbar-position-button",
  TOOLBAR_SET_ISE_TITLE_BUTTON: ".foble-nav-set-ise-title-button",
  FOBLE_WRAPPER: "[data-foble-wrapper]",
  FOBLE_BUTTON: "[data-is-foble-button='1']",
  FOBLE_PROCESSED: "[data-foble-processed]",
  TEMPLATE_BUTTON: "[data-template-button='1']",
  SITECORE_DATABASE_INPUT: "input[id$='_Database'][value]",
  SITECORE_PROFILE_CARDS_IMAGE: "img.scEditorHeaderCustomizeProfilesIcon",
  SITECORE_SCRIPT_NAME: "#ScriptName",
  SITECORE_URI_ELEMENT: "[onfocus*='sitecore://'], [onblur*='sitecore://']",
} as const;

export const TOOLBAR_POSITIONS = [
  "upper-left",
  "upper-right",
  "editor-header",
  "bottom-right",
  "bottom-left",
] as const;

export type ToolbarPosition = (typeof TOOLBAR_POSITIONS)[number];

export const ATTRIBUTE = {
  DATA: {
    KEY: {
      FOBLE_NAV_OWNER: "data-foble-nav-owner",
      TEMPLATE_BUTTON: "data-template-button",
    },
    VALUE: {
      PERSISTENT: "persistent",
    },
  },
} as const;
