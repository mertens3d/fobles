// @source-path [fobles] src/options/jump-flyout-buttons/jump-flyout-button-row.tsx

import type { JumpFlyoutButtonDescriptor } from "../../shared/jump-flyout/button-catalog";

export type JumpFlyoutButtonRowProps = {
  descriptor: JumpFlyoutButtonDescriptor;
  enabled: boolean;
  pathSuffix: string;
  onToggle: (enabled: boolean) => void;
  onPathSuffixChange: (value: string) => void;
  onPathSuffixBlur: () => void;
};

export function JumpFlyoutButtonRow({
  descriptor,
  enabled,
  pathSuffix,
  onToggle,
  onPathSuffixChange,
  onPathSuffixBlur,
}: JumpFlyoutButtonRowProps) {
  if (!descriptor.supportsPathSuffix) {
    return (
      <div className="jump-flyout-button-row jump-flyout-button-row--no-suffix">
        <input
          type="checkbox"
          name="enabled"
          data-button-id={descriptor.id}
          checked={enabled}
          onChange={(event) => onToggle(event.target.checked)}
        />
        <span className="jump-flyout-button-label">{descriptor.label}</span>
      </div>
    );
  }
  return (
    <div className="jump-flyout-entry">
      <div className="jump-flyout-entry-title">{descriptor.label}</div>
      <div className="jump-flyout-entry-fields">
        <input
          type="checkbox"
          name="enabled"
          data-button-id={descriptor.id}
          checked={enabled}
          onChange={(event) => onToggle(event.target.checked)}
        />
        <span className="jump-flyout-entry-prefix">{descriptor.basePath ?? ""}</span>
        <input
          type="text"
          name="pathSuffix"
          data-button-id={descriptor.id}
          placeholder="optional sub-path"
          value={pathSuffix}
          onChange={(event) => onPathSuffixChange(event.target.value)}
          onBlur={onPathSuffixBlur}
        />
      </div>
    </div>
  );
}
