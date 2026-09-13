import { QUICK_MENU_BUTTON_CATALOG, type QuickMenuButtonDescriptor } from "../features/quick-menu";
import {
  getQuickMenuButtonSettings,
  sanitizeQuickMenuPathSuffix,
  setQuickMenuButtonSettings,
  type QuickMenuButtonSettings,
} from "../features/quick-menu/button-settings";

const AI_PAGES_MAPPINGS_KEY = "aiPagesMappings";
const DEBUG_LOGGING_KEY = "debugLogging";
const SHOW_RELOAD_EXTENSION_BUTTON_KEY = "showReloadExtensionButton";
type AiPagesMapping = { contentRoot: string; site: string };
type AiPagesGroup = {
  name: string;
  organization: string;
  tenantName: string;
  mappings: AiPagesMapping[];
};

const getElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing options element: #${id}`);
  return element as T;
};

const requireInput = (scope: ParentNode, selector: string): HTMLInputElement => {
  const input = scope.querySelector<HTMLInputElement>(selector);
  if (!input) throw new Error(`Missing options input: ${selector}`);
  return input;
};

const groupsContainer = getElement<HTMLDivElement>("groups");
const statusMessage = getElement<HTMLParagraphElement>("status");
const debugLoggingInput = getElement<HTMLInputElement>("debug-logging");
const showReloadExtensionButtonInput = getElement<HTMLInputElement>(
  "show-reload-extension-button",
);
const debugStatus = getElement<HTMLParagraphElement>("debug-status");
const viewStoredSettingsButton = getElement<HTMLButtonElement>("view-stored-settings");
const storedSettingsOutput = getElement<HTMLPreElement>("stored-settings-output");
const quickMenuButtonsContainer = getElement<HTMLDivElement>("quick-menu-buttons");
const quickMenuButtonsStatus = getElement<HTMLParagraphElement>("quick-menu-buttons-status");

groupsContainer.addEventListener("input", () => {
  statusMessage.textContent = "";
  const input = document.activeElement;
  if (input instanceof HTMLInputElement) clearFieldError(input);
});

function clearFieldError(input: HTMLInputElement): void {
  input.removeAttribute("aria-invalid");
  input.closest("label")?.querySelector(".field-error")?.remove();
}

function showFieldError(input: HTMLInputElement, message: string): void {
  input.setAttribute("aria-invalid", "true");
  const field = input.closest("label");
  if (!field || field.querySelector(".field-error")) return;

  const error = document.createElement("span");
  error.className = "field-error";
  error.textContent = message;
  field.insertBefore(error, input);
}

function addField(
  row: HTMLElement,
  label: string,
  key: string,
  value: string | undefined,
): HTMLInputElement {
  const field = document.createElement("label");
  field.textContent = label;
  const input = document.createElement("input");
  input.name = key;
  input.value = value || "";
  input.required = true;
  field.appendChild(input);
  row.appendChild(field);
  return input;
}

function addMapping(
  mappingsContainer: HTMLElement,
  mapping: Partial<AiPagesMapping> = {},
): void {
  const row = document.createElement("div");
  row.className = "mapping";
  addField(
    row,
    "Site root (item path) e.g. /sitecore/content/{tenant}/{site root}",
    "contentRoot",
    mapping.contentRoot,
  );
  addField(row, "Site", "site", mapping.site);
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "remove";
  remove.textContent = "Remove";
  remove.addEventListener("click", () => row.remove());
  row.appendChild(remove);
  mappingsContainer.appendChild(row);
}

function readMappings(group: Element): AiPagesMapping[] {
  return Array.from(group.querySelectorAll(".mapping"))
    .map((row) => ({
      contentRoot: requireInput(row, "[name='contentRoot']")
        .value.trim()
        .replace(/\/+$/, ""),
      site: requireInput(row, "[name='site']").value.trim(),
    }))
    .filter((mapping) => mapping.contentRoot || mapping.site);
}

function addGroup(group: Partial<AiPagesGroup> = {}): void {
  const container = document.createElement("section");
  container.className = "group";
  const details = document.createElement("div");
  details.className = "group-details";
  addField(details, "Group", "name", group.name);
  addField(details, "Organization", "organization", group.organization);
  addField(details, "Tenant name", "tenantName", group.tenantName);
  const removeGroup = document.createElement("button");
  removeGroup.type = "button";
  removeGroup.className = "remove";
  removeGroup.textContent = "Remove group";
  removeGroup.addEventListener("click", () => container.remove());
  details.appendChild(removeGroup);

  const mappings = document.createElement("div");
  mappings.className = "group-mappings";
  if (group.mappings?.length) {
    group.mappings.forEach((mapping) => addMapping(mappings, mapping));
  } else {
    addMapping(mappings);
  }
  const actions = document.createElement("div");
  actions.className = "group-actions";
  const addSite = document.createElement("button");
  addSite.type = "button";
  addSite.textContent = "Add site root";
  addSite.addEventListener("click", () => addMapping(mappings));
  actions.appendChild(addSite);
  container.append(details, mappings, actions);
  groupsContainer.appendChild(container);
}

