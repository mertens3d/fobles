// @source-path [fobles] src/content/shared/ui/reference-controls/work-progress-footer.tsx

import { useWorkProgress } from "../work-progress/use-work-progress";
import { WorkProgress } from "../work-progress/work-progress";
import type { WorkProgressFooterProps } from "./reference-controls.types";

export function WorkProgressFooter({ workSessionId }: WorkProgressFooterProps) {
  const snapshot = useWorkProgress(workSessionId);
  return (
    <div className="fobles-reference-graph-toolbar-footer">
      <WorkProgress snapshot={snapshot} />
    </div>
  );
}
