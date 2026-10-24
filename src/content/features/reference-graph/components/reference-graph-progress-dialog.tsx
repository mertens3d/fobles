import type { ActivityEvent } from "../../../shared/activity/activity-events";

type ReferenceGraphProgressDialogProps = { activities: readonly ActivityEvent[]; onCancel: () => void };

function stateIcon(state: ActivityEvent["state"]): string {
  if (state === "completed") return "✓";
  if (state === "error") return "!";
  if (state === "cancelled") return "×";
  return state === "started" ? "●" : "○";
}

export function ReferenceGraphProgressDialog({ activities, onCancel }: ReferenceGraphProgressDialogProps) {
  const active = [...activities].reverse().find((activity) => activity.state === "started");
  const completed = activities.filter((activity) => activity.state === "completed").length;
  const settled = activities.filter((activity) => ["completed", "error", "cancelled"].includes(activity.state)).length;
  const total = activities.length;
  const recent = activities.slice(-6).reverse();
  return (
    <div className="fobles-reference-graph-progress-panel">
      <div className="fobles-reference-graph-progress-header">
        <div><strong>Building Reference Graph</strong><div className="fobles-reference-graph-progress-summary">{settled} / {total} worker tasks settled · {completed} completed</div></div>
        <div className="fobles-reference-graph-progress-pulse" aria-hidden="true" />
      </div>
      <div className="fobles-reference-graph-progress-active">
        <div className="fobles-reference-graph-progress-caption">CURRENT ACTIVITY</div>
        <div className="fobles-reference-graph-progress-active-row">
          <span className="fobles-reference-graph-progress-spinner" aria-hidden="true" />
          <div><strong>{active?.label ?? "Waiting for worker activity"}</strong><div>{active?.detail ?? "Preparing work"}</div></div>
        </div>
      </div>
      <div className="fobles-reference-graph-progress-caption">RECENT ACTIVITY</div>
      <div className="fobles-reference-graph-progress-list">
        {recent.length === 0 ? <div className="fobles-reference-graph-progress-empty">Waiting for tasks…</div> : recent.map((activity) => (
          <div className={`fobles-reference-graph-progress-item is-${activity.state}`} key={`${activity.activityId}-${activity.timestamp}`}>
            <span className="fobles-reference-graph-progress-icon">{stateIcon(activity.state)}</span>
            <span className="fobles-reference-graph-progress-name">{activity.label}</span>
            <span className="fobles-reference-graph-progress-state">{activity.current !== undefined && activity.total !== undefined ? `${activity.current} / ${activity.total}` : activity.state}</span>
          </div>
        ))}
      </div>
      <div className="fobles-reference-graph-progress-actions"><button type="button" onClick={onCancel}>Cancel</button></div>
    </div>
  );
}
