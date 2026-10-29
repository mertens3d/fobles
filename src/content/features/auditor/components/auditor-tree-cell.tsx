// @source-path [fobles] src/content/features/auditor/components/auditor-tree-cell.tsx

import type { CSSProperties, MouseEvent } from "react";
import type { AuditorTreeRow, LabelParts, ToggleModifiers } from "../auditor-grid/auditor-grid.types";

const COLLAPSED_GLYPH = "/sitecore/shell/themes/standard/images/treemenu_collapsed.png";
const EXPANDED_GLYPH = "/sitecore/shell/themes/standard/images/treemenu_expanded.png";

type AuditorTreeCellProps = {
  row: AuditorTreeRow;
  opened: boolean;
  onToggle: (row: AuditorTreeRow, modifiers?: ToggleModifiers) => void;
};

type TreeIndentStyle = CSSProperties & { "--fobles-auditor-tree-depth": number };

function splitQualifier(label: string): LabelParts {
  const match = /^(.*)\s+\(([^()]+)\)$/.exec(label);
  return match ? { name: match[1], qualifier: match[2] } : { name: label, qualifier: undefined };
}

export function AuditorTreeCell({ row, opened, onToggle }: AuditorTreeCellProps) {
  const { name, qualifier } = splitQualifier(row.label);
  const style: TreeIndentStyle = { "--fobles-auditor-tree-depth": row.depth };

  function handleToggle(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
    onToggle(row, event);
  }

  return (
    <div className={`fobles-auditor-tree-row fobles-auditor-tree-row--${row.kind}${row.isSitecoreItem ? " fobles-auditor-tree-row--item" : ""}`} style={style}>
      {row.hasChildren ? (
        <button type="button" className="fobles-auditor-tree-toggle" onClick={handleToggle}>
          <img src={opened ? EXPANDED_GLYPH : COLLAPSED_GLYPH} alt="" />
        </button>
      ) : (
        <span className="fobles-auditor-tree-spacer" />
      )}
      {row.icon ? <img className="fobles-auditor-tree-icon" src={row.icon} alt="" /> : null}
      <span className="fobles-auditor-tree-label">
        <span className="fobles-auditor-tree-label-name">{name}</span>
        {qualifier ? <span className="fobles-auditor-tree-label-qualifier">{qualifier}</span> : null}
      </span>
    </div>
  );
}
