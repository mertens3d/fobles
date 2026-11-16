# Toolbar worker diagnostics

## Agents: contracts

- Inline in ToolbarApp; reuse the shared WorkProgress component (shared/ui/work-progress), never open a separate window. History and Options are independent.
- Diagnostics occupy the second grid row beneath the toolbar buttons inside the same draggable container, including bottom placements; never position them absolutely or flip them above the buttons. Inline-size containment keeps diagnostic text from widening the button row. Toolbar/visible worker stacking uses the shared Sass tokens (9999/9998 respectively).
- Structural sync setting `showToolbarDiagnostics` defaults to false. Observe settings live; subscribe to work-session progress only while enabled and dispose subscriptions on disable/unmount.
- Progress is owned by the work session (foundation/workers/progress). Never derive counts here: show the most relevant active session (foreground first, then most recently started) and "+N more" for the rest; "Idle" when none is active.
- The Worker Monitor lists every work session with the same component and labels each task with its owning session.
- Focused Node rendering, subscription, and in-memory Sass layout/stacking tests live in tests/unit/toolbar-diagnostics; no live browser tests are required.