// @source-path [fobles] src/content/features/auditor/components/auditor-tree-cell/auditor-auditing-dots.tsx

import { useState } from "react";
import { AUDITOR_GROUP_STATUS } from "../../auditor-grid/auditor-group-status.const";
import type { AuditingDotsStyle } from "./auditor-tree-cell.types";

// Agent: Pure CSS animation; the negative delay pins every instance to the page clock so all rows tick together,
// Agent: even rows that mount later (the grid remounts when the tree structure changes). No timers.
function createDotsStyle(): AuditingDotsStyle {
  return {
    "--fobles-auditor-dots-cycle": `${AUDITOR_GROUP_STATUS.AUDITING_DOTS_CYCLE_MS}ms`,
    "--fobles-auditor-dots-delay": `${-Math.round(performance.now() % AUDITOR_GROUP_STATUS.AUDITING_DOTS_CYCLE_MS)}ms`,
  };
}

export function AuditorAuditingDots() {
  const [style] = useState<AuditingDotsStyle>(createDotsStyle);

  return (
    <span className="fobles-auditor-tree-dots" aria-hidden="true" style={style}>
      <span>.</span>
      <span>.</span>
      <span>.</span>
    </span>
  );
}
