import type { PageJumpDefinition } from "../CONST.Types";

export const TEST_PAGE_JUMP_TARGETS: PageJumpDefinition[] = [
  { label: "Show Config", url: "/sitecore/admin/showconfig.aspx", skipTestingAI: false },
  { label: "Show Services Config", url: "/sitecore/admin/showservicesconfig.aspx", skipTestingAI: false },
  { label: "Cache", url: "/sitecore/admin/cache.aspx", skipTestingAI: false },
  { label: "Jobs", url: "/sitecore/admin/jobs.aspx", skipTestingAI: false },
  { label: "Stats", url: "/sitecore/admin/stats.aspx", skipTestingAI: false },
  { label: "Logs", url: "/sitecore/admin/logs.aspx", skipTestingAI: false },
  { label: "DB Browser", url: "/sitecore/admin/dbbrowser.aspx", skipTestingAI: true },

  { label: "Sitecore Icon Search", url: "https://sitecoreicons.com/", skipTestingAI: false },

  {
    label: "PowerShell ISE",
    url: "/sitecore/shell/Applications/PowerShell/PowerShellIse?sc_bw=1",
    skipTestingAI: false,
  },
  {
    label: "Installation Wizard",
    url: "/sitecore/shell/applications/tools/installer/installationwizard",
    skipTestingAI: false,
  },
  {
    label: "Kick User",
    url: "/sitecore/client/Applications/LicenseOptions/KickUser",
    skipTestingAI: false,
  },
  {
    label: "File Explorer",
    url: "/sitecore/shell/default.aspx?xmlcontrol=FileExplorer",
    skipTestingAI: false,
  },
  {
    label: "Control Panel",
    url: "/sitecore/client/Applications/ControlPanel.aspx",
    skipTestingAI: false,
  },
  {
    // Launchpad now redirects into the newer app.sitecorecloud.io "Strategy" app shell instead of
    // the classic client app URL in this environment - known drift, not a Fobles bug. Skipped until
    // the expected destination is confirmed/stable.

    label: "Launchpad",
    url: "/sitecore/shell/sitecore/client/applications/launchpad",
    skipTestingAI: true,
  },
  {
    label: "Content Editor",
    url: "/sitecore/shell/Applications/Content Editor.aspx",
    skipTestingAI: false,
  },
  {
    label: "Package Designer",
    url: "/sitecore/shell/default.aspx?xmlcontrol=Application&hdl=E13B497DCC8642C390AAD7438BB8663B",
    skipTestingAI: true,

  },
  {
    label: "Desktop",
    url: "/sitecore/shell/default.aspx",
    skipTestingAI: false,
  },
];