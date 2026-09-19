import { TEXT } from "../../content/constants";
import { SITECORE } from "../../content/sitecore";
import { openAiPages } from "../../content/features/quick-menu/ai-pages";
import { kickAllUsers } from "../../content/features/quick-menu/kick-users";
import { QUICK_MENU_BUTTON_ID } from "./button-ids";
import type { MenuGroup } from "./menu.types";

const KICK_USER_ICON = "/sitecore/shell/client/Applications/LicenseOptions/Assets/img/user.png";

export const TREE_JUMP_GROUP: readonly MenuGroup[] = [
  {
    groupMembers: [
      { id: QUICK_MENU_BUTTON_ID.LAYOUT_RENDERINGS, label: "/Layout /Renderings", path: "/sitecore/layout/Renderings", icon: "/-/icon/software/48x48/elements1.png", isXPOnly: false, isAIOnly: false },
      { id: QUICK_MENU_BUTTON_ID.LAYOUT_PLACEHOLDERS, label: "/Layout /Placeholders", path: "/sitecore/layout/Placeholder Settings", icon: "/-/icon/business/48x48/table_selection_block.png", isXPOnly: false, isAIOnly: false },
      { id: QUICK_MENU_BUTTON_ID.MEDIA_LIBRARY, label: "/Media library", path: "/sitecore/media library", icon: "/-/icon/applications/48x48/photo_scenery.png", isXPOnly: false, isAIOnly: false },
      { id: QUICK_MENU_BUTTON_ID.POWERSHELL_SCRIPT_LIBRARY, label: "/System /PowerShell", path: SITECORE.RELATIVE_PATHS.POWERSHELL_SCRIPT_LIBRARY, icon: "/-/icon//powershell/48x48/spe.png", isXPOnly: false, isAIOnly: false },
      { id: QUICK_MENU_BUTTON_ID.MEDIA_PROJECT, label: "/Media /Project", path: "/sitecore/media library/Project", icon: "/-/icon/Applications/48x48/folder_window.png", isXPOnly: false, isAIOnly: false },
      { id: QUICK_MENU_BUTTON_ID.TEMPLATES, label: "/Templates", path: "/sitecore/templates", icon: "/-/icon/Applications/48x48/folder_cubes.png", isXPOnly: false, isAIOnly: false },
    ],
  },
];

// Kept strictly to /sitecore/admin/* pages so membership is mechanical, not a judgment call.
export const ADMIN_PAGE_GROUP: readonly MenuGroup[] = [
  {
    groupMembers: [
      { id: QUICK_MENU_BUTTON_ID.SHOW_CONFIG, label: "Show Config", url: "/sitecore/admin/showconfig.aspx", icon: "/~/icon/applications/48x48/gear_view.png", isXPOnly: false, isAIOnly: false },
      { id: QUICK_MENU_BUTTON_ID.SHOW_SERVICES_CONFIG, label: "Show Services Config", url: "/sitecore/admin/showservicesconfig.aspx", icon: "/-/icon/Applications/48x48/document_gear.png", isXPOnly: false, isAIOnly: false },
      { id: QUICK_MENU_BUTTON_ID.CACHE, label: "Cache", url: "/sitecore/admin/cache.aspx", icon: "/-/icon/Applications/48x48/document_gear.png", isXPOnly: false, isAIOnly: false },
      { id: QUICK_MENU_BUTTON_ID.JOBS, label: "Jobs", url: "/sitecore/admin/jobs.aspx", icon: "/-/icon/Applications/48x48/document_gear.png", isXPOnly: false, isAIOnly: false },
      { id: QUICK_MENU_BUTTON_ID.STATS, label: "Stats", url: "/sitecore/admin/stats.aspx", icon: "/-/icon/Applications/48x48/chart.png", isXPOnly: false, isAIOnly: false },
      { id: QUICK_MENU_BUTTON_ID.LOGS, label: "Logs", url: "/sitecore/admin/logs.aspx", icon: "/-/icon/Applications/48x48/document_text.png", isXPOnly: true, isAIOnly: false },
      { id: QUICK_MENU_BUTTON_ID.DB_BROWSER, label: "DB Browser", url: "/sitecore/admin/dbbrowser.aspx", icon: "/-/icon/Applications/48x48/database.png", isXPOnly: true, isAIOnly: false },
    ],
  },
];

