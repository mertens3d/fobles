# Fobles Z-Layers

Authoritative stacking registry. Components consume semantic layers from `src/content/styles/_z-layers.scss`; do not invent raw global z-index values.

| Layer | Value | Owners |
|---|---:|---|
| content | 0 | ordinary content |
| toolbar | 100 | toolbar |
| flyout | 200 | menus/selectors |
| window | 300 | History, Worker Task Manager, Graph, Auditor |
| window-active | 310 | focused shared window |
| popover | 400 | window-bound popovers |
| modal-backdrop | 500 | blocking backdrop |
| modal | 510 | confirmation/help/details |
| notification | 600 | toast/errors |
| critical | 700 | exceptional infrastructure only |

Graph, Auditor, History, and Worker Task Manager share the window layer; focus promotion alone uses window-active. New global layers require updating this document and `_z-layers.scss`.
