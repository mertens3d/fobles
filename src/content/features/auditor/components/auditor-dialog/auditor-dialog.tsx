// @source-path [fobles] src/content/features/auditor/components/auditor-dialog/auditor-dialog.tsx
import type { AuditFindingStore } from "../../audit-finding-store";
import { AuditorApp } from "../auditor-app/auditor-app";

export type AuditorViewProps = { doc: Document; findingStore: AuditFindingStore; workOperationId: string };

export function createAuditorView({ doc, findingStore, workOperationId }: AuditorViewProps) {
  return <AuditorApp doc={doc} findingStore={findingStore} workOperationId={workOperationId} />;
}
