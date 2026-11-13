// @source-path [fobles] src/content/features/auditor/components/auditor-tree-cell/auditor-tree-cell.tsx

import type { TreeIndentStyle } from "./auditor-tree-cell.types.js";
import type { MouseEvent } from "react";
import { CONST } from "../../../../../constants/const";
import type { AuditorTreeRow, LabelParts, ToggleModifiers } from "../../auditor-grid/auditor-grid.types";

const STRUCTURAL_ICON_BY_LABEL: Readonly<Record<string, string>> = {
  layouts: CONST.SITECORE.ICONS.OFFICE.LAYOUT_DETAILS_24,
  renderings: CONST.SITECORE.ICONS.OFFICE.LAYOUT_DETAILS_24,
  "final renderings": CONST.SITECORE.ICONS.OFFICE.LAYOUT_DETAILS_24,
  "rendering parameters": CONST.SITECORE.ICONS.OFFICE.LAYOUT_DETAILS_24,
};
const STRUCTURAL_ICON_BY_QUALIFIER: Readonly<Record<string, string>> = {
  placeholder: CONST.SITECORE.ICONS.IMAGING.MASK_SQUARE_D_32,
  datasource: CONST.SITECORE.ICONS.APPLICATIONS.BULLET_BALL_GLASS_YELLOW_32,
  parameter: CONST.SITECORE.ICONS.APPLICATIONS.BULLET_BALL_GLASS_YELLOW_32,
};

type AuditorTreeCellProps = {
  row: AuditorTreeRow;
  opened: boolean;
  onToggle: (row: AuditorTreeRow, modifiers?: ToggleModifiers) => void;
};

function splitQualifier(label: string): LabelParts {
  const match = /^(.*)\s+\(([^()]+)\)$/.exec(label);
  return match ? { name: match[1], qualifier: match[2] } : { name: label, qualifier: undefined };
}

function resolveFallbackIcon(name: string, qualifier: string | undefined): string | undefined {
  return (
    STRUCTURAL_ICON_BY_LABEL[name.toLowerCase()] ??
    (qualifier ? STRUCTURAL_ICON_BY_QUALIFIER[qualifier.toLowerCase()] : undefined)
  );
}

export function AuditorTreeCell({ row, opened, onToggle }: AuditorTreeCellProps) {
  const { name, qualifier } = splitQualifier(row.label);
  const style: TreeIndentStyle = { "--fobles-auditor-tree-depth": row.depth };
  const icon = row.icon ?? resolveFallbackIcon(name, qualifier);

  function handleToggle(event: MouseEvent): void {
    event.stopPropagation();
    onToggle(row, event);
  }

  return (
    <div className={`fobles-auditor-tree-row fobles-auditor-tree-row--${row.kind}`} style={style}>
      {row.hasChildren ? (
        <button
          type="button"
          className="fobles-auditor-tree-toggle"
          onClick={handleToggle}
          aria-label={opened ? "Collapse row" : "Expand row"}
        >
          <img alt="" src={opened ? CONST.SITECORE.ICONS.TREE.EXPANDED : CONST.SITECORE.ICONS.TREE.COLLAPSED} />
        </button>
      ) : (
        <span className="fobles-auditor-tree-spacer" />
      )}
      {icon ? <img className="fobles-auditor-tree-icon" src={icon} alt="" /> : null}
      <span className="fobles-auditor-tree-label">
        <span className="fobles-auditor-tree-label-name">{name}</span>
        {qualifier ? <span className="fobles-auditor-tree-label-qualifier">{qualifier}</span> : null}
      </span>
    </div>
  );
}
