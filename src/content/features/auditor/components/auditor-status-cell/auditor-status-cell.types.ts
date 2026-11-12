import type { AuditorTreeRow } from "../../auditor-grid/auditor-grid.types";

export type StatusRow = AuditorTreeRow;

export type AuditorStatusCellContext = { onViewTestDetails?: (row: AuditorTreeRow) => void };
