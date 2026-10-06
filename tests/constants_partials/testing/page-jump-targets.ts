// @source-path [fobles] tests/constants/testing/page-jump-targets.ts

import type { PageJumpDefinition, TreeJumpDefinition } from "../CONST.Types";

export const TEST_TREE_JUMP_TARGETS: TreeJumpDefinition[] = [
  {
    label: "/Layout /Renderings",
  //   path: "/sitecore/layout/Renderings",
    skipTestingAI: false,
    clickNavigationExpect: {
      foValue: "/sitecore/layout/Renderings"
    }
  },
  {
    label: "/Layout /Placeholders",
  //   path: "/sitecore/layout/Placeholder Settings",
    skipTestingAI: false,
    clickNavigationExpect: {
      foValue: "/sitecore/layout/Placeholder Settings"
    }
  },
  {
    label: "/media",
  //   path: "/sitecore/media library",
    skipTestingAI: false,
    clickNavigationExpect: {
      foValue: "/sitecore/media library"
    }
  },
  {
    label: "/System /PowerShell",
    // path: "/sitecore/system/Modules/PowerShell/Script Library",
    skipTestingAI: false,
    clickNavigationExpect: {
      foValue: "/sitecore/system/Modules/PowerShell/Script Library"
    }
  },
  {
    label: "/Templates",
    // path: "/sitecore/templates",
    skipTestingAI: false,
    clickNavigationExpect: {
      foValue: "/sitecore/templates"
    }
  }
];

export const TEST_PAGE_JUMP_TARGETS: PageJumpDefinition[] = [
  {
    label: "Show Config",
   //  url: "/sitecore/admin/showconfig.aspx",
    skipTestingAI: false,
    clickNavigationExpect: {
      url: "/sitecore/admin/showconfig.aspx"
    }
  },
  {
    label: "Show Services Config",
   //  url: "/sitecore/admin/showservicesconfig.aspx",
    skipTestingAI: false,
    clickNavigationExpect: {
      url: "/sitecore/admin/showservicesconfig.aspx"
    }
  },
  {
    label: "Cache",
   //  url: "/sitecore/admin/cache.aspx",
    skipTestingAI: false,
    clickNavigationExpect: {
      url: "/sitecore/admin/cache.aspx"
    }
  },
  {
    label: "Jobs",
   //  url: "/sitecore/admin/jobs.aspx",
    skipTestingAI: false,
    clickNavigationExpect: {
      url: "/sitecore/admin/jobs.aspx"
    }
  },
  {
    label: "Stats",
   //  url: "/sitecore/admin/stats.aspx",
    skipTestingAI: false,
    clickNavigationExpect: {
      url: "/sitecore/admin/stats.aspx"
    }
  },
  {
    label: "Logs",
   //  url: "/sitecore/admin/logs.aspx",
    skipTestingAI: false,
    clickNavigationExpect: {
      url: "/sitecore/admin/logs.aspx"
    }
  },
  {
    label: "DB Browser",
   //  url: "/sitecore/admin/dbbrowser.aspx",
    skipTestingAI: true,
    clickNavigationExpect: {
      url: "/sitecore/admin/dbbrowser.aspx"
    }
  },
  {
    label: "Sitecore Icon Search",
   //  url: "https://sitecoreicons.com/",
    skipTestingAI: false,
    clickNavigationExpect: {
      url: "https://sitecoreicons.com/"
    }
  },
  {
    label: "PowerShell ISE",
   //  url: "/sitecore/shell/Applications/PowerShell/PowerShellIse?sc_bw=1",
    skipTestingAI: false,
    clickNavigationExpect: {
      url: "/sitecore/shell/Applications/PowerShell/PowerShellIse?sc_bw=1"
    }
  },
  {
    label: "Installation Wizard",
   //  url: "/sitecore/shell/applications/tools/installer/installationwizard",
    skipTestingAI: false,
    clickNavigationExpect: {
      url: "/sitecore/shell/applications/tools/installer/installationwizard"
    }
  },
  {
    label: "Kick User",
   //  url: "/sitecore/client/Applications/LicenseOptions/KickUser",
    skipTestingAI: false,
    clickNavigationExpect: {
      url: "/sitecore/client/Applications/LicenseOptions/KickUser"
    }
  },
  {
    label: "File Explorer",
   //  url: "/sitecore/shell/default.aspx?xmlcontrol=FileExplorer",
    skipTestingAI: false,
    clickNavigationExpect: {
      url: "/sitecore/shell/default.aspx?xmlcontrol=FileExplorer"
    }
  },
  {
    label: "Control Panel",
   //  url: "/sitecore/client/Applications/ControlPanel.aspx",
    skipTestingAI: false,
    clickNavigationExpect: {
      url: "/sitecore/client/Applications/ControlPanel.aspx"
    }
  },
  {
    label: "Launchpad",
   //  url: "/sitecore/shell/sitecore/client/applications/launchpad",
    skipTestingAI: true,
    clickNavigationExpect: {
      url: "/sitecore/shell/sitecore/client/applications/launchpad"
    }
  },
  {
    label: "Content Editor",
   //  url: "/sitecore/shell/Applications/Content%20Editor.aspx",
    skipTestingAI: false,
    clickNavigationExpect: {
      url: "/sitecore/shell/Applications/Content%20Editor.aspx"
    }
  },
  {
    label: "Package Designer",
   //  url: "/sitecore/shell/default.aspx?xmlcontrol=Application&hdl=E13B497DCC8642C390AAD7438BB8663B",
    skipTestingAI: true,
    clickNavigationExpect: {
      url: "/sitecore/shell/default.aspx?xmlcontrol=Application&hdl=E13B497DCC8642C390AAD7438BB8663B"
    }
  },
  {
    label: "Desktop",
   //  url: "/sitecore/shell/default.aspx",
    skipTestingAI: false,
    clickNavigationExpect: {
      url: "/sitecore/shell/default.aspx"
    }
  }
];