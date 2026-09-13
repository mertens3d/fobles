import { ATTRIBUTE, CLASS, SELECTORS, SITECORE, TEXT } from "../../extension/constants";
import { extensionLog } from "../../extension/logger";
import { createFobleButton } from "../fobles/helper";
import { getCurrentItemId, getQuickInfoValue, openAiPages } from "./ai-pages";
import { kickAllUsers } from "./kick-users";
import { setProxyButtonsVisible } from "../proxy-buttons";

export { resumeKickAllUsers } from "./kick-users";

interface MenuOption {
  label: string;
  path?: string;
  url?: string;
  useCurrentItemId?: boolean;
  action?: (doc: Document) => void;
  icon?: string;
}

interface MenuGroup {
  title?: string;
  options: readonly MenuOption[];
}

const getCurrentDatabase = (doc: Document): string | null => {
  const currentUrl = new URL(
    doc.defaultView?.location.href ?? window.location.href,
  );
  for (const queryKey of SITECORE.DATABASE_QUERY_KEYS) {
    const database = currentUrl.searchParams.get(queryKey)?.trim();
    if (database) return database;
  }

  const databaseInput = doc.querySelector<HTMLInputElement>(
    SELECTORS.SITECORE_DATABASE_INPUT,
  );
  if (databaseInput?.value.trim()) return databaseInput.value.trim();

  const contextElement = doc.querySelector<HTMLElement>(
    SELECTORS.SITECORE_URI_ELEMENT,
  );
  const sitecoreUri = [
    contextElement?.getAttribute("onfocus"),
    contextElement?.getAttribute("onblur"),
  ].find((value) => value?.includes("sitecore://"));
  return sitecoreUri?.match(/sitecore:\/\/([^/]+)/i)?.[1] ?? null;
};

// A "path" option jumps the content editor tree (fo=), a "url" option navigates directly.
const buildMenuOptionUrl = (doc: Document, option: MenuOption): string => {
  if (option.path !== undefined) {
    return `${window.location.origin}${SITECORE.CONTENT_EDITOR_PATH}?sc_bw=1&fo=${encodeURI(option.path)}`;
  }

  const origin = doc.defaultView?.location.origin ?? window.location.origin;
  const url = new URL(option.url ?? "", origin);
  if (option.useCurrentItemId) {
    const itemId = getCurrentItemId(doc);
    const database = getCurrentDatabase(doc);
    if (itemId) url.searchParams.set(SITECORE.ITEM_ID_QUERY_PARAMETER, itemId);
    if (database) url.searchParams.set(SITECORE.DATABASE_QUERY_PARAMETER, database);
  }
  return url.toString();
};

const TREE_JUMP_GROUPS: readonly MenuGroup[] = [
  {
    options: [
      { label: "/Layout /Renderings", path: "/sitecore/layout/Renderings", icon: "/-/icon/software/48x48/elements1.png" },
      { label: "/Layout /Placeholders", path: "/sitecore/layout/Placeholder Settings", icon: "/-/icon/business/48x48/table_selection_block.png" },
      { label: "/Media library", path: "/sitecore/media library", icon: "/-/icon/applications/48x48/photo_scenery.png" },
      { label: "/System /PowerShell", path: "/sitecore/system/Modules/PowerShell/Script Library", icon: "/-/icon//powershell/48x48/spe.png" },
      { label: "/Media /Project", path: "/sitecore/media library/Project", icon: "/-/icon/Applications/48x48/folder_window.png" },
      { label: "/Templates /Feature", path: "/sitecore/templates/Feature", icon: "/-/icon/Applications/48x48/folder_cubes.png" },
    ],
  },
];