getElement<HTMLButtonElement>("add-group").addEventListener("click", () =>
  addGroup(),
);
getElement<HTMLButtonElement>("save-debug-settings").addEventListener("click", () => {
  void chrome.storage.sync
    .set({
      [DEBUG_LOGGING_KEY]: debugLoggingInput.checked,
      [SHOW_RELOAD_EXTENSION_BUTTON_KEY]:
        showReloadExtensionButtonInput.checked,
    })
    .then(() => {
      debugStatus.textContent = "Developer settings saved.";
    });
});
getElement<HTMLButtonElement>("save-mappings").addEventListener("click", () => {
  let firstInvalidInput: HTMLInputElement | null = null;
  let hasValidationErrors = false;
  groupsContainer.querySelectorAll("input").forEach((input) => {
    clearFieldError(input);
    if (input.value.trim()) return;

    hasValidationErrors = true;
    firstInvalidInput ||= input;
    showFieldError(input, "This value is required.");
  });

  if (hasValidationErrors) {
    statusMessage.textContent = "Complete the highlighted fields before saving.";
    const focusTarget = firstInvalidInput as HTMLInputElement | null;
    focusTarget?.focus();
    return;
  }

  const groups = Array.from(groupsContainer.querySelectorAll(".group")).map(
    (group) => ({
      name: requireInput(group, "[name='name']").value.trim(),
      organization: requireInput(group, "[name='organization']").value.trim(),
      tenantName: requireInput(group, "[name='tenantName']").value.trim(),
      mappings: readMappings(group),
    }),
  );
  void chrome.storage.sync.set({ [AI_PAGES_MAPPINGS_KEY]: groups }).then(() => {
    statusMessage.textContent = "Mappings saved.";
  });
});

void chrome.storage.sync.get([AI_PAGES_MAPPINGS_KEY]).then((result) => {
  const mappings = Array.isArray(result[AI_PAGES_MAPPINGS_KEY])
    ? result[AI_PAGES_MAPPINGS_KEY]
    : [];
  mappings.forEach((group) => addGroup(group));
});

void chrome.storage.sync
  .get([DEBUG_LOGGING_KEY, SHOW_RELOAD_EXTENSION_BUTTON_KEY])
  .then((result) => {
    debugLoggingInput.checked = result[DEBUG_LOGGING_KEY] === true;
    showReloadExtensionButtonInput.checked =
      result[SHOW_RELOAD_EXTENSION_BUTTON_KEY] === true;
  });

viewStoredSettingsButton.addEventListener("click", () => {
  void Promise.all([
    chrome.storage.sync.get(null),
    chrome.storage.local.get(null),
  ]).then(([sync, local]) => {
    storedSettingsOutput.textContent = JSON.stringify({ sync, local }, null, 2);
    storedSettingsOutput.hidden = false;
  });
});

function createQuickMenuButtonRow(
  descriptor: QuickMenuButtonDescriptor,
  settings: QuickMenuButtonSettings,
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
  enabledInput.checked = settings[descriptor.id]?.enabled !== false;
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
    suffixInput.value = settings[descriptor.id]?.pathSuffix ?? "";
    suffixInput.addEventListener("blur", () => {
      suffixInput.value = sanitizeQuickMenuPathSuffix(suffixInput.value);
    });
    row.appendChild(suffixInput);
  }

  return row;
}

function renderQuickMenuButtons(settings: QuickMenuButtonSettings): void {
  quickMenuButtonsContainer.textContent = "";

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
      columnSection.appendChild(createQuickMenuButtonRow(descriptor, settings)),
    );
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

getElement<HTMLButtonElement>("save-quick-menu-buttons").addEventListener("click", () => {
  const settings: QuickMenuButtonSettings = {};
  QUICK_MENU_BUTTON_CATALOG.forEach((descriptor) => {
    const enabledInput = quickMenuButtonsContainer.querySelector<HTMLInputElement>(
      `input[name='enabled'][data-button-id='${descriptor.id}']`,
    );
    const suffixInput = quickMenuButtonsContainer.querySelector<HTMLInputElement>(
      `input[name='pathSuffix'][data-button-id='${descriptor.id}']`,
    );
    const pathSuffix = suffixInput ? sanitizeQuickMenuPathSuffix(suffixInput.value) : "";
    if (suffixInput) suffixInput.value = pathSuffix;

    settings[descriptor.id] = {
      label: descriptor.label,
      enabled: enabledInput?.checked !== false,
      pathSuffix,
    };
  });

  void setQuickMenuButtonSettings(settings).then(() => {
    quickMenuButtonsStatus.textContent = "Quick menu buttons saved.";
  });
});

void getQuickMenuButtonSettings().then((settings) => {
  renderQuickMenuButtons(settings);
});

