// @source-path [fobles] src/content/shared/dialog/fobles-window.ts

import { getStorageValue, setStorageValue } from "../../../shared/storage/storage";

type WindowRect = { left: number; top: number; width: number; height: number };
type FoblesWindowState = WindowRect & { type: "foblesWindowState"; collapsed: boolean; maximized: boolean; restoreRect?: WindowRect };
export type FoblesWindowOptions = {
  id: string;
  className: string;
  title: string;
  storageKey: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
  onHelp?: () => void;
  owner?: HTMLElement;
};
export type FoblesWindow = { window: HTMLDivElement; content: HTMLDivElement; close: () => void; dispose: () => void };

const VIEWPORT_MARGIN = 12;
const TITLE_BAR_HEIGHT = 34;
const RESIZE_EDGES = ["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const;

function viewportRect(doc: Document): { width: number; height: number } {
  const win = doc.defaultView ?? window;
  return { width: win.innerWidth, height: win.innerHeight };
}

function clampRect(doc: Document, rect: WindowRect, minWidth: number, minHeight: number): WindowRect {
  const viewport = viewportRect(doc);
  const maxWidth = Math.max(minWidth, viewport.width - VIEWPORT_MARGIN * 2);
  const maxHeight = Math.max(minHeight, viewport.height - VIEWPORT_MARGIN * 2);
  const width = Math.min(maxWidth, Math.max(minWidth, rect.width));
  const height = Math.min(maxHeight, Math.max(minHeight, rect.height));
  const left = Math.min(viewport.width - VIEWPORT_MARGIN - width, Math.max(VIEWPORT_MARGIN, rect.left));
  const top = Math.min(viewport.height - VIEWPORT_MARGIN - TITLE_BAR_HEIGHT, Math.max(VIEWPORT_MARGIN, rect.top));
  return { left, top, width, height };
}

function centeredRect(doc: Document, width: number, height: number, minWidth: number, minHeight: number): WindowRect {
  const viewport = viewportRect(doc);
  return clampRect(doc, { left: Math.round((viewport.width - width) / 2), top: Math.round((viewport.height - height) / 2), width, height }, minWidth, minHeight);
}

function applyRect(dialog: HTMLDivElement, rect: WindowRect): void {
  dialog.style.left = `${rect.left}px`;
  dialog.style.top = `${rect.top}px`;
  dialog.style.width = `${rect.width}px`;
  dialog.style.height = `${rect.height}px`;
}

function readRect(dialog: HTMLDivElement): WindowRect {
  const rect = dialog.getBoundingClientRect();
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

function createWindowButton(doc: Document, className: string, label: string, text: string): HTMLButtonElement {
  const button = doc.createElement("button");
  button.type = "button";
  button.className = `fobles-window-button ${className}`;
  button.title = label;
  button.setAttribute("aria-label", label);
  button.textContent = text;
  return button;
}

export function createFoblesWindow(doc: Document, options: FoblesWindowOptions): FoblesWindow {
  doc.getElementById(options.id)?.remove();
  const dialog = doc.createElement("div");
  dialog.id = options.id;
  dialog.className = `${options.className} fobles-window`;
  dialog.dataset.foblesWindowKey = options.storageKey;
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-label", options.title);
  dialog.style.minWidth = `${options.minWidth}px`;
  dialog.style.minHeight = `${options.minHeight}px`;
  const titleBar = doc.createElement("div");
  titleBar.className = "fobles-window-titlebar";
  const title = doc.createElement("div");
  title.className = "fobles-window-title";
  title.textContent = options.title;
  const actions = doc.createElement("div");
  actions.className = "fobles-window-actions";
  const helpButton = options.onHelp ? createWindowButton(doc, "fobles-window-help", "Help", "?") : undefined;
  const collapseButton = createWindowButton(doc, "fobles-window-collapse", "Collapse", "_");
  const maximizeButton = createWindowButton(doc, "fobles-window-maximize", "Maximize", "□");
  const closeButton = createWindowButton(doc, "fobles-window-close", "Close", "×");
  if (helpButton) actions.appendChild(helpButton);
  actions.append(collapseButton, maximizeButton, closeButton);
  titleBar.append(title, actions);
  const content = doc.createElement("div");
  content.className = "fobles-window-content";
  dialog.append(titleBar, content);
  RESIZE_EDGES.forEach((edge) => {
    const handle = doc.createElement("div");
    handle.className = `fobles-window-resize fobles-window-resize--${edge}`;
    handle.dataset.edge = edge;
    dialog.appendChild(handle);
  });
  (options.owner ?? doc.body).appendChild(dialog);

  let state: FoblesWindowState = { type: "foblesWindowState", ...centeredRect(doc, options.defaultWidth, options.defaultHeight, options.minWidth, options.minHeight), collapsed: false, maximized: false };
  let disposed = false;
  let operationCleanup: (() => void) | undefined;

  function persist(): void { void setStorageValue({ [options.storageKey]: state }, "local"); }
  function updateButtons(): void {
    collapseButton.textContent = state.collapsed ? "▢" : "_";
    collapseButton.title = state.collapsed ? "Restore" : "Collapse";
    collapseButton.setAttribute("aria-label", state.collapsed ? "Restore" : "Collapse");
    maximizeButton.textContent = state.maximized ? "❐" : "□";
    maximizeButton.title = state.maximized ? "Restore" : "Maximize";
    maximizeButton.setAttribute("aria-label", state.maximized ? "Restore" : "Maximize");
    dialog.classList.toggle("is-collapsed", state.collapsed);
    dialog.classList.toggle("is-maximized", state.maximized);
  }
  function applyState(): void {
    const rect = clampRect(doc, state, options.minWidth, options.minHeight);
    state = { ...state, ...rect };
    applyRect(dialog, rect);
    if (state.collapsed) dialog.style.height = `${TITLE_BAR_HEIGHT}px`;
    updateButtons();
  }
  function maximize(): void {
    const viewport = viewportRect(doc);
    const restoreRect = state.collapsed && state.restoreRect ? state.restoreRect : readRect(dialog);
    state = { ...state, restoreRect, collapsed: false, maximized: true, left: VIEWPORT_MARGIN, top: VIEWPORT_MARGIN, width: viewport.width - VIEWPORT_MARGIN * 2, height: viewport.height - VIEWPORT_MARGIN * 2 };
    applyState();
    persist();
  }
  function restore(): void {
    const restoreRect = state.restoreRect ?? centeredRect(doc, options.defaultWidth, options.defaultHeight, options.minWidth, options.minHeight);
    state = { ...state, ...restoreRect, collapsed: false, maximized: false, restoreRect: undefined };
    applyState();
    persist();
  }
  function collapse(): void {
    if (state.collapsed) { restore(); return; }
    state = { ...state, restoreRect: readRect(dialog), collapsed: true, maximized: false };
    applyState();
    persist();
  }
  let dragPointerId: number | undefined;
  let dragStartClientX = 0;
  let dragStartClientY = 0;
  let dragStartLeft = 0;
  let dragStartTop = 0;

  const handleTitlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || event.target instanceof Element && event.target.closest("button")) return;
    event.preventDefault();
    const rect = dialog.getBoundingClientRect();
    dragPointerId = event.pointerId;
    dragStartClientX = event.clientX;
    dragStartClientY = event.clientY;
    dragStartLeft = rect.left;
    dragStartTop = rect.top;
    titleBar.setPointerCapture(event.pointerId);
    dialog.classList.add("is-dragging");
  };
  const handleTitlePointerMove = (event: PointerEvent): void => {
    if (dragPointerId !== event.pointerId || !dialog.classList.contains("is-dragging")) return;
    const rect = dialog.getBoundingClientRect();
    const maxLeft = Math.max(VIEWPORT_MARGIN, (doc.defaultView?.innerWidth ?? window.innerWidth) - rect.width - VIEWPORT_MARGIN);
    const maxTop = Math.max(VIEWPORT_MARGIN, (doc.defaultView?.innerHeight ?? window.innerHeight) - TITLE_BAR_HEIGHT - VIEWPORT_MARGIN);
    const left = Math.min(Math.max(dragStartLeft + event.clientX - dragStartClientX, VIEWPORT_MARGIN), maxLeft);
    const top = Math.min(Math.max(dragStartTop + event.clientY - dragStartClientY, VIEWPORT_MARGIN), maxTop);
    dialog.style.left = `${left}px`;
    dialog.style.top = `${top}px`;
    dialog.style.right = "auto";
    dialog.style.bottom = "auto";
  };
  const endTitleDrag = (event: PointerEvent): void => {
    if (dragPointerId !== event.pointerId || !dialog.classList.contains("is-dragging")) return;
    titleBar.releasePointerCapture(event.pointerId);
    dialog.classList.remove("is-dragging");
    dragPointerId = undefined;
    state = { ...state, ...readRect(dialog), collapsed: false, maximized: false, restoreRect: undefined };
    persist();
  };

  function beginResizeOperation(event: PointerEvent, edge?: string): void {
    if (event.button !== 0 || disposed || !edge) return;
    event.preventDefault();
    const start = readRect(dialog);
    const startX = event.clientX;
    const startY = event.clientY;
    const move = (moveEvent: PointerEvent): void => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      let next = { ...start };
      if (edge.includes("e")) next.width = start.width + dx;
      if (edge.includes("s")) next.height = start.height + dy;
      if (edge.includes("w")) { next.left = start.left + dx; next.width = start.width - dx; }
      if (edge.includes("n")) { next.top = start.top + dy; next.height = start.height - dy; }
      next = clampRect(doc, next, options.minWidth, options.minHeight);
      state = { ...state, ...next, maximized: false, collapsed: false, restoreRect: undefined };
      applyState();
    };
    const endResize = (): void => {
      doc.removeEventListener("pointermove", move, true);
      doc.removeEventListener("pointerup", endResize, true);
      doc.removeEventListener("pointercancel", endResize, true);
      operationCleanup = undefined;
      persist();
    };
    operationCleanup?.();
    operationCleanup = endResize;
    doc.addEventListener("pointermove", move, true);
    doc.addEventListener("pointerup", endResize, true);
    doc.addEventListener("pointercancel", endResize, true);
  }
  const handleResizePointerDown = (event: PointerEvent): void => beginResizeOperation(event, (event.currentTarget as HTMLElement).dataset.edge);
  const handleViewportResize = (): void => { applyState(); persist(); };
  titleBar.addEventListener("pointerdown", handleTitlePointerDown);
  titleBar.addEventListener("pointermove", handleTitlePointerMove);
  titleBar.addEventListener("pointerup", endTitleDrag);
  titleBar.addEventListener("pointercancel", endTitleDrag);
  titleBar.addEventListener("dblclick", () => state.maximized ? restore() : maximize());
  dialog.querySelectorAll<HTMLElement>(".fobles-window-resize").forEach((handle) => handle.addEventListener("pointerdown", handleResizePointerDown));
  helpButton?.addEventListener("click", () => options.onHelp?.());
  collapseButton.addEventListener("click", collapse);
  maximizeButton.addEventListener("click", () => state.maximized ? restore() : maximize());
  const close = (): void => { dialog.dispatchEvent(new CustomEvent("fobles-window-close")); };
  closeButton.addEventListener("click", close);
  doc.defaultView?.addEventListener("resize", handleViewportResize);

  void getStorageValue<unknown>([options.storageKey], "local").then((values) => {
    if (disposed) return;
    const stored = values[options.storageKey];
    if (stored && typeof stored === "object") {
      const candidate = stored as Partial<FoblesWindowState>;
      if ((candidate.type === undefined || candidate.type === "foblesWindowState") && [candidate.left, candidate.top, candidate.width, candidate.height].every((value) => typeof value === "number" && Number.isFinite(value))) {
        state = { ...state, ...(candidate as FoblesWindowState), collapsed: candidate.collapsed === true, maximized: candidate.maximized === true };
      }
    }
    applyState();
  });
  applyState();

  return {
    window: dialog,
    content,
    close,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      operationCleanup?.();
      doc.defaultView?.removeEventListener("resize", handleViewportResize);
    },
  };
}
