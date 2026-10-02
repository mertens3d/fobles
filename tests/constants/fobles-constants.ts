export const FOBLES = {
  ATTRIBUTES: {
    BUTTON: "data-is-fobles-button",
    MENU_URL: "data-fobles-menu-url",
    MENU_VISIBLE: "data-visible",
    PANE: "data-fobles-pane",
    PROCESSED: "data-fobles-processed",
    TREE_JUMP_PATH: "data-fobles-tree-jump-path",
    WRAPPER: "data-fobles-wrapper",
  },
  CLASSES: {
    HIDDEN: "fobles-hidden",
  },
  // Must match src/shared/constants.ts's MESSAGE.ACTION / src/public/manifest.json's "commands"
  // keys - page.keyboard.press(...) can't simulate these (CDP key events never reach Chrome's own
  // global accelerator table), so tests trigger the relay logic directly via the background
  // service worker instead (see fobles-macros.ts's triggerExtensionCommand).
  HOTKEYS: {
    TOGGLE_FOBLES_COMMAND: "toggle-fobles",
    TOGGLE_LBOLT_COMMAND: "toggle-lbolt",
  },
  LABELS: {
    CONTINUE_BUTTON: "Continue",
    TOGGLE_FOBLES: /toggle fobles/i,
  },
  LOCATORS: {
    MENU_URL: "[data-fobles-menu-url]",
  },
  SELECTORS: {
    DATA:{
      FOBLES_TREE_JUMP_PATH: "[data-fobles-tree-jump-path]",

    },
    DATA_IS_FOBLES_BUTTON: "[data-is-fobles-button='1']",
    // Some strategies (Multilist with Search, Tree List) render two independent panes ("all
    // items" and "selected items") each with their own Fobles button - this scopes to just the
    // selected pane's, since that's the one every scenario actually asserts/navigates against.
    SELECTED_PANE_BUTTON: "[data-fobles-pane='selected'] [data-is-fobles-button='1']",
    CONFIRM_DIALOG: ".fobles-confirm-dialog",
    CONFIRM_DIALOG_CONTINUE: ".fobles-confirm-dialog-continue",
    CONFIRM_DIALOG_SETTING: ".fobles-confirm-dialog-setting",
    LBOLT_BUTTON: "[data-fobles-nav-button-role='lbolt']",
    JUMP_MENU_TRIGGER: "[data-fobles-nav-button-role='jump-menu-trigger']",
    PROXY_BUTTONS_TRIGGER: "[data-fobles-nav-button-role='proxy-buttons-trigger']",
    JUMP_MENU_FLYOUT: ".fobles-jump-menu-flyout",
    TOOLBAR_CLOSE_BUTTON: ".fobles-toolbar-close-button",
    TOOLBAR_CONTAINER: ".fobles-toolbar-container",
    TOOLBAR_GRIP: ".fobles-toolbar-grip",
    TOOLBAR_TOGGLE_BUTTON: "button[title='Toggle Fobles navigation']",
    TREE_FOBLES_BUTTON: ".tree-fobles-button",
    WRAPPER: "[data-fobles-wrapper]",
  },
} as const;