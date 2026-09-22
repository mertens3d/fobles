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
    USER_TREE_JUMPS: "User Tree Jumps",
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

// Every shell page/dialog Fobles is eligible on, in one place, replacing three previously
// separate lists (path-only pages, xmlcontrol-only dialogs, and which of those get a compact
// toolbar). matchStrings are checked as plain substrings against the page's own decoded, lowercased
// "pathname + search" (see findAllowedPage, src/content/guard.ts) - a path like "/sitecore/shell/
// Applications/Content Editor.aspx" and a query fragment like "xmlcontrol=fileexplorer" are both
// just substrings of that same string, so no separate matching mode is needed for either kind.
// id is also this page's placement storage key suffix (see toolbar-placement.ts) - one sync key
// per page, created only once a user actually drags the toolbar on that particular page.
// defaultPlacement is that page's own fallback until then; omit it to just use the shared
// DEFAULT_TOOLBAR_PLACEMENT below instead.
export type ToolbarPageKind = "full" | "compact";

export type AllowedPage = {
  id: string;
  friendlyName: string;
  matchStrings: readonly string[];
  toolbarType: ToolbarPageKind;
  defaultPlacement?: ToolbarPlacement;
  // Kept in the list for reference/tracking even though Fobles shouldn't currently activate on
  // it - findAllowedPage (src/content/guard.ts) skips these. Omit to mean true.
  eligible?: boolean;
};

export const FOBLES_PAGES: readonly AllowedPage[] = [
  {
    id: "ContentEditor",
    friendlyName: "Content Editor",
    matchStrings: [SITECORE.RELATIVE_PATHS.CONTENT_EDITOR_MODERN, SITECORE.RELATIVE_PATHS.CONTENT_EDITOR],
    toolbarType: "full",
  },
  {
    id: "TemplateManager",
    friendlyName: "Template Manager",
    matchStrings: [SITECORE.RELATIVE_PATHS.TEMPLATE_MANAGER],
    toolbarType: "full",
  },
  {
    id: "ContentManager",
    friendlyName: "Content Manager",
    matchStrings: [SITECORE.RELATIVE_PATHS.CONTENT_MANAGER],
    toolbarType: "full",
  },
  {
    id: "PowerShellIse",
    friendlyName: "PowerShell ISE",
    matchStrings: [SITECORE.RELATIVE_PATHS.POWERSHELL_ISE],
    toolbarType: "full",
  },
  {
    id: "KickUsers",
    friendlyName: "Kick User",
    matchStrings: [SITECORE.RELATIVE_PATHS.KICK_USERS],
    toolbarType: "full",
  },
  {
    id: "FileExplorer",
    friendlyName: "File Explorer",
    matchStrings: [`xmlcontrol=${SITECORE.XML_CONTROLS.FILE_EXPLORER}`],
    toolbarType: "full",
  },
  {
    id: "AddFromTemplate",
    friendlyName: "Add From Template",
    matchStrings: [`xmlcontrol=${SITECORE.XML_CONTROLS.ADD_FROM_TEMPLATE}`],
    toolbarType: "full",
    defaultPlacement: { corner: "upper-right", offsetX: 15, offsetY: 65 },
  },
  {
    id: "GallerySubitems",
    friendlyName: "Gallery: Subitems",
    matchStrings: [`xmlcontrol=${SITECORE.XML_CONTROLS.GALLERY_SUBITEMS}`],
    toolbarType: "compact",
  },
  {
    id: "GalleryFavorites",
    friendlyName: "Gallery: Favorites",
    matchStrings: [`xmlcontrol=${SITECORE.XML_CONTROLS.GALLERY_FAVORITES}`],
    toolbarType: "compact",
  },
  {
    id: "TreeListExEditor",
    friendlyName: "TreeListEx Editor",
    matchStrings: [`xmlcontrol=${SITECORE.XML_CONTROLS.TREE_LIST_EX_EDITOR}`],
    toolbarType: "compact",
  },
  {
    id: "DeviceEditor",
    friendlyName: "Device Editor",
    matchStrings: [`xmlcontrol=${SITECORE.XML_CONTROLS.DEVICE_EDITOR}`],
    toolbarType: "compact",
    eligible: false,
  },
  {
    id: "SelectRendering",
    friendlyName: "Select Rendering",
    matchStrings: [`xmlcontrol=${SITECORE.XML_CONTROLS.SELECT_RENDERING}`],
    toolbarType: "compact",
    defaultPlacement: { corner: "upper-right", offsetX: 16, offsetY: 70 },
  },
  {
    id: "FieldEditor",
    friendlyName: "Field Editor",
    matchStrings: [`${SITECORE.RELATIVE_PATHS.FIELD_EDITOR}?mo=mini`],
    toolbarType: "compact",
  },
] as const;
