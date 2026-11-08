# Next Phase TODO

> Migration-local backlog. The canonical project backlog is `docs/TODO.md`; shared shell/window/worker/design-system work is tracked there and should be completed before broader Auditor checks resume.

## Open

- Separate "Processing Timeout" and "Recovery Exhausted" outcomes in Auditor. Both currently show as one Sitecore Error.
- Memory growth across repeated runs. No timer or iframe leak is visible at close. Heap and DOM snapshots are logged per Auditor run (`auditor-opened`, `auditor-resolve-complete`, `auditor-closing`, `auditor-closed`, `auditor-closed+10s`). Review them across several runs before changing code, otherwise revisit after the Foundation migration.
- Graph does not log heap snapshots yet.
- Sitecore "Synchronous XHR in page dismissal" alert on cold items. Watching. Capture a log while the alert is showing.
- Do not resume broader Auditor checks until the shared Fobles window/design-system/worker regression work tracked in `docs/TODO.md` is stable.

## Needs a run to confirm

- Node Details uses the shared close button.
- Task time limit starts when a job is handed to a worker. Look for `Worker pool: job clock started` with `queueWaitMs`.
- Graph and Auditor share the Controls header and round `?` button.
- Auditor Clear button no longer spans the whole row.
- Persisted-log buttons are six equal-width buttons in `src/options/options.html`.
