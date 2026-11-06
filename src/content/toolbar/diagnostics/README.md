# Toolbar worker diagnostics

## Agents: contracts

- Inline in ToolbarApp; reuse PhaseProgressBar, never open a separate window. History and Options are independent.
- Diagnostics occupy the second grid row beneath the toolbar buttons inside the same draggable container, including bottom placements; never position them absolutely or flip them above the buttons. Inline-size containment keeps diagnostic text from widening the button row. Toolbar/visible worker stacking uses the shared Sass tokens (9999/9998 respectively).
- Structural sync setting `showToolbarDiagnostics` defaults to false. Observe settings live; subscribe/read pool status only while enabled and dispose subscriptions on disable/unmount.
- Initial getWorkerPoolStatus establishes the host tab. Accept only unfiltered snapshots for that numeric host; ignore undefined/different hosts and request-filtered snapshots. Subscribe before requesting the initial snapshot so matching live updates win the initial-read race.
- Show active/max workers, remaining capacity, foreground/background active/queued counts, and the foreground-first current operation, requested item (URL fallback), and scheduler phase. Worker detail events require both request and task identity from the accepted host snapshot.
- Focused Node rendering, subscription, and in-memory Sass layout/stacking tests live in tests/unit/toolbar-diagnostics; no live browser tests are required.