const ADMIN_PAGE_GROUPS: readonly MenuGroup[] = [
  {
    options: [
      { label: "Show Config", url: "/sitecore/admin/showconfig.aspx", icon: "/~/icon/applications/48x48/gear_view.png" },
      { label: "Show Services Config", url: "/sitecore/admin/showservicesconfig.aspx", icon: "/-/icon/Applications/48x48/document_gear.png"  },
      { label: "PowerShell ISE", url: "/sitecore/shell/Applications/PowerShell/PowerShellIse?sc_bw=1", useCurrentItemId: true, icon: "/-/icon/powershell/48x48/ise8.png" },
      { label: "Kick User", url: "/sitecore/client/Applications/LicenseOptions/KickUser", icon: "/sitecore/shell/client/Applications/LicenseOptions/Assets/img/user.png" },
      { label: "Kick All Users", action: (doc) => kickAllUsers(doc), icon: "/sitecore/shell/client/Applications/LicenseOptions/Assets/img/user.png" },
      { label: "Cache", url: "/sitecore/admin/cache.aspx", icon: "/-/icon/Applications/48x48/document_gear.png"  },
      { label: "Unicorn", url: "/unicorn.aspx" , icon: "/~/icon/applicationsv2/32x32/arrow_up_right_green.png" },
      { label: "File Explorer", url: "/sitecore/shell/default.aspx?xmlcontrol=FileExplorer", icon: "/-/icon/Applications/48x48/folder_window.png" },
      { label: "Jobs", url: "/sitecore/admin/jobs.aspx", icon: "/-/icon/Applications/48x48/document_gear.png" },
      { label: "Stats", url: "/sitecore/admin/stats.aspx", icon: "/-/icon/Applications/48x48/chart.png" },
    ],
  },
  {
    title: "XP",
    options: [
      { label: "DB Browser", url: "/sitecore/admin/dbbrowser.aspx", icon: "/-/icon/Applications/48x48/database.png" },
      { label: "Logs", url: "/sitecore/admin/logs.aspx", icon: "/-/icon/Applications/48x48/document_text.png" },
    ],
  },
];

const LANDING_PAGE_GROUPS: readonly MenuGroup[] = [
  {
    options: [
      { label: "Launchpad", url: "/sitecore/shell/sitecore/client/applications/launchpad", icon: "/sitecore/shell/client/Applications/LaunchPad/Assets/dots-grid.svg" },
      { label: "Control Panel", url: "/sitecore/client/Applications/ControlPanel.aspx", icon: "/-/icon/launchpadicons/48x48/controlpanel.png" },
      { label: "Desktop", url: "/sitecore/shell/default.aspx", icon: "/-/icon/launchpadicons/48x48/desktop.png" },
      { label: "Content Editor", url: SITECORE.CONTENT_EDITOR_PATH, icon: "/-/icon/launchpadicons/48x48/contenteditor.png" },
    ],
  },
  {
    title: "AI",
    options: [{ label: "Pages", action: (doc) => openAiPages(doc), icon: "/~/icon/applicationsv2/48x48/edit.png"}],
  },
  {
    title: "External",
    options: [{ label: "Sitecore Icon Search", url: "https://sitecoreicons.com/" , icon: "/-/icon/wordprocessing/32x32/search_a_h.png"}],
  },
];

const createMenuOptionButton = (doc: Document, option: MenuOption): HTMLButtonElement => {
  const button = createFobleButton(
    doc,
    option.label,
    () => buildMenuOptionUrl(doc, option),
    {
      attrName: ATTRIBUTE.DATA.KEY.FOBLE_NAV_OWNER,
      attrValue: "1",
      classNames: [CLASS.FOBLE_NAV_BUTTON, CLASS.FOBLE_NAV_BUTTON_COMPACT],
    },
  );

  // Split the plain-text button into an outlined icon box + a pill-styled label so the
  // icon isn't tinted by the fobles background, with a straight divider between them.
  button.textContent = "";
  const iconBox = doc.createElement("span");
  iconBox.className = CLASS.QUICK_MENU_OPTION_ICON_BOX;
  const icon = doc.createElement(option.icon ? "img" : "span");
  icon.className = CLASS.QUICK_MENU_OPTION_ICON;
  if (option.icon) {
    (icon as HTMLImageElement).src = option.icon;
    (icon as HTMLImageElement).alt = "";
  }
  iconBox.appendChild(icon);
  button.appendChild(iconBox);

  const label = doc.createElement("span");
  label.className = CLASS.QUICK_MENU_OPTION_LABEL;
  label.textContent = option.label;
  button.appendChild(label);

  if (option.path !== undefined) {
    button.dataset.fobleTreeJumpPath = option.path;
  }
  if (option.url !== undefined) {
    button.dataset.fobleMenuUrl = option.url;
  }

  if (option.action) {
    button.onclick = (event) => {
      event.preventDefault();
      option.action?.(doc);
    };
  }

  button.addEventListener("click", () => setQuickMenuVisible(doc, false), {
    capture: true,
  });
  return button;
};

const createMenuOptionRow = (doc: Document, option: MenuOption): HTMLDivElement => {
  const row = doc.createElement("div");
  row.className = CLASS.QUICK_MENU_ACTION;
  row.appendChild(createMenuOptionButton(doc, option));
  return row;
};

