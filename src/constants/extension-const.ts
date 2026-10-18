// @source-path [fobles] src/constants/constants-b.ts

export const STORAGE = {
  KEY: {
    AI_PAGES_MAPPINGS: "aiPagesMappings",
    DEBUG_LOGGING: "debugLogging",
    FOBLES_NAV_POSITION: "foblesNavPosition",
    FOBLES_NAV_VISIBLE: "foblesNavVisible",
    FOBLES_NAV_WARNING_VISIBLE: "foblesNavWarningVisible",
    FOBLES_STATE: "fobles_state",
    KICK_ALL_USERS: "fobles_kick_all_users",
    JUMP_FLYOUT_BUTTON_SETTINGS: "JumpFlyoutButtonSettings",
    REFERENCE_GRAPH: {
      FILTERS: "fobles_reference_graph_filters",
      LAYOUT: "fobles_reference_graph_layout",
      EXPANDED_BY_COLLAPSE_KEY:
        "fobles-reference-graph-expanded-by-collapse-key",
      CONTROLS_EXPANDED:
        "fobles-reference-graph-controls-expanded",
      WORKER_POOL_MAX_WORKERS:
        "fobles-reference-graph-worker-pool-max-workers",
      PENDING: "fobles_reference_graph_pending"
    },
    PERSIST_DEBUG_LOGS: "persistDebugLogs",
    PERSISTED_LOG_ENTRIES: "persistedLogEntries",
    SHOW_RELOAD_EXTENSION_BUTTON: "showReloadExtensionButton",
    TURN_OFF_FOBLES_AFTER_NAVIGATION: "turnOffFoblesAfterNavigation",
    USER_ADMIN_PAGES: "userAdminPages",
    USER_TREE_JUMPS: "userTreeJumps",
  },
} as const;

export const MESSAGE = {
  ACTION: {
    PAGE_READY: "page-ready",
    RELOAD_EXTENSION: "reload-extension",
    TOGGLE_FOBLES: "toggle-fobles",
    TOGGLE_LBOLT: "toggle-lbolt",
  },
} as const;

export const LOGGER = {
  NAMESPACE: "[Fobles]",
  PERSIST_DEBUG_LOGS: "persistDebugLogs",
  PERSISTED_LOG_ENTRIES: "persistedLogEntries",
} as const;
