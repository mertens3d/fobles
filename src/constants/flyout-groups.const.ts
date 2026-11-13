// @source-path [fobles] src/constants/flyout-groups.const.ts

// import { kickAllUsers } from "./flyout-groups.types";
import type { FlyoutGroup } from "./constants.types";
import { FOBLES } from "./fobles.const";
import { TEXT } from "./fobles-b.const";
import { CONST } from "./const";

export const TREE_JUMP_GROUP: readonly FlyoutGroup[] = [
  {
    groupMembers: [
      {
        id: FOBLES.TOOLBAR.JUMP_FLYOUT.BUTTON_IDS.LAYOUT_RENDERINGS,
        label: "/Layout /Renderings",
        path: "/sitecore/layout/Renderings",
        icon: CONST.SITECORE.ICONS.SOFTWARE.ELEMENTS_48,
        isXPOnly: false,
        isAIOnly: false,
      },
      {
        id: FOBLES.TOOLBAR.JUMP_FLYOUT.BUTTON_IDS.LAYOUT_PLACEHOLDERS,
        label: "/Layout /Placeholders",
        path: "/sitecore/layout/Placeholder Settings",
        icon: CONST.SITECORE.ICONS.BUSINESS.TABLE_SELECTION_BLOCK_48,
        isXPOnly: false,
        isAIOnly: false,
      },
      {
        id: FOBLES.TOOLBAR.JUMP_FLYOUT.BUTTON_IDS.MEDIA_LIBRARY,
        label: "/media",
        path: "/sitecore/media library",
        icon: CONST.SITECORE.ICONS.APPLICATIONS.PHOTO_SCENERY_48,
        isXPOnly: false,
        isAIOnly: false,
      },
      {
        id: FOBLES.TOOLBAR.JUMP_FLYOUT.BUTTON_IDS.POWERSHELL_SCRIPT_LIBRARY,
        label: "/System /PowerShell",
        path: CONST.SITECORE.RELATIVE_PATHS_ENCODED.POWERSHELL_SCRIPT_LIBRARY,
        icon: CONST.SITECORE.ICONS.POWERSHELL.SCRIPT_LIBRARY_48,
        isXPOnly: false,
        isAIOnly: false,
      },
      {
        id: FOBLES.TOOLBAR.JUMP_FLYOUT.BUTTON_IDS.TEMPLATES,
        label: "/Templates",
        path: "/sitecore/templates",
        icon: CONST.SITECORE.ICONS.APPLICATIONS.FOLDER_CUBES_48,
        isXPOnly: false,
        isAIOnly: false,
      },
    ],
  },
];

export const ADMIN_PAGE_GROUP: readonly FlyoutGroup[] = [
  {
    groupMembers: [
      {
        id: FOBLES.TOOLBAR.JUMP_FLYOUT.BUTTON_IDS.SHOW_CONFIG,
        label: "Show Config",
        url: "/sitecore/admin/showconfig.aspx",
        icon: CONST.SITECORE.ICONS.APPLICATIONS.GEAR_VIEW_48,
        isXPOnly: false,
        isAIOnly: false,
      },
      {
        id: FOBLES.TOOLBAR.JUMP_FLYOUT.BUTTON_IDS.SHOW_SERVICES_CONFIG,
        label: "Show Services Config",
        url: "/sitecore/admin/showservicesconfig.aspx",
        icon: CONST.SITECORE.ICONS.APPLICATIONS.DOCUMENT_GEAR_48,
        isXPOnly: false,
        isAIOnly: false,
      },
      {
        id: FOBLES.TOOLBAR.JUMP_FLYOUT.BUTTON_IDS.CACHE,
        label: "Cache",
        url: "/sitecore/admin/cache.aspx",
        icon: CONST.SITECORE.ICONS.APPLICATIONS.DOCUMENT_GEAR_48,
        isXPOnly: false,
        isAIOnly: false,
      },
      {
        id: FOBLES.TOOLBAR.JUMP_FLYOUT.BUTTON_IDS.JOBS,
        label: "Jobs",
        url: "/sitecore/admin/jobs.aspx",
        icon: CONST.SITECORE.ICONS.APPLICATIONS.DOCUMENT_GEAR_48,
        isXPOnly: false,
        isAIOnly: false,
      },
      {
        id: FOBLES.TOOLBAR.JUMP_FLYOUT.BUTTON_IDS.STATS,
        label: "Stats",
        url: "/sitecore/admin/stats.aspx",
        icon: CONST.SITECORE.ICONS.APPLICATIONS.CHART_48,
        isXPOnly: false,
        isAIOnly: false,
      },
      {
        id: FOBLES.TOOLBAR.JUMP_FLYOUT.BUTTON_IDS.LOGS,
        label: "Logs",
        url: "/sitecore/admin/logs.aspx",
        icon: CONST.SITECORE.ICONS.APPLICATIONS.DOCUMENT_TEXT_48,
        isXPOnly: true,
        isAIOnly: false,
      },
      {
        id: FOBLES.TOOLBAR.JUMP_FLYOUT.BUTTON_IDS.DB_BROWSER,
        label: "DB Browser",
        url: "/sitecore/admin/dbbrowser.aspx",
        icon: CONST.SITECORE.ICONS.APPLICATIONS.DATABASE_48,
        isXPOnly: true,
        isAIOnly: false,
      },
    ],
  },
];

