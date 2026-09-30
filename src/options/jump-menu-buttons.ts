import {
  JUMP_MENU_BUTTON_CATALOG,
  type JumpMenuButtonDescriptor,
} from "../shared/jump-menu/button-catalog";
import {
  getJumpMenuButtonSettings,
  sanitizeJumpMenuPathSuffix,
  setJumpMenuButtonSettings,
  type JumpMenuButtonSettings,
} from "../shared/jump-menu/button-settings";
import {
  getUserTreeJumps,
  setUserTreeJumps,
  type UserTreeJump,
} from "../shared/jump-menu/user-tree-jump-settings";
import {
  getUserAdminPages,
  setUserAdminPages,
  type UserAdminPage,
} from "../shared/jump-menu/user-admin-page-settings";
import { TEXT } from "../content/constants";
import { collectUserTreeJumpEntries, renderUserTreeJumpEditor } from "./user-tree-jump-editor";
import { collectUserAdminPageEntries, renderUserAdminPageEditor } from "./user-admin-page-editor";
import { getElement } from "./dom-helpers";

const quickMenuButtonsContainer = getElement<HTMLDivElement>("jump-menu-buttons");
const quickMenuButtonsStatus = getElement<HTMLParagraphElement>("jump-menu-buttons-status");
// Set while rendering the Tree Jumps/Admin Pages columns, so the Save handler below can read the
// User Tree Jump/User Admin Page rows back out of them - no other column needs that on save.
let treeJumpsColumnSection: HTMLElement | null = null;
let adminPagesColumnSection: HTMLElement | null = null;

function createJumpMenuButtonRow(
  descriptor: JumpMenuButtonDescriptor,
  userSettings: JumpMenuButtonSettings,
): HTMLDivElement {
  const enabledInput = document.createElement("input");
  enabledInput.type = "checkbox";
  enabledInput.name = "enabled";
  enabledInput.dataset.buttonId = descriptor.id;
  enabledInput.checked = userSettings[descriptor.id]?.enabled !== false;

  // Tree Jump buttons get the title-row + fields-row layout shared with User Tree Jumps (see
  // user-tree-jump-editor.ts); every other button has neither a base path nor a suffix to show, so
  // it stays a single compact row.
  if (!descriptor.supportsPathSuffix) {
    const row = document.createElement("div");
    row.className = "jump-menu-button-row jump-menu-button-row--no-suffix";
    row.appendChild(enabledInput);

    const label = document.createElement("span");
    label.className = "jump-menu-button-label";
    label.textContent = descriptor.label;
    row.appendChild(label);
    return row;
  }

  const row = document.createElement("div");
  row.className = "jump-menu-entry";

  const titleRow = document.createElement("div");
  titleRow.className = "jump-menu-entry-title";
  titleRow.textContent = descriptor.label;
  row.appendChild(titleRow);

  const fieldsRow = document.createElement("div");
  fieldsRow.className = "jump-menu-entry-fields";
  fieldsRow.appendChild(enabledInput);

  const prefix = document.createElement("span");
  prefix.className = "jump-menu-entry-prefix";
  prefix.textContent = descriptor.basePath ?? "";
  fieldsRow.appendChild(prefix);

  const suffixInput = document.createElement("input");
  suffixInput.type = "text";
  suffixInput.name = "pathSuffix";
  suffixInput.dataset.buttonId = descriptor.id;
  suffixInput.placeholder = "optional sub-path";
  suffixInput.value = userSettings[descriptor.id]?.pathSuffix ?? "";
  suffixInput.addEventListener("blur", () => {
    suffixInput.value = sanitizeJumpMenuPathSuffix(suffixInput.value);
  });
  fieldsRow.appendChild(suffixInput);

  row.appendChild(fieldsRow);
  return row;
}

function renderJumpMenuButtons(
  userSettings: JumpMenuButtonSettings,
  userTreeJumps: readonly UserTreeJump[],
  userAdminPages: readonly UserAdminPage[],
): void {
  quickMenuButtonsContainer.textContent = "";
  treeJumpsColumnSection = null;
  adminPagesColumnSection = null;

  const columns = new Map<string, JumpMenuButtonDescriptor[]>();
  JUMP_MENU_BUTTON_CATALOG.forEach((descriptor) => {
    const column = columns.get(descriptor.column) ?? [];
    column.push(descriptor);
    columns.set(descriptor.column, column);
  });

  const columnDetailsElements: HTMLDetailsElement[] = [];

  columns.forEach((descriptors, columnTitle) => {
    const columnSection = document.createElement("details");
    columnSection.className = "jump-menu-column";
    // The "name" attribute is a native accordion hint in newer browsers; the toggle
    // listener below enforces single-open behavior everywhere else.
    columnSection.setAttribute("name", "jump-menu-column");

    const summary = document.createElement("summary");
    summary.textContent = columnTitle;
    columnSection.appendChild(summary);

    descriptors.forEach((descriptor) =>
      columnSection.appendChild(createJumpMenuButtonRow(descriptor, userSettings)),
    );
    if (columnTitle === TEXT.GROUP_NAME.TREE_JUMPS) {
      renderUserTreeJumpEditor(columnSection, userTreeJumps);
      treeJumpsColumnSection = columnSection;
    }
    if (columnTitle === TEXT.GROUP_NAME.ADMIN_PAGES) {
      renderUserAdminPageEditor(columnSection, userAdminPages);
      adminPagesColumnSection = columnSection;
    }
    quickMenuButtonsContainer.appendChild(columnSection);
    columnDetailsElements.push(columnSection);
  });

  columnDetailsElements.forEach((details) => {
    details.addEventListener("toggle", () => {
      if (!details.open) return;
      columnDetailsElements.forEach((other) => {
        if (other !== details) other.open = false;
      });
    });
  });
}

export function initJumpMenuButtons(): void {
  getElement<HTMLButtonElement>("save-jump-menu-buttons").addEventListener("click", () => {
    const userSettings: JumpMenuButtonSettings = {};
    JUMP_MENU_BUTTON_CATALOG.forEach((descriptor) => {
      const enabledInput = quickMenuButtonsContainer.querySelector<HTMLInputElement>(
        `input[name='enabled'][data-button-id='${descriptor.id}']`,
      );
      const suffixInput = quickMenuButtonsContainer.querySelector<HTMLInputElement>(
        `input[name='pathSuffix'][data-button-id='${descriptor.id}']`,
      );
      const pathSuffix = suffixInput ? sanitizeJumpMenuPathSuffix(suffixInput.value) : "";
      if (suffixInput) suffixInput.value = pathSuffix;

      userSettings[descriptor.id] = {
        label: descriptor.label,
        enabled: enabledInput?.checked !== false,
        pathSuffix,
      };
    });

    const userTreeJumps = treeJumpsColumnSection
      ? collectUserTreeJumpEntries(treeJumpsColumnSection)
      : [];
    const userAdminPages = adminPagesColumnSection
      ? collectUserAdminPageEntries(adminPagesColumnSection)
      : [];

    void Promise.all([
      setJumpMenuButtonSettings(userSettings),
      setUserTreeJumps(userTreeJumps),
      setUserAdminPages(userAdminPages),
    ]).then(() => {
      quickMenuButtonsStatus.textContent = "Quick menu buttons saved.";
    });
  });

  void Promise.all([
    getJumpMenuButtonSettings(),
    getUserTreeJumps(),
    getUserAdminPages(),
  ]).then(([userSettings, userTreeJumps, userAdminPages]) => {
    renderJumpMenuButtons(userSettings, userTreeJumps, userAdminPages);
  });
}
