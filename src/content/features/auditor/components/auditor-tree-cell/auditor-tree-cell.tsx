// @source-path [fobles] src/content/features/auditor/components/auditor-tree-cell/auditor-tree-cell.tsx
import type { CSSProperties, MouseEvent } from "react";
import type { AuditorTreeRow, LabelParts, ToggleModifiers } from "../../auditor-grid/auditor-grid.types";

const COLLAPSED_GLYPH = "/sitecore/shell/themes/standard/images/treemenu_collapsed.png";
const EXPANDED_GLYPH = "/sitecore/shell/themes/standard/images/treemenu_expanded.png";
const LAYOUT_ICON = "/~/icon/office/24x24/layout_details.png";
const PLACEHOLDER_ICON = "/~/icon/imaging/32x32/mask_square_d.png";
const MISSING_REFERENCE_ICON = "/~/icon/applications/32x32/bullet_ball_glass_yellow.png";

const STRUCTURAL_ICON_BY_LABEL: Readonly<Record<string, string>> = {
  layouts: LAYOUT_ICON,
  renderings: LAYOUT_ICON,
  "final renderings": LAYOUT_ICON,
  "rendering parameters": LAYOUT_ICON,
};

const STRUCTURAL_ICON_BY_QUALIFIER: Readonly<Record<string, string>> = {
  placeholder: PLACEHOLDER_ICON,
  datasource: MISSING_REFERENCE_ICON,
  parameter: MISSING_REFERENCE_ICON,
};

type AuditorTreeCellProps = { row: AuditorTreeRow; opened: boolean; onToggle: (row: AuditorTreeRow, modifiers?: ToggleModifiers) => void; };
type TreeIndentStyle = CSSProperties & { "--fobles-auditor-tree-depth": number };

function splitQualifier(label: string): LabelParts {
  const match = /^(.*)\s+\(([^()]+)\)$/.exec(label);
  return match ? { name: match[1], qualifier: match[2] } : { name: label, qualifier: undefined };
}

function resolveFallbackIcon(name: string, qualifier: string | undefined): string | undefined {
  return STRUCTURAL_ICON_BY_LABEL[name.toLowerCase()] ?? (qualifier ? STRUCTURAL_ICON_BY_QUALIFIER[qualifier.toLowerCase()] : undefined);
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
        <button type="button" className="fobles-auditor-tree-toggle" onClick={handleToggle} aria-label={opened ? "Collapse row" : "Expand row"}>
          <img alt="" src={opened ? EXPANDED_GLYPH : COLLAPSED_GLYPH} />
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
