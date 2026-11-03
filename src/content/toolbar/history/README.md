# History toolbar UI

- Uses the shared origin/database-scoped history repository and serialized background mutations; the repository owns the 20-item limit.
- Quick Info observation keeps the database scope live. Subscription updates win over an older initial read; scope changes and unmounts discard pending results and unsubscribe.
- History is an absolutely positioned tab, independent of toolbar row width. Bottom-corner placement reverses the tab and panel upward to keep them usable near the viewport edge.
- Hover opens the panel; clicking pins/unpins it. Jump, Proxy, and History are mutually exclusive. Compact toolbars omit History.
- Item anchors retain real Content Editor URLs and use the existing navigation service for normal, Ctrl/Cmd, and middle clicks. Scope/database and normalized uppercase braced GUIDs are carried in the URL.
- Tooltips use Tippy custom DOM rendering (no global Tippy stylesheet), plain text, a 500 ms delay, and keyboard focus. The current source tree has no remaining Tippy implementation to reuse; its research README documents the custom-styled approach.
- The empty title wrapper suppresses the parent toolbar's inherited native drag tooltip. Errors remain visible in the panel without optimistic storage writes.