export const AI_GROUP: MenuGroup = {
  title: TEXT.GROUP_NAME.AI,
  groupMembers: [
    { id: QUICK_MENU_BUTTON_ID.AI_PAGES, label: "Pages", action: (doc) => openAiPages(doc), icon: "/~/icon/applicationsv2/48x48/edit.png", isXPOnly: false, isAIOnly: true },
  ],
};

export const THIRD_PARTY_GROUP: MenuGroup = {
  title: TEXT.GROUP_NAME.THIRD_PARTY,
  groupMembers: [
    { id: QUICK_MENU_BUTTON_ID.SITECORE_ICON_SEARCH, label: "Sitecore Icon Search", url: "https://sitecoreicons.com/" , icon: "/-/icon/wordprocessing/32x32/search_a_h.png", isXPOnly: false, isAIOnly: false },
    { id: QUICK_MENU_BUTTON_ID.UNICORN, label: "Unicorn", url: "/unicorn.aspx" , icon: "/~/icon/applicationsv2/32x32/arrow_up_right_green.png", isXPOnly: false, isAIOnly: false },
  ],
};

export const APPLICATION_PAGE_GROUP: MenuGroup = {
  title: TEXT.GROUP_NAME.APPLICATION_PAGES,
  groupMembers: [
    { id: QUICK_MENU_BUTTON_ID.POWERSHELL_ISE, label: "PowerShell ISE", url: "/sitecore/shell/Applications/PowerShell/PowerShellIse?sc_bw=1", useCurrentItemId: true, icon: "/-/icon/powershell/48x48/ise8.png", isXPOnly: false, isAIOnly: false },
    { id: QUICK_MENU_BUTTON_ID.INSTALLATION_WIZARD, label: "Installation Wizard", url: "/sitecore/shell/applications/tools/installer/installationwizard", icon: "/-/icon/Applications/48x48/cd.png", isXPOnly: false, isAIOnly: false },
    { id: QUICK_MENU_BUTTON_ID.KICK_USER, label: "Kick User", url: "/sitecore/client/Applications/LicenseOptions/KickUser", icon: KICK_USER_ICON, isXPOnly: false, isAIOnly: false },
    { id: QUICK_MENU_BUTTON_ID.KICK_ALL_USERS, label: "Kick All Users", action: (doc) => kickAllUsers(doc), icon: KICK_USER_ICON, isIncomplete: true, isXPOnly: false, isAIOnly: false },
    { id: QUICK_MENU_BUTTON_ID.FILE_EXPLORER, label: "File Explorer", url: "/sitecore/shell/default.aspx?xmlcontrol=FileExplorer", icon: "/-/icon/Applications/48x48/folder_window.png", isXPOnly: false, isAIOnly: false },
    { id: QUICK_MENU_BUTTON_ID.CONTROL_PANEL, label: "Control Panel", url: "/sitecore/client/Applications/ControlPanel.aspx", icon: "/-/icon/launchpadicons/48x48/controlpanel.png", isXPOnly: false, isAIOnly: false },
    { id: QUICK_MENU_BUTTON_ID.LAUNCHPAD, label: "Launchpad", url: "/sitecore/shell/sitecore/client/applications/launchpad", icon: "/sitecore/shell/client/Applications/LaunchPad/Assets/dots-grid.svg", isXPOnly: false, isAIOnly: false },
    { id: QUICK_MENU_BUTTON_ID.CONTENT_EDITOR, label: "Content Editor", url: SITECORE.RELATIVE_PATHS.CONTENT_EDITOR, icon: "/-/icon/launchpadicons/48x48/contenteditor.png", isXPOnly: false, isAIOnly: false },
    { id: QUICK_MENU_BUTTON_ID.PACKAGE_DESIGNER, label: "Package Designer", url: "/sitecore/shell/default.aspx?xmlcontrol=Application&hdl=E13B497DCC8642C390AAD7438BB8663B", isXPOnly: false, isAIOnly: false },
    { id: QUICK_MENU_BUTTON_ID.DESKTOP, label: "Desktop", url: "/sitecore/shell/default.aspx", icon: "/-/icon/launchpadicons/48x48/desktop.png", isXPOnly: false, isAIOnly: false },
  ],
};
