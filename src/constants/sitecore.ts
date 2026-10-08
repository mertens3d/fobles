export const SITECORE = {
  ACTION_PREFIXES: {
    FILE: "contentfile",
    GENERAL_LINK: "contentlink",
    ICON: "icon",
    IMAGE: "contentimage",
    INTERNAL_LINK: "contentinternallink",
  },
  // Well-known system item ids Sitecore ships with every install.
  DEVICES: {
    DEFAULT: "{FE5D7FDF-89C0-4D99-9AA3-B5FBD009C9F3}",
  },
  QUERY_PARAMS: {
    DATABASE: "db",
    // Alternate query keys Sitecore itself uses to indicate the current database.
    DATABASE_KEYS: ["db", "sc_content"],
    ITEM_ID: "id",
    XML_CONTROL: "xmlcontrol",
  },
  // Named so every path used to build FOBLES_PAGES has an identifier, not just a bare literal.
  RELATIVE_PATHS_ENCODED: {
    CHANGE_TEMPLATE: "/sitecore/shell/Applications/Templates/Change%20template.aspx",
    CONTENT_EDITOR_LEGACY: "/sitecore/shell/Applications/Content%20Editor.aspx",
    CONTENT_EDITOR_MODERN: "/sitecore/shell/Applications/Content-Editor",
    CONTENT_MANAGER: "/sitecore/shell/Applications/Content%20Manager/default.aspx",
    FIELD_EDITOR: "/sitecore/shell/Applications/Field%20Editor.aspx",
    KICK_USERS: "/sitecore/client/Applications/LicenseOptions/KickUser.aspx",
    // Sitecore's media request virtual path; can appear nested after another page's path segment
    // (e.g. behind Content Editor.aspx) but is never itself a page eligible for the toolbar.
    MEDIA_REQUEST_SEGMENT: "/sitecore/shell/applications/-/media/",
    POWERSHELL_ISE: "/sitecore/shell/Applications/PowerShell/PowerShellIse",
    POWERSHELL_SCRIPT_LIBRARY: "/sitecore/system/Modules/PowerShell/Script Library",
    // Required root for user-defined Tree Jumps (src/shared/jump-flyout/user-tree-jump-constants.ts).
    ROOT: "/sitecore",
    SHELL_DEFAULT: "/sitecore/shell/default.aspx",
    TEMPLATE_MANAGER: "/sitecore/shell/Applications/Templates/Template-Manager",
  },
  // Mirrors src/content/toolbar/sc-proxy-buttons.ts's real ribbon checkbox ids for these same toggles.
  RIBBON_CHECKBOXES: {
    RAW_VALUES: "Check_BBDED3F008D144C82A983B54F0424BBC1",
    STANDARD_FIELDS: "Check_BC29C1D329FB74DA585083FEC2AF3A81D",
  },
  SELECTORS: {
    COMBOBOX: ".scCombobox",
    CONTENT_CONTROL: ".scContentControl",
    DATABASE_INPUT: "input[id$='_Database'][value]",
    EDITOR_FIELD_MARKER: ".scEditorFieldMarker",
    FIELD_ACTION: "a.scContentButton",
    FIELD_ACTIONS: ".scContentButtons",
    FIELD_ACTION_LINKS: ".scContentButtons > a.scContentButton",
    FIELD_CELL: "td.scEditorFieldMarkerInputCell",
    FIELD_LABEL: ".scEditorFieldLabel",
    GLOBAL_HEADER: ".sc-globalHeader",
    GLOBAL_HEADER_CONTENT: ".sc-globalHeader-content",
    MULTILIST: ".scContentControlMultilist",
    MULTILIST_BOX: ".scContentControlMultilistBox",
    MULTILIST_FIELD_BUTTONS: ".scContentButtons, .scContentButton",
    MULTILIST_NAV: ".scMultilistNav",
    MULTILIST_NAV_BUTTON: "img.scNavButton",
    MULTILIST_WITH_SEARCH_NAV_ARROWS: "img[id^='btnRight'], img[id^='btnLeft'], img[id^='btnUp'], img[id^='btnDown']",
    PROFILE_CARDS_IMAGE: "img.scEditorHeaderCustomizeProfilesIcon",
    SCRIPT_NAME: "#ScriptName",
    SECTION_CAPTION: "[class*='scEditorSectionCaption']",
    TAG_LIST_NAV_ARROWS: "img[id$='_right'], img[id$='_left'], img[id$='_up'], img[id$='_down']",
    TREE_GLYPH: "img[id^='Tree_Glyph_']",
    TREE_LIST_ALL_PANE: ".scScrollbox.scContentControlTree",
    TREE_LIST_SELECTED_PANE: ".scContentControlSelectedList",
    TREE_NODE: ".scContentTreeNode",
    TREE_NODE_LINK: "a[id^='Tree_Node_']",
    TREE_NODE_TITLE: ".scContentTreeNodeTitle",
    TREE_NODES_WITH_ID: ".scContentTreeNode[id]",
    // #ContentTreeInnerPanel/#Treeview cover the two ids already confirmed; the attribute
    // selector is Sitecore's own generic Treeview webcontrol root marker (every tree panel wires
    // its root's onclick to this same handler), so it also catches trees with other container
    // ids - e.g. Add From Template's own "Templates" tree root - without needing one hardcoded id
    // per dialog.
    TREE_ROOT: "#ContentTreeInnerPanel, #Treeview, [onclick*='Sitecore.Treeview.onTreeClick']",
    URI_ELEMENT: "[onfocus*='sitecore://'], [onblur*='sitecore://']",
  },
  TREE_ID_PREFIXES: {
    GLYPH: "Tree_Glyph_",
    NODE: "Tree_Node_",
    SELECT_RENDERING: "Treeview_",
    // Change Template dialog's own tree widget (see src/content/features/augmentor/
    // treeNodeFobles/index.ts's getTreeNodeItemId) - its nodes carry the item id directly on this
    // prefix rather than via a Tree_Node_-prefixed anchor.
    TEMPLATE_LISTER: "TemplateLister_",
  },
  XML_CONTROLS: {
    ADD_FROM_TEMPLATE: "AddFromTemplate",
    DEVICE_EDITOR: "DeviceEditor",
    FILE_EXPLORER: "FileExplorer",
    GALLERY_FAVORITES: "Gallery.Favorites",
    GALLERY_SUBITEMS: "Gallery.Subitems",
    SELECT_RENDERING: "Sitecore.Shell.Applications.Dialogs.SelectRendering",
    TREE_LIST_EX_EDITOR: "TreeListExEditor",
  },
} as const;
