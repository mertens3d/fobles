// @source-path [fobles] src/content/shared/ui/work-progress/work-progress.tsx

import { workProgressPercent } from "../../../foundation/workers/progress/work-progress-snapshot";
import type { WorkProgressSnapshot } from "../../../foundation/workers/progress/work-progress.types";
import { WORK_PROGRESS_TEXT } from "./work-progress.const";
import type { WorkProgressProps } from "./work-progress.types";

function taskText(snapshot: WorkProgressSnapshot): string {
  return snapshot.status === "active"
    ? snapshot.currentTask?.label ?? WORK_PROGRESS_TEXT.WAITING
    : WORK_PROGRESS_TEXT.IDLE;
}

// Agent: One progress display for every consumer. Row 1 is the session (bar, label, count); row 2 is the most recent
// Agent: frame task. A container query puts both on one line when the host is wide enough.
export function WorkProgress({ snapshot, idleLabel = WORK_PROGRESS_TEXT.IDLE, others = 0 }: WorkProgressProps) {
  const status = snapshot?.status ?? "idle";
  const label = snapshot?.label ?? idleLabel;
  const percent = snapshot ? workProgressPercent(snapshot) : 0;
  const count = snapshot ? `${snapshot.completed} / ${snapshot.max}` : "";
  return (
    <div className="fobles-work-progress" data-status={status} title={count ? `${label}: ${count}` : label}>
      <div className="fobles-work-progress-body">
        <div className="fobles-work-progress-session">
          <div className="fobles-work-progress-track" role="progressbar" aria-label={label} aria-valuemin={0}
            aria-valuemax={100} aria-valuenow={percent}>
            <div className="fobles-work-progress-value" style={{ width: `${percent}%` }} />
          </div>
          <span className="fobles-work-progress-label">{label}</span>
          {count ? <span className="fobles-work-progress-count">{count}</span> : null}
          {others > 0 ? <span className="fobles-work-progress-more">+{others} more</span> : null}
        </div>
        <div className="fobles-work-progress-task">{snapshot ? taskText(snapshot) : WORK_PROGRESS_TEXT.BLANK_TASK}</div>
      </div>
    </div>
  );
}
