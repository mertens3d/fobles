// @source-path [fobles] src/content/shared/dialog/use-fobles-window-geometry.ts

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getStorageValue, setStorageValue } from "../../../shared/storage/storage";
import { FOBLES_WINDOW_TITLE_BAR_HEIGHT, FOBLES_WINDOW_VIEWPORT_MARGIN } from "./fobles-window.const";
import type { FoblesWindowState, ResizeEdge, WindowRect } from "./fobles-window.types";

function viewportRect(win: Window): { width: number; height: number } {
  return { width: win.innerWidth, height: win.innerHeight };
}

function clampRect(win: Window, rect: WindowRect, minWidth: number, minHeight: number): WindowRect {
  const viewport = viewportRect(win);
  const maxWidth = Math.max(minWidth, viewport.width - FOBLES_WINDOW_VIEWPORT_MARGIN * 2);
  const maxHeight = Math.max(minHeight, viewport.height - FOBLES_WINDOW_VIEWPORT_MARGIN * 2);
  const width = Math.min(maxWidth, Math.max(minWidth, rect.width));
  const height = Math.min(maxHeight, Math.max(minHeight, rect.height));
  const left = Math.min(viewport.width - FOBLES_WINDOW_VIEWPORT_MARGIN - width, Math.max(FOBLES_WINDOW_VIEWPORT_MARGIN, rect.left));
  const top = Math.min(viewport.height - FOBLES_WINDOW_VIEWPORT_MARGIN - FOBLES_WINDOW_TITLE_BAR_HEIGHT, Math.max(FOBLES_WINDOW_VIEWPORT_MARGIN, rect.top));
  return { left, top, width, height };
}

function centeredRect(win: Window, width: number, height: number, minWidth: number, minHeight: number): WindowRect {
  const viewport = viewportRect(win);
  return clampRect(win, { left: Math.round((viewport.width - width) / 2), top: Math.round((viewport.height - height) / 2), width, height }, minWidth, minHeight);
}

