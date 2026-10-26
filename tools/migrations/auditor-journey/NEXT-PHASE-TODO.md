# Next Phase TODO

## Open
- Separate "Processing Timeout" and "Recovery Exhausted" outcomes in Auditor. Both currently show as one Sitecore Error.
- Memory growth across repeated runs. No timer or iframe leak is visible at close. Heap and DOM snapshots are logged per
  Auditor run ("Heap snapshot": auditor-opened, auditor-resolve-complete, auditor-closing, auditor-closed,
  auditor-closed+10s). Review them across several runs before changing code, otherwise revisit after the Foundation migration.
- Graph does not log heap snapshots yet.
- Sitecore "Synchronous XHR in page dismissal" alert on cold items. Watching. Capture a log while the alert is showing.

## Needs a run to confirm
- Node Details uses the shared close button.
- Task time limit starts when a job is handed to a worker. Look for "Worker pool: job clock started" with `queueWaitMs`.
- Graph and Auditor share the Controls header and round `?` button.
- Auditor Clear button no longer spans the whole row.
- Persisted-log buttons are six equal-width buttons in `src/options/options.html`. Delete the stray `src/public/options.html`.

## Done
- Progress bars: replayed progress, cold-item acquisition progress.
- Item / Relationship header returns to tree order.
- Auditor toolbar trigger icon: acceptable for now.