const createMenuGroup = (doc: Document, group: MenuGroup): HTMLDivElement => {
  const wrapper = doc.createElement("div");
  wrapper.className = CLASS.QUICK_MENU_GROUP;

  if (group.title) {
    const heading = doc.createElement("div");
    heading.className = CLASS.QUICK_MENU_GROUP_TITLE;
    heading.textContent = group.title;
    wrapper.appendChild(heading);
  }

  const actions = doc.createElement("div");
  actions.className = CLASS.QUICK_MENU_ACTIONS;
  group.options.forEach((option) => actions.appendChild(createMenuOptionRow(doc, option)));
  wrapper.appendChild(actions);
  return wrapper;
};

const createMenuColumn = (
  doc: Document,
  title: string,
  groups: readonly MenuGroup[],
): HTMLDivElement => {
  const column = doc.createElement("div");
  column.className = CLASS.QUICK_MENU_COLUMN;

  const heading = doc.createElement("div");
  heading.className = CLASS.QUICK_MENU_COLUMN_TITLE;
  heading.textContent = title;
  column.appendChild(heading);

  groups.forEach((group) => column.appendChild(createMenuGroup(doc, group)));
  return column;
};

const createQuickMenu = (doc: Document): HTMLDivElement => {
  const menu = doc.createElement("div");
  menu.className = CLASS.QUICK_MENU;
  menu.setAttribute("data-quick-menu", "1");

  const columns = doc.createElement("div");
  columns.className = CLASS.QUICK_MENU_COLUMNS;
  columns.appendChild(createMenuColumn(doc, TEXT.TREE_JUMPS, TREE_JUMP_GROUPS));
  columns.appendChild(createMenuColumn(doc, TEXT.ADMIN_PAGES, ADMIN_PAGE_GROUPS));
  columns.appendChild(createMenuColumn(doc, TEXT.LANDING_PAGES, LANDING_PAGE_GROUPS));
  menu.appendChild(columns);
  return menu;
};

const closeQuickMenuOnOutsidePointer = (doc: Document, container: Element): void => {
  doc.addEventListener("pointerdown", (event) => {
    if (!container.contains(event.target as Node)) {
      setQuickMenuVisible(doc, false);
    }
  });
};

const getOrCreateQuickMenu = (doc: Document): HTMLDivElement | null => {
  const trigger = doc.querySelector(SELECTORS.QUICK_MENU_TRIGGER);
  if (!trigger) return null;

  const existing = trigger.querySelector(SELECTORS.QUICK_MENU) as HTMLDivElement | null;
  if (existing) return existing;

  const menu = createQuickMenu(doc);
  // The panel renders outside the trigger's own hit box, so bridge the gap with a
  // close delay instead of relying on the trigger's mouseleave alone.
  menu.addEventListener("mouseenter", cancelQuickMenuClose);
  menu.addEventListener("mouseleave", () => scheduleQuickMenuClose(doc));
  trigger.appendChild(menu);
  closeQuickMenuOnOutsidePointer(doc, trigger);
  return menu;
};

export function isQuickMenuVisible(doc: Document): boolean {
  return doc.querySelector(SELECTORS.QUICK_MENU)?.getAttribute("data-visible") === "true";
}

export function setQuickMenuVisible(doc: Document, visible: boolean): void {
  const menu = getOrCreateQuickMenu(doc);
  menu?.setAttribute("data-visible", visible ? "true" : "false");
  if (!visible) quickMenuPinned = false;

  if (visible) setProxyButtonsVisible(doc, false);
}

let quickMenuPinned = false;

export function isQuickMenuPinned(): boolean {
  return quickMenuPinned;
}

export function setQuickMenuPinned(doc: Document, pinned: boolean): void {
  quickMenuPinned = pinned;
  if (pinned) setQuickMenuVisible(doc, true);
}

let quickMenuCloseTimer: number | null = null;

function cancelQuickMenuClose(): void {
  if (quickMenuCloseTimer === null) return;
  window.clearTimeout(quickMenuCloseTimer);
  quickMenuCloseTimer = null;
}

function scheduleQuickMenuClose(doc: Document): void {
  if (quickMenuPinned) return;
  cancelQuickMenuClose();
  quickMenuCloseTimer = window.setTimeout(() => {
    quickMenuCloseTimer = null;
    setQuickMenuVisible(doc, false);
  }, 250);
}

export function openQuickMenuOnHover(doc: Document): void {
  cancelQuickMenuClose();
  setQuickMenuVisible(doc, true);
}

export function scheduleCloseQuickMenuOnHover(doc: Document): void {
  scheduleQuickMenuClose(doc);
}
