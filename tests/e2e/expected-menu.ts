export const EXPECTED_TREE_JUMP_PATHS = [
  "/sitecore/layout/Renderings",
  "/sitecore/layout/Placeholder Settings",
  "/sitecore/media library",
  "/sitecore/system/Modules/PowerShell/Script Library",
  "/sitecore/media library/Project",
  "/sitecore/templates/Feature",
] as const;

export const EXPECTED_MENU_URLS = [
  { label: "Show Config", url: "/sitecore/admin/showconfig.aspx" },
  {
    label: "Show Services Config",
    url: "/sitecore/admin/showservicesconfig.aspx",
  },
  {
    label: "PowerShell ISE",
    url: "/sitecore/shell/Applications/PowerShell/PowerShellIse?sc_bw=1",
  },
  {
    label: "Kick User",
    url: "/sitecore/client/Applications/LicenseOptions/KickUser",
  },
  { label: "Cache", url: "/sitecore/admin/cache.aspx" },
  { label: "Unicorn", url: "/unicorn.aspx" },
  {
    label: "File Explorer",
    url: "/sitecore/shell/default.aspx?xmlcontrol=FileExplorer",
  },
  { label: "Jobs", url: "/sitecore/admin/jobs.aspx" },
  { label: "Stats", url: "/sitecore/admin/stats.aspx" },
  { label: "DB Browser", url: "/sitecore/admin/dbbrowser.aspx" },
  { label: "Logs", url: "/sitecore/admin/logs.aspx" },
  {
    label: "Launchpad",
    url: "/sitecore/shell/sitecore/client/applications/launchpad",
  },
  {
    label: "Control Panel",
    url: "/sitecore/client/Applications/ControlPanel.aspx",
  },
  { label: "Desktop", url: "/sitecore/shell/default.aspx" },
  {
    label: "Content Editor",
    url: "/sitecore/shell/Applications/Content Editor.aspx",
  },
  { label: "Sitecore Icon Search", url: "https://sitecoreicons.com/" },
] as const;
