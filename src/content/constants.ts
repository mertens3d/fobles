import type { ToolbarPlacement } from "./toolbar.types";
import { SITECORE } from "./sitecore";

export const SYMBOLS = {
  LIGHTNING: "\u26A1\uFE0E",
} as const;

export const TEXT = {
  DRAG_NAV: "Drag to move Fobles navigation",
  GROUP_NAME: {
    ADMIN_PAGES: "Admin Pages",
    AI: "AI",
    APPLICATION_PAGES: "Application Pages",
    OTHER: "Other",
    THIRD_PARTY: "3rd Party",
    TREE_JUMPS: "Tree Jumps",
  },
  HIDE_NAV: "Hide Fobles navigation",
  QUICK_MENU: "Menu",
  QUICK_MENU_TITLE: "Toggle quick jump, utilities & about",
  SET_ISE_TAB_TITLE: "Set tab title",
  SET_ISE_TAB_TITLE_ERROR: "Script name not found.",
  SET_ISE_TAB_TITLE_TITLE:
    "Set the tab title from the current PowerShell script",
  TOGGLE_FEATURES: "Toggle tree and slide-out buttons",
  VIEW: "View",
  VIEW_TITLE: "Toggle view actions",
} as const;

export const ICONS = {
  CLOSE: "/sitecore/shell/themes/standard/Images/Window%20Management/page_close.png",
} as const;

export const CLASS = {
  FOBLES_NAV_BUTTON: "fobles-nav-button",
  FOBLES_NAV_BUTTON_COMPACT: "fobles-nav-button--compact",
  PROXY_BUTTON: "fobles-proxy-button",
  PROXY_BUTTON_INPUT: "fobles-proxy-button-input",
  PROXY_BUTTON_LABEL: "fobles-proxy-button-label",
  PROXY_BUTTONS: "fobles-proxy-buttons",
  PROXY_BUTTONS_ACTION: "fobles-proxy-buttons-action",
  PROXY_BUTTONS_ACTIONS: "fobles-proxy-buttons-actions",
  PROXY_BUTTONS_TRIGGER: "fobles-proxy-buttons-trigger",
  QUICK_MENU: "fobles-quick-menu",
  QUICK_MENU_ACTION: "fobles-quick-menu-action",
  QUICK_MENU_ACTIONS: "fobles-quick-menu-actions",
  QUICK_MENU_COLUMN: "fobles-quick-menu-column",
  QUICK_MENU_COLUMN_TITLE: "fobles-quick-menu-column-title",
  QUICK_MENU_COLUMNS: "fobles-quick-menu-columns",
  QUICK_MENU_GROUP: "fobles-quick-menu-group",
  QUICK_MENU_GROUP_TITLE: "fobles-quick-menu-group-title",
  QUICK_MENU_OPTION_BADGE: "fobles-quick-menu-option-badge",
  QUICK_MENU_OPTION_ICON: "fobles-quick-menu-option-icon",
  QUICK_MENU_OPTION_ICON_BOX: "fobles-quick-menu-option-icon-box",
  QUICK_MENU_OPTION_LABEL: "fobles-quick-menu-option-label",
  QUICK_MENU_TRIGGER: "fobles-quick-menu-trigger",
  TOOLBAR_BODY: "fobles-toolbar-body",
  TOOLBAR_CLOSE_BUTTON: "fobles-toolbar-close-button",
  TOOLBAR_CLOSE_ICON: "fobles-toolbar-close-icon",
  TOOLBAR_CONTAINER: "fobles-toolbar-container",
  TOOLBAR_DRAGGING: "fobles-toolbar-dragging",
  TOOLBAR_GRIP: "fobles-toolbar-grip",
  TOOLBAR_LBOLT_BUTTON: "fobles-nav-button fobles-nav-lbolt-button",
  TOOLBAR_RESIZING: "fobles-toolbar-resizing",
  TOOLBAR_SET_ISE_TITLE_BUTTON: "fobles-nav-set-ise-title-button",
} as const;

