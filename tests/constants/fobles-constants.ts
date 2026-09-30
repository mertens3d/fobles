export const FOBLES = {
  ATTRIBUTES: {
    BUTTON: "data-is-fobles-button",
    MENU_URL: "data-fobles-menu-url",
    MENU_VISIBLE: "data-visible",
    PROCESSED: "data-fobles-processed",
    TREE_JUMP_PATH: "data-fobles-tree-jump-path",
    WRAPPER: "data-fobles-wrapper",
  },
  CLASSES: {
    HIDDEN: "fobles-hidden",
  },
  LABELS: {
    CONTINUE_BUTTON: "Continue",
    TOGGLE_FOBLES: /toggle fobles/i,
  },
  LOCATORS: {
    MENU_URL: "[data-fobles-menu-url]",
  },
  SELECTORS: {
    DATA_IS_FOBLES_BUTTON: "[data-is-fobles-button='1']",
    CONFIRM_DIALOG: ".fobles-confirm-dialog",
    CONFIRM_DIALOG_CONTINUE: ".fobles-confirm-dialog-continue",
    CONFIRM_DIALOG_SETTING: ".fobles-confirm-dialog-setting",
    LBOLT_BUTTON: "[data-fobles-nav-button-role='lbolt']",
    JUMP_MENU_TRIGGER: "[data-fobles-nav-button-role='jump-menu-trigger']",
    PROXY_BUTTONS_TRIGGER: "[data-fobles-nav-button-role='proxy-buttons-trigger']",
    JUMP_MENU: ".fobles-jump-menu",
    TOOLBAR_CLOSE_BUTTON: ".fobles-toolbar-close-button",
    TOOLBAR_CONTAINER: ".fobles-toolbar-container",
    TOOLBAR_GRIP: ".fobles-toolbar-grip",
    TOOLBAR_TOGGLE_BUTTON: "button[title='Toggle Fobles navigation']",
    TREE_FOBLES_BUTTON: ".tree-fobles-button",
    TREE_JUMP_BUTTON: "[data-fobles-tree-jump-path]",
    WRAPPER: "[data-fobles-wrapper]",
  },
} as const;