function readRect(element: HTMLElement): WindowRect {
  const rect = element.getBoundingClientRect();
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

export type FoblesWindowGeometryOptions = { storageKey: string; defaultWidth: number; defaultHeight: number; minWidth: number; minHeight: number };

export type FoblesWindowGeometry = {
  dialogRef: React.RefObject<HTMLDivElement | null>;
  style: React.CSSProperties;
  collapsed: boolean;
  maximized: boolean;
  dragging: boolean;
  toggleCollapse: () => void;
  toggleMaximize: () => void;
  onTitlePointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onTitlePointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onTitlePointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  onResizePointerDown: (event: React.PointerEvent<HTMLDivElement>, edge: ResizeEdge) => void;
  onResizePointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onResizePointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
};

export function useFoblesWindowGeometry({ storageKey, defaultWidth, defaultHeight, minWidth, minHeight }: FoblesWindowGeometryOptions): FoblesWindowGeometry {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<FoblesWindowState>(() => ({ type: "foblesWindowState", ...centeredRect(window, defaultWidth, defaultHeight, minWidth, minHeight), collapsed: false, maximized: false }));
  const [dragging, setDragging] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const persist = useCallback(
    (next: FoblesWindowState) => {
      void setStorageValue({ [storageKey]: next }, "local");
    },
    [storageKey],
  );

  const restoreRectOrDefault = useCallback(
    (current: FoblesWindowState): WindowRect => current.restoreRect ?? centeredRect(window, defaultWidth, defaultHeight, minWidth, minHeight),
    [defaultWidth, defaultHeight, minWidth, minHeight],
  );

  useEffect(() => {
    let active = true;
    void getStorageValue<unknown>([storageKey], "local").then((values) => {
      if (!active) return;
      const stored = values[storageKey];
      if (!stored || typeof stored !== "object") return;
      const candidate = stored as Partial<FoblesWindowState>;
      const hasValidRect = [candidate.left, candidate.top, candidate.width, candidate.height].every((value) => typeof value === "number" && Number.isFinite(value));
      if ((candidate.type === undefined || candidate.type === "foblesWindowState") && hasValidRect) {
        setState((current) => ({ ...current, ...(candidate as FoblesWindowState), collapsed: candidate.collapsed === true, maximized: candidate.maximized === true }));
      }
    });
    return () => {
      active = false;
    };
  }, [storageKey]);

  useEffect(() => {
    function onViewportResize(): void {
      setState((current) => {
        const next: FoblesWindowState = { ...current, ...clampRect(window, current, minWidth, minHeight) };
        persist(next);
        return next;
      });
    }
    window.addEventListener("resize", onViewportResize);
    return () => window.removeEventListener("resize", onViewportResize);
  }, [minWidth, minHeight, persist]);

  const toggleCollapse = useCallback(() => {
    setState((current) => {
      if (current.collapsed) {
        const next: FoblesWindowState = { ...current, ...restoreRectOrDefault(current), collapsed: false, maximized: false, restoreRect: undefined };
        persist(next);
        return next;
      }
      const restoreRect = dialogRef.current ? readRect(dialogRef.current) : current;
      // Minimizing docks the title bar to the bottom of the screen, like a normal OS window.
      const dockedTop = viewportRect(window).height - FOBLES_WINDOW_TITLE_BAR_HEIGHT - FOBLES_WINDOW_VIEWPORT_MARGIN;
      const next: FoblesWindowState = { ...current, restoreRect, collapsed: true, maximized: false, top: dockedTop };
      persist(next);
      return next;
    });
  }, [persist, restoreRectOrDefault]);

  const toggleMaximize = useCallback(() => {
    setState((current) => {
      if (current.maximized) {
        const next: FoblesWindowState = { ...current, ...restoreRectOrDefault(current), collapsed: false, maximized: false, restoreRect: undefined };
        persist(next);
        return next;
      }
      const viewport = viewportRect(window);
      const restoreRect = current.collapsed && current.restoreRect ? current.restoreRect : dialogRef.current ? readRect(dialogRef.current) : current;
      const next: FoblesWindowState = { ...current, restoreRect, collapsed: false, maximized: true, left: FOBLES_WINDOW_VIEWPORT_MARGIN, top: FOBLES_WINDOW_VIEWPORT_MARGIN, width: viewport.width - FOBLES_WINDOW_VIEWPORT_MARGIN * 2, height: viewport.height - FOBLES_WINDOW_VIEWPORT_MARGIN * 2 };
      persist(next);
      return next;
    });
  }, [persist, restoreRectOrDefault]);

  const dragStartRef = useRef<{ pointerId: number; clientX: number; clientY: number; left: number; top: number } | null>(null);

  const onTitlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target instanceof Element && event.target.closest("button"))) return;
    event.preventDefault();
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragStartRef.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, left: rect.left, top: rect.top };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }, []);

  const onTitlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const rectWidth = dialogRef.current?.getBoundingClientRect().width ?? 0;
    const maxLeft = Math.max(FOBLES_WINDOW_VIEWPORT_MARGIN, window.innerWidth - rectWidth - FOBLES_WINDOW_VIEWPORT_MARGIN);
    const maxTop = Math.max(FOBLES_WINDOW_VIEWPORT_MARGIN, window.innerHeight - FOBLES_WINDOW_TITLE_BAR_HEIGHT - FOBLES_WINDOW_VIEWPORT_MARGIN);
    const left = Math.min(Math.max(start.left + event.clientX - start.clientX, FOBLES_WINDOW_VIEWPORT_MARGIN), maxLeft);
    const top = Math.min(Math.max(start.top + event.clientY - start.clientY, FOBLES_WINDOW_VIEWPORT_MARGIN), maxTop);
    setState((current) => ({ ...current, left, top }));
  }, []);

  const onTitlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const start = dragStartRef.current;
      if (!start || start.pointerId !== event.pointerId) return;
      event.currentTarget.releasePointerCapture(event.pointerId);
      dragStartRef.current = null;
      setDragging(false);
      const next: FoblesWindowState = { ...stateRef.current, collapsed: false, maximized: false, restoreRect: undefined };
      setState(next);
      persist(next);
    },
    [persist],
  );

  const resizeStartRef = useRef<{ pointerId: number; edge: ResizeEdge; startX: number; startY: number; rect: WindowRect } | null>(null);

  const onResizePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>, edge: ResizeEdge) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const dialog = dialogRef.current;
    if (!dialog) return;
    resizeStartRef.current = { pointerId: event.pointerId, edge, startX: event.clientX, startY: event.clientY, rect: readRect(dialog) };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onResizePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const start = resizeStartRef.current;
      if (!start || start.pointerId !== event.pointerId) return;
      const dx = event.clientX - start.startX;
      const dy = event.clientY - start.startY;
      let next = { ...start.rect };
      if (start.edge.includes("e")) next.width = start.rect.width + dx;
      if (start.edge.includes("s")) next.height = start.rect.height + dy;
      if (start.edge.includes("w")) {
        next.left = start.rect.left + dx;
        next.width = start.rect.width - dx;
      }
      if (start.edge.includes("n")) {
        next.top = start.rect.top + dy;
        next.height = start.rect.height - dy;
      }
      next = clampRect(window, next, minWidth, minHeight);
      setState((current) => ({ ...current, ...next, maximized: false, collapsed: false, restoreRect: undefined }));
    },
    [minWidth, minHeight],
  );

  const onResizePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const start = resizeStartRef.current;
      if (!start || start.pointerId !== event.pointerId) return;
      event.currentTarget.releasePointerCapture(event.pointerId);
      resizeStartRef.current = null;
      persist(stateRef.current);
    },
    [persist],
  );

  const style = useMemo<React.CSSProperties>(
    () => ({ left: state.left, top: state.top, width: state.width, height: state.collapsed ? FOBLES_WINDOW_TITLE_BAR_HEIGHT : state.height }),
    [state],
  );

  return {
    dialogRef,
    style,
    collapsed: state.collapsed,
    maximized: state.maximized,
    dragging,
    toggleCollapse,
    toggleMaximize,
    onTitlePointerDown,
    onTitlePointerMove,
    onTitlePointerUp,
    onResizePointerDown,
    onResizePointerMove,
    onResizePointerUp,
  };
}
