import {
  createUserAdminPageId,
  normalizeUserAdminPageIconPath,
  normalizeUserAdminPageUrl,
  type UserAdminPage,
} from "../shared/quick-menu/user-admin-page-settings";
import { USER_ADMIN_PAGE } from "../shared/quick-menu/user-admin-page-constants";

function createEmptyUserAdminPage(): UserAdminPage {
  return { id: createUserAdminPageId(), label: "", enabled: true, icon: "", url: "" };
}

// Mirrors the User Tree Jump row layout (see user-tree-jump-editor.ts): a title row, then a
// fields row of checkbox | url | icon - a plain url input instead of a hardcoded prefix + suffix,
// since an admin page's url is already relative to the current domain root.
function createUserAdminPageRow(entry: UserAdminPage): HTMLDivElement {
  const row = document.createElement("div");
  row.className = "quick-menu-entry user-admin-page-row";
  row.dataset.userAdminPageId = entry.id;

  const titleRow = document.createElement("div");
  titleRow.className = "quick-menu-entry-title";

  const labelInput = document.createElement("input");
  labelInput.type = "text";
  labelInput.name = "label";
  labelInput.placeholder = `e.g. ${USER_ADMIN_PAGE.EXAMPLE_LABEL}`;
  labelInput.value = entry.label;
  titleRow.appendChild(labelInput);

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "user-admin-page-remove";
  removeButton.textContent = "\u00d7";
  removeButton.title = "Remove this Admin Page";
  removeButton.addEventListener("click", () => row.remove());
  titleRow.appendChild(removeButton);

  row.appendChild(titleRow);

  const fieldsRow = document.createElement("div");
  fieldsRow.className = "quick-menu-entry-fields";

  const enabledInput = document.createElement("input");
  enabledInput.type = "checkbox";
  enabledInput.name = "enabled";
  enabledInput.checked = entry.enabled;
  fieldsRow.appendChild(enabledInput);

  const urlInput = document.createElement("input");
  urlInput.type = "text";
  urlInput.name = "url";
  urlInput.placeholder = `e.g. ${USER_ADMIN_PAGE.EXAMPLE_URL}`;
  urlInput.value = entry.url;
  urlInput.addEventListener("blur", () => {
    urlInput.value = normalizeUserAdminPageUrl(urlInput.value);
  });
  fieldsRow.appendChild(urlInput);

  const iconInput = document.createElement("input");
  iconInput.type = "text";
  iconInput.name = "icon";
  iconInput.placeholder = USER_ADMIN_PAGE.DEFAULT_ICON_PATH;
  iconInput.title = "A Sitecore icon path - normalized to the required format on save.";
  iconInput.value = entry.icon;
  iconInput.addEventListener("blur", () => {
    iconInput.value = normalizeUserAdminPageIconPath(iconInput.value);
  });
  fieldsRow.appendChild(iconInput);

  row.appendChild(fieldsRow);
  return row;
}

export function renderUserAdminPageEditor(
  container: HTMLElement,
  entries: readonly UserAdminPage[],
): void {
  const section = document.createElement("div");
  section.className = "user-admin-page-section";

  const heading = document.createElement("div");
  heading.className = "user-admin-page-heading";
  heading.textContent = "User Admin Pages";
  section.appendChild(heading);

  const rowsContainer = document.createElement("div");
  rowsContainer.className = "user-admin-page-rows";
  entries.forEach((entry) => rowsContainer.appendChild(createUserAdminPageRow(entry)));
  section.appendChild(rowsContainer);

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "user-admin-page-add";
  addButton.textContent = "+ Add User Admin Page";

  const limitStatus = document.createElement("p");
  limitStatus.className = "user-admin-page-limit-status";

  const updateAddButtonState = (): void => {
    const atLimit = rowsContainer.children.length >= USER_ADMIN_PAGE.MAX_ENTRIES;
    addButton.disabled = atLimit;
    limitStatus.textContent = atLimit
      ? `Maximum of ${USER_ADMIN_PAGE.MAX_ENTRIES} User Admin Pages reached.`
      : "";
  };

  addButton.addEventListener("click", () => {
    rowsContainer.appendChild(createUserAdminPageRow(createEmptyUserAdminPage()));
    updateAddButtonState();
  });
  // Remove buttons are created per-row above; one delegated listener here just keeps the Add
  // button's disabled/limit-message state in sync after any row is removed.
  rowsContainer.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).closest(".user-admin-page-remove")) updateAddButtonState();
  });

  updateAddButtonState();
  section.appendChild(addButton);
  section.appendChild(limitStatus);
  container.appendChild(section);
}

export function collectUserAdminPageEntries(container: HTMLElement): UserAdminPage[] {
  const rows = container.querySelectorAll<HTMLDivElement>(".user-admin-page-row");
  const entries: UserAdminPage[] = [];

  rows.forEach((row) => {
    const label = row.querySelector<HTMLInputElement>("input[name='label']")?.value.trim() ?? "";
    if (!label) return; // Blank rows (never filled in, or emptied out) are simply dropped on save.

    const enabled = row.querySelector<HTMLInputElement>("input[name='enabled']")?.checked ?? true;
    const urlInput = row.querySelector<HTMLInputElement>("input[name='url']");
    const iconInput = row.querySelector<HTMLInputElement>("input[name='icon']");
    const url = normalizeUserAdminPageUrl(urlInput?.value ?? "");
    const icon = normalizeUserAdminPageIconPath(iconInput?.value ?? "");
    if (urlInput) urlInput.value = url;
    if (iconInput) iconInput.value = icon;

    entries.push({
      id: row.dataset.userAdminPageId ?? createUserAdminPageId(),
      label,
      enabled,
      icon,
      url,
    });
  });

  return entries.slice(0, USER_ADMIN_PAGE.MAX_ENTRIES);
}