export const AI_GROUP: FlyoutGroup = {
  title: TEXT.GROUP_NAME.AI,
  groupMembers: [
    {
      id: FOBLES.TOOLBAR.JUMP_FLYOUT.BUTTON_IDS.AI_PAGES,
      label: "Pages",
      // action: (doc) => openAiPages(doc),
      icon: CONST.SITECORE.ICONS.APPLICATIONS.AI_PAGES_EDIT_48,
      isXPOnly: false,
      isAIOnly: true,
    },
  ],
};

export const THIRD_PARTY_GROUP: FlyoutGroup = {
  title: TEXT.GROUP_NAME.THIRD_PARTY,
  groupMembers: [
    {
      id: FOBLES.TOOLBAR.JUMP_FLYOUT.BUTTON_IDS.SITECORE_ICON_SEARCH,
      label: "Sitecore Icon Search",
      url: "https://sitecoreicons.com/",
      icon: CONST.SITECORE.ICONS.WORD_PROCESSING.SEARCH_A_H_32,
      isXPOnly: false,
      isAIOnly: false,
    },
  ],
};

export const APPLICATION_PAGE_GROUP: FlyoutGroup = {
  title: TEXT.GROUP_NAME.APPLICATION_PAGES,
  groupMembers: [
    {
      id: FOBLES.TOOLBAR.JUMP_FLYOUT.BUTTON_IDS.POWERSHELL_ISE,
      label: "PowerShell ISE",
      url: "/sitecore/shell/Applications/PowerShell/PowerShellIse?sc_bw=1",
      useCurrentItemId: true,
      icon: CONST.SITECORE.ICONS.POWERSHELL.ISE_48,
      isXPOnly: false,
      isAIOnly: false,
    },
    {
      id: FOBLES.TOOLBAR.JUMP_FLYOUT.BUTTON_IDS.INSTALLATION_WIZARD,
      label: "Installation Wizard",
      url: "/sitecore/shell/applications/tools/installer/installationwizard",
      icon: CONST.SITECORE.ICONS.APPLICATIONS.CD_48,
      isXPOnly: true,
      isAIOnly: false,
    },
    {
      id: FOBLES.TOOLBAR.JUMP_FLYOUT.BUTTON_IDS.KICK_USER,
      label: "Kick User",
      url: "/sitecore/client/Applications/LicenseOptions/KickUser",
      icon: CONST.SITECORE.ICONS.LICENSE_OPTIONS.USER,
      isXPOnly: false,
      isAIOnly: false,
    },
    // {
    //   id: FOBLES.TOOLBAR.JUMP_FLYOUT.BUTTON_IDS.KICK_ALL_USERS,
    //   label: "Kick All Users",
    //   action: (doc) => kickAllUsers(doc),
    //   icon: CONST.SITECORE.ICONS.LICENSE_OPTIONS.USER,
    //   isIncomplete: true,
    //   isXPOnly: false,
    //   isAIOnly: false,
    // },
    {
      id: FOBLES.TOOLBAR.JUMP_FLYOUT.BUTTON_IDS.FILE_EXPLORER,
      label: "File Explorer",
      url: "/sitecore/shell/default.aspx?xmlcontrol=FileExplorer",
      icon: CONST.SITECORE.ICONS.APPLICATIONS.FOLDER_WINDOW_48,
      isXPOnly: false,
      isAIOnly: false,
    },
    {
      id: FOBLES.TOOLBAR.JUMP_FLYOUT.BUTTON_IDS.CONTROL_PANEL,
      label: "Control Panel",
      url: "/sitecore/client/Applications/ControlPanel.aspx",
      icon: CONST.SITECORE.ICONS.LAUNCHPAD.CONTROL_PANEL_48,
      isXPOnly: false,
      isAIOnly: false,
    },
    {
      id: FOBLES.TOOLBAR.JUMP_FLYOUT.BUTTON_IDS.LAUNCHPAD,
      label: "Launchpad",
      url: "/sitecore/shell/sitecore/client/applications/launchpad",
      icon: CONST.SITECORE.ICONS.LAUNCHPAD.DOTS_GRID,
      isXPOnly: false,
      isAIOnly: false,
    },
    {
      id: FOBLES.TOOLBAR.JUMP_FLYOUT.BUTTON_IDS.CONTENT_EDITOR,
      label: "Content Editor",
      url: CONST.SITECORE.RELATIVE_PATHS_ENCODED.CONTENT_EDITOR_LEGACY,
      icon: CONST.SITECORE.ICONS.LAUNCHPAD.CONTENT_EDITOR_48,
      isXPOnly: false,
      isAIOnly: false,
    },
    {
      id: FOBLES.TOOLBAR.JUMP_FLYOUT.BUTTON_IDS.PACKAGE_DESIGNER,
      label: "Package Designer",
      url: "/sitecore/shell/default.aspx?xmlcontrol=Application&hdl=E13B497DCC8642C390AAD7438BB8663B",
      isXPOnly: true,
      isAIOnly: false,
    },
    {
      id: FOBLES.TOOLBAR.JUMP_FLYOUT.BUTTON_IDS.DESKTOP,
      label: "Desktop",
      url: "/sitecore/shell/default.aspx",
      icon: CONST.SITECORE.ICONS.LAUNCHPAD.DESKTOP_48,
      isXPOnly: false,
      isAIOnly: false,
    },
  ],
};
