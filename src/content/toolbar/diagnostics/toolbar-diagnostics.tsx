// @source-path [fobles] src/content/toolbar/diagnostics/toolbar-diagnostics.tsx

import { useEffect, useState } from "react";
import { getStructuralSettings, watchStructuralSettings } from "../../../shared/structural/structural-settings";
import { pickRelevantWorkProgress } from "../../foundation/workers/progress/work-progress-snapshot";
import { useWorkProgressSnapshots } from "../../shared/ui/work-progress/use-work-progress";
import { WorkProgress } from "../../shared/ui/work-progress/work-progress";
import { TOOLBAR_DIAGNOSTICS } from "./toolbar-diagnostics.const";
import { observeToolbarDiagnostics } from "./toolbar-diagnostics-subscription";
import type { ToolbarDiagnosticsProps } from "./toolbar-diagnostics.types";
import type { ToolbarDiagnosticsServices, ToolbarDiagnosticsState } from "./toolbar-diagnostics.types";
import { WORKER_TASK_MANAGER_TOGGLE_EVENT } from "./diagnostics.const";

const services: ToolbarDiagnosticsServices = {
  getSettings: getStructuralSettings,
  watchSettings: watchStructuralSettings,
};

// Agent: Shows the most relevant active work session (foreground first, then most recent) and counts the rest.
// Agent: Mounted only while diagnostics are enabled, so the progress subscription lives only that long.
function ToolbarWorkProgress() {
  const { primary, others } = pickRelevantWorkProgress(useWorkProgressSnapshots());
  const title = primary
    ? `${primary.label}: ${primary.completed} / ${primary.max}. Click for Worker Monitor.`
    : `${TOOLBAR_DIAGNOSTICS.IDLE}. Click for Worker Monitor.`;
  return (
    <section className={TOOLBAR_DIAGNOSTICS.CLASS} aria-label={TOOLBAR_DIAGNOSTICS.LABEL}>
      <button type="button" className="fobles-toolbar-diagnostics-summary" title={title}
        onClick={() => window.dispatchEvent(new CustomEvent(WORKER_TASK_MANAGER_TOGGLE_EVENT))}>
        <WorkProgress snapshot={primary} others={others} idleLabel={TOOLBAR_DIAGNOSTICS.IDLE} />
      </button>
    </section>
  );
}

export function ToolbarDiagnostics({ services: dependencies = services }: ToolbarDiagnosticsProps) {
  const [state, setState] = useState<ToolbarDiagnosticsState>({ enabled: false });
  useEffect(() => observeToolbarDiagnostics(dependencies, setState), [dependencies]);
  return state.enabled ? <ToolbarWorkProgress /> : null;
}
