// @source-path [fobles] src/options/ai-pages-mappings/ai-pages-mappings-section.tsx

import { useEffect, useRef, useState } from "react";
import { getAiPagesMappings, setAiPagesMappings } from "../../shared/ai-pages-mappings";
import { type AiPagesGroup } from "../../shared/AiPagesMapping.types";
import type { AiPagesFieldErrors, EditableAiPagesGroup, EditableAiPagesMapping } from "./ai-pages-mappings.types";
import { AiPagesGroup as AiPagesGroupRow } from "./ai-pages-group";

const REQUIRED_FIELD_MESSAGE = "This value is required.";

function createEmptyMapping(): EditableAiPagesMapping {
  return { id: crypto.randomUUID(), contentRoot: "", site: "" };
}

function createEmptyGroup(): EditableAiPagesGroup {
  return { id: crypto.randomUUID(), name: "", organization: "", tenantName: "", mappings: [createEmptyMapping()] };
}

function toEditableGroup(group: AiPagesGroup): EditableAiPagesGroup {
  return {
    id: crypto.randomUUID(),
    name: group.name,
    organization: group.organization,
    tenantName: group.tenantName,
    mappings:
      group.mappings.length > 0
        ? group.mappings.map((mapping) => ({ id: crypto.randomUUID(), ...mapping }))
        : [createEmptyMapping()],
  };
}

export function AiPagesMappingsSection() {
  const [groups, setGroups] = useState<EditableAiPagesGroup[]>([]);
  const [errors, setErrors] = useState<AiPagesFieldErrors>({});
  const [status, setStatus] = useState("");
  const inputsByKey = useRef(new Map<string, HTMLInputElement>());

  useEffect(() => {
    void getAiPagesMappings().then((loaded) => setGroups(loaded.map(toEditableGroup)));
  }, []);

  function registerInput(key: string, input: HTMLInputElement | null): void {
    if (input) {
      inputsByKey.current.set(key, input);
    } else {
      inputsByKey.current.delete(key);
    }
  }

  function clearError(key: string): void {
    setStatus("");
    setErrors((current) => {
      if (!(key in current)) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function addGroup(): void {
    setGroups((current) => [...current, createEmptyGroup()]);
  }

  function removeGroup(groupId: string): void {
    setGroups((current) => current.filter((group) => group.id !== groupId));
  }

  function updateGroupField(groupId: string, field: "name" | "organization" | "tenantName", value: string): void {
    setGroups((current) => current.map((group) => (group.id === groupId ? { ...group, [field]: value } : group)));
  }

  function addMapping(groupId: string): void {
    setGroups((current) =>
      current.map((group) =>
        group.id === groupId ? { ...group, mappings: [...group.mappings, createEmptyMapping()] } : group,
      ),
    );
  }

  function removeMapping(groupId: string, mappingId: string): void {
    setGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? { ...group, mappings: group.mappings.filter((mapping) => mapping.id !== mappingId) }
          : group,
      ),
    );
  }

  function updateMappingField(groupId: string, mappingId: string, field: "contentRoot" | "site", value: string): void {
    setGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
              ...group,
              mappings: group.mappings.map((mapping) =>
                mapping.id === mappingId ? { ...mapping, [field]: value } : mapping,
              ),
            }
          : group,
      ),
    );
  }

  async function handleSave(): Promise<void> {
    const nextErrors: AiPagesFieldErrors = {};
    let firstInvalidKey: string | undefined;
    function checkRequired(key: string, value: string): void {
      if (value.trim()) {
        return;
      }
      nextErrors[key] = REQUIRED_FIELD_MESSAGE;
      firstInvalidKey ||= key;
    }
    groups.forEach((group) => {
      checkRequired(`${group.id}.name`, group.name);
      checkRequired(`${group.id}.organization`, group.organization);
      checkRequired(`${group.id}.tenantName`, group.tenantName);
      group.mappings.forEach((mapping) => {
        checkRequired(`${group.id}.${mapping.id}.contentRoot`, mapping.contentRoot);
        checkRequired(`${group.id}.${mapping.id}.site`, mapping.site);
      });
    });
    setErrors(nextErrors);
    if (firstInvalidKey) {
      setStatus("Complete the highlighted fields before saving.");
      inputsByKey.current.get(firstInvalidKey)?.focus();
      return;
    }

    const payload: AiPagesGroup[] = groups.map((group) => ({
      name: group.name.trim(),
      organization: group.organization.trim(),
      tenantName: group.tenantName.trim(),
      mappings: group.mappings
        .map((mapping) => ({ contentRoot: mapping.contentRoot.trim().replace(/\/+$/, ""), site: mapping.site.trim() }))
        .filter((mapping) => mapping.contentRoot || mapping.site),
    }));
    await setAiPagesMappings(payload);
    setStatus("Mappings saved.");
  }

  return (
    <details className="settings-section">
      <summary>Additional Settings</summary>
      <p>
        Add one group per Sitecore account, then map that group's content roots to AI Pages sites. The most specific
        matching root is used.
      </p>
      <details>
        <summary>SitecoreAI settings example</summary>
        <p>
          <code>
            Client: MyCloud | Organization: org_Ab12Cd34Ef56 | Tenant name: tenant_Ab12Cd34Ef56 | Root:
            /sitecore/content/ExampleTenant/example-site-123 | Site: example-site-123
          </code>
        </p>
      </details>
      <div id="groups">
        {groups.map((group) => (
          <AiPagesGroupRow
            key={group.id}
            group={group}
            errors={errors}
            registerInput={registerInput}
            onFieldChange={(field, value) => updateGroupField(group.id, field, value)}
            onClearError={clearError}
            onRemoveGroup={() => removeGroup(group.id)}
            onAddMapping={() => addMapping(group.id)}
            onMappingChange={(mappingId, field, value) => updateMappingField(group.id, mappingId, field, value)}
            onRemoveMapping={(mappingId) => removeMapping(group.id, mappingId)}
          />
        ))}
      </div>
      <button id="add-group" type="button" onClick={addGroup}>
        Add group
      </button>
      <button id="save-mappings" type="button" onClick={() => void handleSave()}>
        Save mappings
      </button>
      <p id="status" role="status">
        {status}
      </p>
    </details>
  );
}