export const SELECTORS = {
  FOBLES_BUTTON: "[data-is-fobles-button='1']",
  FOBLES_PROCESSED: "[data-fobles-processed]",
  FOBLES_WRAPPER: "[data-fobles-wrapper]",
  PROXY_BUTTONS: ".fobles-proxy-buttons",
  PROXY_BUTTONS_TRIGGER: ".fobles-proxy-buttons-trigger",
  QUICK_MENU: ".fobles-quick-menu",
  QUICK_MENU_TRIGGER: ".fobles-quick-menu-trigger",
  TEMPLATE_BUTTON: "[data-template-button='1']",
  TOOLBAR_BODY: ".fobles-toolbar-body",
  TOOLBAR_CLOSE_BUTTON: ".fobles-toolbar-close-button",
  TOOLBAR_CONTAINER: ".fobles-toolbar-container",
  TOOLBAR_GRIP: ".fobles-toolbar-grip",
  TOOLBAR_LBOLT_BUTTON: ".fobles-nav-lbolt-button",
  TOOLBAR_SET_ISE_TITLE_BUTTON: ".fobles-nav-set-ise-title-button",
} as const;

export const TOOLBAR_CORNERS = [
  "upper-left",
  "upper-right",
  "bottom-right",
  "bottom-left",
] as const;

export const DEFAULT_TOOLBAR_PLACEMENT: ToolbarPlacement = {
  corner: "upper-right",
  offsetX: 15,
  offsetY: 105,
};

export const ATTRIBUTE = {
  DATA: {
    KEY: {
      FOBLES_NAV_OWNER: "data-fobles-nav-owner",
      PROXY_BUTTONS: "data-proxy-buttons",
      QUICK_MENU: "data-quick-menu",
      TEMPLATE_BUTTON: "data-template-button",
      VISIBLE: "data-visible",
    },
    VALUE: {
      PERSISTENT: "persistent",
    },
  },
} as const;

export const CSS_PROPERTIES = {
  TOOLBAR_BACKGROUND: "--fobles-toolbar-background",
} as const;

// Shell pages considered eligible for the toolbar based on pathname alone (see isMenuPathAllowed).
export const ALLOWED_PATHS = [
  SITECORE.RELATIVE_PATHS.TEMPLATE_MANAGER,
  SITECORE.RELATIVE_PATHS.CONTENT_EDITOR_MODERN,
  SITECORE.RELATIVE_PATHS.CONTENT_EDITOR,
  SITECORE.RELATIVE_PATHS.CONTENT_MANAGER,
  SITECORE.RELATIVE_PATHS.POWERSHELL_ISE,
  SITECORE.RELATIVE_PATHS.KICK_USERS,
] as const;

// default.aspx?xmlcontrol=... pages allowlisted as eligible for the toolbar (see isMenuPathAllowed).
export const ALLOWED_XML_CONTROLS = [
  SITECORE.XML_CONTROLS.ADD_FROM_TEMPLATE,
  SITECORE.XML_CONTROLS.DEVICE_EDITOR,
  SITECORE.XML_CONTROLS.FILE_EXPLORER,
  SITECORE.XML_CONTROLS.GALLERY_FAVORITES,
  SITECORE.XML_CONTROLS.GALLERY_SUBITEMS,
  SITECORE.XML_CONTROLS.SELECT_RENDERING,
  SITECORE.XML_CONTROLS.TREE_LIST_EX_EDITOR,
] as const;

// Of the above, these render only inside a small dialog/gallery frame with no room for the full
// toolbar (quick menu, proxy buttons, ISE title button) - see isCompactToolbarPage (src/content/
// guard.ts), which gates injectToolbar's (src/content/toolbar/index.ts) compact-vs-full layout.
export const COMPACT_TOOLBAR_XML_CONTROLS = [
  SITECORE.XML_CONTROLS.DEVICE_EDITOR,
  SITECORE.XML_CONTROLS.GALLERY_FAVORITES,
  SITECORE.XML_CONTROLS.GALLERY_SUBITEMS,
  SITECORE.XML_CONTROLS.SELECT_RENDERING,
  SITECORE.XML_CONTROLS.TREE_LIST_EX_EDITOR,
] as const;
