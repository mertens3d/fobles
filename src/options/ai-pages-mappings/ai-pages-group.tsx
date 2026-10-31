// @source-path [fobles] src/options/ai-pages-mappings/ai-pages-group.tsx

import type { AiPagesFieldErrors, EditableAiPagesGroup } from "./ai-pages-mappings.types";
import { AiPagesMappingRow } from "./ai-pages-mapping-row";

export type AiPagesGroupProps = {
  group: EditableAiPagesGroup;
  errors: AiPagesFieldErrors;
  registerInput: (key: string, input: HTMLInputElement | null) => void;
  onFieldChange: (field: "name" | "organization" | "tenantName", value: string) => void;
  onClearError: (key: string) => void;
  onRemoveGroup: () => void;
  onAddMapping: () => void;
  onMappingChange: (mappingId: string, field: "contentRoot" | "site", value: string) => void;
  onRemoveMapping: (mappingId: string) => void;
};

export function AiPagesGroup({ group, errors, registerInput, onFieldChange, onClearError, onRemoveGroup, onAddMapping, onMappingChange, onRemoveMapping }: AiPagesGroupProps) {
  const nameKey = `${group.id}.name`;
  const organizationKey = `${group.id}.organization`;
  const tenantNameKey = `${group.id}.tenantName`;

  function handleFieldChange(field: "name" | "organization" | "tenantName", key: string, value: string): void {
    onFieldChange(field, value);
    onClearError(key);
  }

  return (
    <section className="group">
      <div className="group-details">
        <label>
          Group
          {errors[nameKey] && <span className="field-error">{errors[nameKey]}</span>}
          <input ref={(input) => registerInput(nameKey, input)} name="name" value={group.name} required aria-invalid={errors[nameKey] ? "true" : undefined} onChange={(event) => handleFieldChange("name", nameKey, event.target.value)} />
        </label>
        <label>
          Organization
          {errors[organizationKey] && <span className="field-error">{errors[organizationKey]}</span>}
          <input ref={(input) => registerInput(organizationKey, input)} name="organization" value={group.organization} required aria-invalid={errors[organizationKey] ? "true" : undefined} onChange={(event) => handleFieldChange("organization", organizationKey, event.target.value)} />
        </label>
        <label>
          Tenant name
          {errors[tenantNameKey] && <span className="field-error">{errors[tenantNameKey]}</span>}
          <input ref={(input) => registerInput(tenantNameKey, input)} name="tenantName" value={group.tenantName} required aria-invalid={errors[tenantNameKey] ? "true" : undefined} onChange={(event) => handleFieldChange("tenantName", tenantNameKey, event.target.value)} />
        </label>
        <button type="button" className="remove" onClick={onRemoveGroup}>Remove group</button>
      </div>
      <div className="group-mappings">
        {group.mappings.map((mapping) => (
          <AiPagesMappingRow
            key={mapping.id}
            keyPrefix={`${group.id}.${mapping.id}`}
            mapping={mapping}
            errors={errors}
            registerInput={registerInput}
            onChange={(field, value) => onMappingChange(mapping.id, field, value)}
            onClearError={onClearError}
            onRemove={() => onRemoveMapping(mapping.id)}
          />
        ))}
      </div>
      <div className="group-actions">
        <button type="button" onClick={onAddMapping}>Add site root</button>
      </div>
    </section>
  );
}
