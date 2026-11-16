// @source-path [fobles] src/content/features/auditor/components/auditor-tree-cell/auditor-tree-cell.types.ts

import type { CSSProperties } from "react";
import type { AuditorTreeRow } from "../../auditor-grid/auditor-grid.types";

export type TreeIndentStyle = CSSProperties & { "--fobles-auditor-tree-depth": number };

export type AuditingDotsStyle = CSSProperties & {
  "--fobles-auditor-dots-cycle": string;
  "--fobles-auditor-dots-delay": string;
};

export type AuditorGroupBadgeProps = { row: AuditorTreeRow };
