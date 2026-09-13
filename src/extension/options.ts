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
