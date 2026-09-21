import {
  QUICK_MENU_BUTTON_CATALOG,
  type QuickMenuButtonDescriptor,
} from "../shared/quick-menu/button-catalog";
import {
  getQuickMenuButtonSettings,
  sanitizeQuickMenuPathSuffix,
  setQuickMenuButtonSettings,
  type QuickMenuButtonSettings,
} from "../shared/quick-menu/button-settings";
import {
  getUserTreeJumps,
  setUserTreeJumps,
  type UserTreeJump,
} from "../shared/quick-menu/user-tree-jump-settings";
import { TEXT } from "../content/constants";
import { collectUserTreeJumpEntries, renderUserTreeJumpEditor } from "./user-tree-jump-editor";
import { getElement } from "./dom-helpers";

const quickMenuButtonsContainer = getElement<HTMLDivElement>("quick-menu-buttons");
const quickMenuButtonsStatus = getElement<HTMLParagraphElement>("quick-menu-buttons-status");
// Set while rendering the Tree Jumps column, so the Save handler below can read the User Tree
// Jump rows back out of it - there's no other column that needs that on save.
let treeJumpsColumnSection: HTMLElement | null = null;

function createQuickMenuButtonRow(
  descriptor: QuickMenuButtonDescriptor,
  userSettings: QuickMenuButtonSettings,
): HTMLDivElement {
  const row = document.createElement("div");
  row.className = "quick-menu-button-row";
  if (!descriptor.supportsPathSuffix) {
    row.classList.add("quick-menu-button-row--no-suffix");
  }

  const enabledInput = document.createElement("input");
  enabledInput.type = "checkbox";
  enabledInput.name = "enabled";
  enabledInput.dataset.buttonId = descriptor.id;
  enabledInput.checked = userSettings[descriptor.id]?.enabled !== false;
  row.appendChild(enabledInput);

  const label = document.createElement("span");
  label.className = "quick-menu-button-label";
  label.textContent = descriptor.label;
  if (descriptor.basePath) {
    label.title = descriptor.basePath;
  }
  row.appendChild(label);

  if (descriptor.supportsPathSuffix) {
    const suffixInput = document.createElement("input");
    suffixInput.type = "text";
    suffixInput.name = "pathSuffix";
    suffixInput.dataset.buttonId = descriptor.id;
    suffixInput.placeholder = "optional sub-path";
    suffixInput.title = `Appended after ${descriptor.basePath}`;
    suffixInput.value = userSettings[descriptor.id]?.pathSuffix ?? "";
    suffixInput.addEventListener("blur", () => {
      suffixInput.value = sanitizeQuickMenuPathSuffix(suffixInput.value);
    });
    row.appendChild(suffixInput);
  }

  return row;
}

function renderQuickMenuButtons(
  userSettings: QuickMenuButtonSettings,
  userTreeJumps: readonly UserTreeJump[],
): void {
  quickMenuButtonsContainer.textContent = "";
  treeJumpsColumnSection = null;

  const columns = new Map<string, QuickMenuButtonDescriptor[]>();
  QUICK_MENU_BUTTON_CATALOG.forEach((descriptor) => {
    const column = columns.get(descriptor.column) ?? [];
    column.push(descriptor);
    columns.set(descriptor.column, column);
  });

  const columnDetailsElements: HTMLDetailsElement[] = [];

  columns.forEach((descriptors, columnTitle) => {
    const columnSection = document.createElement("details");
    columnSection.className = "quick-menu-column";
    // The "name" attribute is a native accordion hint in newer browsers; the toggle
    // listener below enforces single-open behavior everywhere else.
    columnSection.setAttribute("name", "quick-menu-column");

    const summary = document.createElement("summary");
    summary.textContent = columnTitle;
    columnSection.appendChild(summary);

    descriptors.forEach((descriptor) =>
      columnSection.appendChild(createQuickMenuButtonRow(descriptor, userSettings)),
    );
    if (columnTitle === TEXT.GROUP_NAME.TREE_JUMPS) {
      renderUserTreeJumpEditor(columnSection, userTreeJumps);
      treeJumpsColumnSection = columnSection;
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

export function initQuickMenuButtons(): void {
  getElement<HTMLButtonElement>("save-quick-menu-buttons").addEventListener("click", () => {
    const userSettings: QuickMenuButtonSettings = {};
    QUICK_MENU_BUTTON_CATALOG.forEach((descriptor) => {
      const enabledInput = quickMenuButtonsContainer.querySelector<HTMLInputElement>(
        `input[name='enabled'][data-button-id='${descriptor.id}']`,
      );
      const suffixInput = quickMenuButtonsContainer.querySelector<HTMLInputElement>(
        `input[name='pathSuffix'][data-button-id='${descriptor.id}']`,
      );
      const pathSuffix = suffixInput ? sanitizeQuickMenuPathSuffix(suffixInput.value) : "";
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

    void Promise.all([
      setQuickMenuButtonSettings(userSettings),
      setUserTreeJumps(userTreeJumps),
    ]).then(() => {
      quickMenuButtonsStatus.textContent = "Quick menu buttons saved.";
    });
  });

  void Promise.all([getQuickMenuButtonSettings(), getUserTreeJumps()]).then(
    ([userSettings, userTreeJumps]) => {
      renderQuickMenuButtons(userSettings, userTreeJumps);
    },
  );
}
