// One entry per real serialized YAML file this test suite reads data from, grouped the same way
// as tests/items-fobles/serialization/'s own folders (fobles.system.modules.fobles = CONTENT,
// fobles.templates.modules.fobles = TEMPLATES, fobles.media.library.fobles = MEDIA) - each bottom
// object holds only the specific id/field values a test actually needs from that one file, copied
// verbatim, not combined with any other file. TEMPLATES/MEDIA are empty for now since no current
// strategy test reads a template field definition or a media item; add entries there as needed.
// Downstream derivation (e.g. building the final expected button text/navigation target per
// strategy) lives in strategy-yml-refs.ts/strategy-scenarios.ts instead.
export const FOBLES_YML = {
  CONTENT: {
    // Strategy Scenarios/Strategy droplink.yml
    STRATEGY_DROPLINK: {
      id: "25fb9977-cc90-4e3c-b036-cafaae676303",
      path: "/sitecore/system/Modules/Fobles Testing/Strategy Scenarios/Strategy droplink",
      fieldHint: "Strategy DropLink 1x",
      fieldValue: "{2CAAAD6C-31B1-4672-9576-C408177DC2DB}",
    },
    // Strategy Scenarios/Strategy droptree.yml
    STRATEGY_DROPTREE: {
      id: "3e4f5a6b-7c8d-4e9f-8a0b-c2d3e4f5a6b7",
      path: "/sitecore/system/Modules/Fobles Testing/Strategy Scenarios/Strategy droptree",
      fieldHint: "Strategy DropTree 1x",
      fieldValue: "{2CAAAD6C-31B1-4672-9576-C408177DC2DB}",
    },
    // Strategy Scenarios/Strategy droplist.yml
    STRATEGY_DROPLIST: {
      id: "9fb07e8d-d1a2-40f7-8d9e-2c4f6a7b8c9d",
      path: "/sitecore/system/Modules/Fobles Testing/Strategy Scenarios/Strategy droplist",
      fieldHint: "Strategy DropList 1x",
      fieldValue: "Fobles Data Item A",
    },
    // Strategy Scenarios/Strategy general link.yml
    STRATEGY_GENERAL_LINK: {
      id: "c8d9e0f1-a2b3-4c4d-8e5f-a6b7c8d9e0f2",
      fieldHint: "Strategy General Link Internal",
      fieldValue:
        '<link text="" anchor="" linktype="internal" class="" title="" target="" querystring="" id="{4F1948ED-6D71-4499-8097-794751BC5175}" />',
    },
    // Strategy Scenarios/Strategy internal link.yml
    STRATEGY_INTERNAL_LINK: {
      id: "5e6f7081-92a3-4eb4-8fc5-d6e7f8091a2b",
      fieldHint: "Strategy Internal Link Set",
      fieldValue: "/sitecore/system/Modules/Fobles Testing",
    },
    // Strategy Scenarios/Strategy multilist.yml
    STRATEGY_MULTILIST: {
      id: "718293a4-b5c6-4ad7-8be8-f90a1b2c3d4e",
      path: "/sitecore/system/Modules/Fobles Testing/Strategy Scenarios/Strategy multilist",
      fieldHint: "Strategy Multilist 1x",
      fieldValue: "{2CAAAD6C-31B1-4672-9576-C408177DC2DB}",
    },
    // Strategy Scenarios/Strategy multilist search.yml
    STRATEGY_MULTILIST_SEARCH: {
      id: "a7b1c2d3-4e5f-4b60-8c71-1a2b3c4d5e6f",
      fieldHint: "Strategy Multilist Search 1x",
      fieldValue: "{2CAAAD6C-31B1-4672-9576-C408177DC2DB}",
    },
    // Strategy Scenarios/Strategy tag list.yml
    STRATEGY_TAG_LIST: {
      id: "84091a2b-3243-4b5e-8c6f-f90a1b2c3d4e",
      fieldHint: "Strategy Tag List 1x",
      fieldValue: "{2CAAAD6C-31B1-4672-9576-C408177DC2DB}",
    },
    // Strategy Scenarios/Strategy tree list.yml
    STRATEGY_TREE_LIST: {
      id: "fb76829c-a9ba-4c25-8d36-6071829a3415",
      path: "/sitecore/system/Modules/Fobles Testing/Strategy Scenarios/Strategy tree list",
      fieldHint: "Strategy Tree List 1x",
      fieldValue: "{2CAAAD6C-31B1-4672-9576-C408177DC2DB}",
    },
    // Strategy Scenarios/Strategy treelist ex.yml
    STRATEGY_TREELIST_EX: {
      id: "4c5b58e8-feea-4c2b-8d3c-5d6e7f809102",
      path: "/sitecore/system/Modules/Fobles Testing/Strategy Scenarios/Strategy treelist ex",
      fieldHint: "Strategy Treelist Ex 1x",
      fieldValue: "{2CAAAD6C-31B1-4672-9576-C408177DC2DB}",
    },
    // Field Data/List 1x/Fobles Data Item A.yml - the shared target most strategies above select.
    FOBLES_DATA_ITEM_A: {
      id: "2caaad6c-31b1-4672-9576-c408177dc2db",
      path: "/sitecore/system/Modules/Fobles Testing/Field Data/List 1x/Fobles Data Item A",
    },
    // Fobles Testing.yml - the module root; General Link/Internal Link's own target, and the
    // ancestor whose __Display Name Drop Tree's widget renders instead of the real item name.
    FOBLES_TESTING_MODULE_ROOT: {
      id: "4f1948ed-6d71-4499-8097-794751bc5175",
      path: "/sitecore/system/Modules/Fobles Testing",
      displayName: "Fobles Testing - (ok to delete)",
    },
  },
  TEMPLATES: {
    // Fobles Data Item.yml - Multilist with Search's rendered option label includes this
    // template's own name alongside the item name (see strategy-scenarios.ts); reference-links
    // (tests/e2e/editor/) also targets it directly as the item's "refers to" Quick Info link.
    FOBLES_DATA_ITEM_TEMPLATE: {
      id: "0e2e40ba-308c-4484-a31a-bfd647d78312",
      path: "/sitecore/templates/Modules/Fobles Testing/Fobles Data Item",
    },
  },
  MEDIA: {},
} as const;


