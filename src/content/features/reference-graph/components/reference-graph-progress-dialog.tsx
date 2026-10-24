import type { ActivityEvent } from "../../../shared/activity/activity-events";

type ReferenceGraphProgressDialogProps = {
  activities: readonly ActivityEvent[];
  onCancel: () => void;
};

const TERMINAL_STATES = new Set<ActivityEvent["state"]>(["completed", "error", "cancelled"]);

function stateIcon(state: ActivityEvent["state"]): string {
  if (state === "completed") return "✓";
  if (state === "error") return "!";
  if (state === "cancelled") return "×";
  return state === "started" ? "●" : "○";
}

function taskPosition(activities: readonly ActivityEvent[], activityId: string): number {
  return activities.findIndex((activity) => activity.activityId === activityId) + 1;
}

export function ReferenceGraphProgressDialog({ activities, onCancel }: ReferenceGraphProgressDialogProps) {
  const total = activities.length;
  const settled = activities.filter((activity) => TERMINAL_STATES.has(activity.state)).length;
  const progress = total === 0 ? 0 : Math.round((settled / total) * 100);
  const active = [...activities].reverse().find((activity) => activity.state === "started" || activity.state === "queued");
  const recent = activities.slice(-6).reverse();
  const activePosition = active ? taskPosition(activities, active.activityId) : 0;

  return (
    <div className="fobles-reference-graph-progress-panel">
      <div className="fobles-reference-graph-progress-header">
        <div>
          <strong>Building Reference Graph</strong>
          <div className="fobles-reference-graph-progress-summary">
            {settled} of {total} tasks complete
          </div>
        </div>
        <div className="fobles-reference-graph-progress-pulse" aria-hidden="true" />
      </div>

      <div className="fobles-reference-graph-progress-overall" aria-label={`${settled} of ${total} tasks complete`}>
        <div className="fobles-reference-graph-progress-track">
          <div className="fobles-reference-graph-progress-value" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="fobles-reference-graph-progress-active">
        <div className="fobles-reference-graph-progress-caption">CURRENT ACTIVITY</div>
        <div className="fobles-reference-graph-progress-active-row">
          <span className="fobles-reference-graph-progress-spinner" aria-hidden="true" />
          <div>
            <strong>{active?.label ?? "Waiting for activity"}</strong>
            <div>{active ? `Task ${activePosition} of ${total}` : "Preparing work"}</div>
          </div>
        </div>
      </div>

      <div className="fobles-reference-graph-progress-caption">RECENT ACTIVITY</div>
      <div className="fobles-reference-graph-progress-list">
        {recent.length === 0 ? (
          <div className="fobles-reference-graph-progress-empty">Waiting for tasks…</div>
        ) : recent.map((activity) => (
          <div className={`fobles-reference-graph-progress-item is-${activity.state}`} key={activity.activityId}>
            <span className="fobles-reference-graph-progress-icon">{stateIcon(activity.state)}</span>
            <span className="fobles-reference-graph-progress-name">{activity.label}</span>
            <span className="fobles-reference-graph-progress-state">
              Task {taskPosition(activities, activity.activityId)} of {total}
            </span>
          </div>
        ))}
      </div>

      <div className="fobles-reference-graph-progress-actions">
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
