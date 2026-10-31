// @source-path [fobles] src/options/ai-pages-mappings/ai-pages-mapping-row.tsx

import type { AiPagesFieldErrors, EditableAiPagesMapping } from "./ai-pages-mappings.types";

export type AiPagesMappingRowProps = {
  mapping: EditableAiPagesMapping;
  keyPrefix: string;
  errors: AiPagesFieldErrors;
  registerInput: (key: string, input: HTMLInputElement | null) => void;
  onChange: (field: "contentRoot" | "site", value: string) => void;
  onClearError: (key: string) => void;
  onRemove: () => void;
};

export function AiPagesMappingRow({ mapping, keyPrefix, errors, registerInput, onChange, onClearError, onRemove }: AiPagesMappingRowProps) {
  const contentRootKey = `${keyPrefix}.contentRoot`;
  const siteKey = `${keyPrefix}.site`;

  function handleChange(field: "contentRoot" | "site", key: string, value: string): void {
    onChange(field, value);
    onClearError(key);
  }

  return (
    <div className="mapping">
      <label>
        Site root (item path) e.g. /sitecore/content/{"{tenant}"}/{"{site root}"}
        {errors[contentRootKey] && <span className="field-error">{errors[contentRootKey]}</span>}
        <input ref={(input) => registerInput(contentRootKey, input)} name="contentRoot" value={mapping.contentRoot} required aria-invalid={errors[contentRootKey] ? "true" : undefined} onChange={(event) => handleChange("contentRoot", contentRootKey, event.target.value)} />
      </label>
      <label>
        Site
        {errors[siteKey] && <span className="field-error">{errors[siteKey]}</span>}
        <input ref={(input) => registerInput(siteKey, input)} name="site" value={mapping.site} required aria-invalid={errors[siteKey] ? "true" : undefined} onChange={(event) => handleChange("site", siteKey, event.target.value)} />
      </label>
      <button type="button" className="remove" onClick={onRemove}>Remove</button>
    </div>
  );
}
