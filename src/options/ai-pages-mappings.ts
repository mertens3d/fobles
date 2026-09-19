import { clearFieldError, getElement, requireInput, showFieldError } from "./dom-helpers";
import {
  getAiPagesMappings,
  setAiPagesMappings,
  type AiPagesGroup,
  type AiPagesMapping,
} from "../shared/ai-pages-mappings";

const groupsContainer = getElement<HTMLDivElement>("groups");
const statusMessage = getElement<HTMLParagraphElement>("status");

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

export function initAiPagesMappings(): void {
  groupsContainer.addEventListener("input", () => {
    statusMessage.textContent = "";
    const input = document.activeElement;
    if (input instanceof HTMLInputElement) clearFieldError(input);
  });

  getElement<HTMLButtonElement>("add-group").addEventListener("click", () =>
    addGroup(),
  );

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
    void setAiPagesMappings(groups).then(() => {
      statusMessage.textContent = "Mappings saved.";
    });
  });

  void getAiPagesMappings().then((groups) => {
    groups.forEach((group) => addGroup(group));
  });
}
