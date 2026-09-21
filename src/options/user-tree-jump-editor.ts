import {
  createUserTreeJumpId,
  normalizeUserTreeJumpIconPath,
  type UserTreeJump,
} from "../shared/quick-menu/user-tree-jump-settings";
import { sanitizeQuickMenuPathSuffix } from "../shared/quick-menu/button-settings";
import { USER_TREE_JUMP } from "../shared/quick-menu/user-tree-jump-constants";

function createEmptyUserTreeJump(): UserTreeJump {
  return { id: createUserTreeJumpId(), label: "", enabled: true, icon: "", pathSuffix: "" };
}

function createUserTreeJumpRow(entry: UserTreeJump): HTMLDivElement {
  const row = document.createElement("div");
  row.className = "user-tree-jump-row";
  row.dataset.userTreeJumpId = entry.id;

  const enabledInput = document.createElement("input");
  enabledInput.type = "checkbox";
  enabledInput.name = "enabled";
  enabledInput.checked = entry.enabled;
  row.appendChild(enabledInput);

  const labelInput = document.createElement("input");
  labelInput.type = "text";
  labelInput.name = "label";
  labelInput.placeholder = "Label";
  labelInput.value = entry.label;
  row.appendChild(labelInput);

  const rootLabel = document.createElement("span");
  rootLabel.className = "user-tree-jump-root";
  rootLabel.textContent = "/sitecore/";
  row.appendChild(rootLabel);

  const pathSuffixInput = document.createElement("input");
  pathSuffixInput.type = "text";
  pathSuffixInput.name = "pathSuffix";
  pathSuffixInput.placeholder = "e.g. content/Home";
  pathSuffixInput.value = entry.pathSuffix;
  pathSuffixInput.addEventListener("blur", () => {
    pathSuffixInput.value = sanitizeQuickMenuPathSuffix(pathSuffixInput.value);
  });
  row.appendChild(pathSuffixInput);

  const iconInput = document.createElement("input");
  iconInput.type = "text";
  iconInput.name = "icon";
  iconInput.placeholder = USER_TREE_JUMP.DEFAULT_ICON_PATH;
  iconInput.title = "A Sitecore icon path - normalized to the required format on save.";
  iconInput.value = entry.icon;
  iconInput.addEventListener("blur", () => {
    iconInput.value = normalizeUserTreeJumpIconPath(iconInput.value);
  });
  row.appendChild(iconInput);

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "user-tree-jump-remove";
  removeButton.textContent = "\u00d7";
  removeButton.title = "Remove this Tree Jump";
  removeButton.addEventListener("click", () => row.remove());
  row.appendChild(removeButton);

  return row;
}

export function renderUserTreeJumpEditor(
  container: HTMLElement,
  entries: readonly UserTreeJump[],
): void {
  const section = document.createElement("div");
  section.className = "user-tree-jump-section";

  const heading = document.createElement("div");
  heading.className = "user-tree-jump-heading";
  heading.textContent = "User Tree Jumps";
  section.appendChild(heading);

  const rowsContainer = document.createElement("div");
  rowsContainer.className = "user-tree-jump-rows";
  entries.forEach((entry) => rowsContainer.appendChild(createUserTreeJumpRow(entry)));
  section.appendChild(rowsContainer);

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "user-tree-jump-add";
  addButton.textContent = "+ Add User Tree Jump";

  const limitStatus = document.createElement("p");
  limitStatus.className = "user-tree-jump-limit-status";

  const updateAddButtonState = (): void => {
    const atLimit = rowsContainer.children.length >= USER_TREE_JUMP.MAX_ENTRIES;
    addButton.disabled = atLimit;
    limitStatus.textContent = atLimit
      ? `Maximum of ${USER_TREE_JUMP.MAX_ENTRIES} User Tree Jumps reached.`
      : "";
  };

  addButton.addEventListener("click", () => {
    rowsContainer.appendChild(createUserTreeJumpRow(createEmptyUserTreeJump()));
    updateAddButtonState();
  });
  // Remove buttons are created per-row above; one delegated listener here just keeps the Add
  // button's disabled/limit-message state in sync after any row is removed.
  rowsContainer.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).closest(".user-tree-jump-remove")) updateAddButtonState();
  });

  updateAddButtonState();
  section.appendChild(addButton);
  section.appendChild(limitStatus);
  container.appendChild(section);
}

export function collectUserTreeJumpEntries(container: HTMLElement): UserTreeJump[] {
  const rows = container.querySelectorAll<HTMLDivElement>(".user-tree-jump-row");
  const entries: UserTreeJump[] = [];

  rows.forEach((row) => {
    const label = row.querySelector<HTMLInputElement>("input[name='label']")?.value.trim() ?? "";
    if (!label) return; // Blank rows (never filled in, or emptied out) are simply dropped on save.

    const enabled = row.querySelector<HTMLInputElement>("input[name='enabled']")?.checked ?? true;
    const pathSuffixInput = row.querySelector<HTMLInputElement>("input[name='pathSuffix']");
    const iconInput = row.querySelector<HTMLInputElement>("input[name='icon']");
    const pathSuffix = sanitizeQuickMenuPathSuffix(pathSuffixInput?.value ?? "");
    const icon = normalizeUserTreeJumpIconPath(iconInput?.value ?? "");
    if (pathSuffixInput) pathSuffixInput.value = pathSuffix;
    if (iconInput) iconInput.value = icon;

    entries.push({
      id: row.dataset.userTreeJumpId ?? createUserTreeJumpId(),
      label,
      enabled,
      icon,
      pathSuffix,
    });
  });

  return entries.slice(0, USER_TREE_JUMP.MAX_ENTRIES);
}
