export const STORAGE = {
  KEY: {
    AI_PAGES_MAPPINGS: "aiPagesMappings",
    DEBUG_LOGGING: "debugLogging",
    FOBLES_NAV_POSITION: "foblesNavPosition",
    FOBLES_NAV_VISIBLE: "foblesNavVisible",
    FOBLES_NAV_WARNING_VISIBLE: "foblesNavWarningVisible",
    FOBLES_STATE: "fobles_state",
    KICK_ALL_USERS: "fobles_kick_all_users",
    QUICK_MENU_BUTTON_SETTINGS: "quickMenuButtonSettings",
    SELECT_RENDERING_FOBLES_NAV_POSITION: "selectRenderingFoblesNavPosition",
    SHOW_RELOAD_EXTENSION_BUTTON: "showReloadExtensionButton",
    TURN_OFF_FOBLES_AFTER_NAVIGATION: "turnOffFoblesAfterNavigation",
  },
} as const;

export const MESSAGE = {
  ACTION: {
    PAGE_READY: "page-ready",
    RELOAD_EXTENSION: "reload-extension",
    TOGGLE_FOBLES: "toggle-fobles",
  },
} as const;

export const LOGGER = {
  NAMESPACE: "[Fobles]",
} as const;
