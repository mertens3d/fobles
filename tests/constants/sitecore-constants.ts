export const SITECORE = {
  DOM: {
    TREE_NODE_IDS: {
      CONTENT: "Tree_Node_" + "0DE95AE4-41AB-4D01-9EB0-67441B7C2450",
    },
  },
  ITEMS: {
    CONTENT_ITEM_ID: "0DE95AE4-41AB-4D01-9EB0-67441B7C2450",
    FIELD_RENDERER: "E1AF4AA3-3B5D-4611-8C71-959AD261E5B7",
  },
  LABELS: {
    CONTENT_TAB: "Content",
    ITEM_PATH: "Item path:",
  },
  PATHS: {
    CONTENT_EDITOR: "/sitecore/shell/Applications/Content Editor.aspx?sc_bw=1",
    IDENTITY_AUTHORIZE: "/connect/authorize",
    LICENSE_STARTPAGE: "/sitecore/client/Applications/LicenseOptions/StartPage",
  },
  SELECTORS: {
    ACCOUNT_INFO: "ul.sc-accountInformation",
    // Auth0 Universal Login's own stable hook class (underscore-prefixed classes are documented
    // Auth0 CSS hooks, unlike the hashed utility classes alongside them) - what the "ai" test
    // environment lands on post-logout instead of XP's classic /Account/Login "login-page".
    AI_LOGIN_FORM: "._form-login-id",
    CONTENT_TAB: '#ContentEditor #EditorTabs span:has(:text-is("Content"))',
    LOGIN_PAGE: ".login-page",
    QUICK_INFO_TABLE: ".scEditorQuickInfo",
    RIBBON_TAB: {
      NAVIGATE: {
        LINKS_GALLERY_BUTTON: 'a[title="Show referenced and referred items."]',
        LINKS: '#Links',
      }
    },
    STRATEGIES: {
      DROP_LINK: "select.scContentControl.scCombobox",
      DROP_LIST: "select.scContentControl.scCombobox",
      DROP_TREE: "input.scComboboxEdit[readonly]",
      GENERAL_LINK: "input.scContentControl",
      INTERNAL_LINK: "input.scContentControl",
      MULTILIST: "select.scContentControlMultilistBox[id$='_selected']",
      MULTILIST_WITH_SEARCH: "select.scBucketListSelectedBox",
      TAG_LIST: "select.scContentControlMultilistBox",
      TREE_LIST: ".scContentControlSelectedList",
      TREELISTEX: "div.scContentControl.scTreelistEx",
    },
  },
  TREE_JUMP_PATHS: {
    LAYOUT_PLACEHOLDERS: "/sitecore/layout/Placeholder Settings",
    LAYOUT_RENDERINGS: "/sitecore/layout/Renderings",
    MEDIA_LIBRARY: "/sitecore/media library",
    TEMPLATES: "/sitecore/templates",
  },
  VERSIONS: {},
} as const;