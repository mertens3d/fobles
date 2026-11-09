// @source-path [fobles] src/content/shared/dialog/use-fobles-window-geometry.ts

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getStorageValue, setStorageValue } from "../../../shared/storage/storage";
import { extensionLog } from "../../logger";
import {
  FOBLES_WINDOW_STATE_TYPE,
  FOBLES_WINDOW_TITLE_BAR_HEIGHT,
  FOBLES_WINDOW_VIEWPORT_MARGIN,
} from "./fobles-window.const";
import {
  centeredRect,
  clampRect,
  parsePersistedFoblesWindowState,
  readRect,
  viewportRect,
} from "./fobles-window-geometry-math";
import type {
  FoblesWindowGeometry,
  FoblesWindowGeometryOptions,
  FoblesWindowState,
  ResizeEdge,
  WindowRect,
} from "./fobles-window.types";

export function useFoblesWindowGeometry({
  storageKey,
  defaultWidth,
  defaultHeight,
  minWidth,
  minHeight,
}: FoblesWindowGeometryOptions): FoblesWindowGeometry {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<FoblesWindowState>(() => ({
    type: FOBLES_WINDOW_STATE_TYPE,
    ...centeredRect(window, defaultWidth, defaultHeight, minWidth, minHeight),
    collapsed: false,
    maximized: false,
  }));
  const [dragging, setDragging] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  // Set the moment the user first drags/resizes/collapses/maximizes, so a still-in-flight
  // storage hydration can no longer stomp a newer in-session interaction once it resolves.
  const hasUserInteractedRef = useRef(false);

  const persist = useCallback(
    (next: FoblesWindowState) => {
      void setStorageValue({ [storageKey]: next }, "local");
    },
    [storageKey],
  );

  const restoreRectOrDefault = useCallback(
    (current: FoblesWindowState): WindowRect =>
      current.restoreRect ?? centeredRect(window, defaultWidth, defaultHeight, minWidth, minHeight),
    [defaultWidth, defaultHeight, minWidth, minHeight],
  );

  useEffect(() => {
    let active = true;
    void getStorageValue<unknown>([storageKey], "local").then((values) => {
      if (!active || hasUserInteractedRef.current) {
        return;
      }
      const hydrated = parsePersistedFoblesWindowState(values[storageKey], window, minWidth, minHeight);
      if (hydrated) {
        setState((current) => ({ ...current, ...hydrated }));
      }
    });
    return () => {
      active = false;
    };
  }, [storageKey, minWidth, minHeight]);

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
    hasUserInteractedRef.current = true;
    setState((current) => {
      if (current.collapsed) {
        const restoreRect = restoreRectOrDefault(current);
        const next: FoblesWindowState = { ...current, ...restoreRect, collapsed: false, maximized: false, restoreRect: undefined };
        extensionLog.debug("Fobles window: restoring minimized window", { storageKey, current, restoreRect, next });
        persist(next);
        return next;
      }
      const restoreRect = dialogRef.current ? readRect(dialogRef.current) : current;
      const dockedTop = viewportRect(window).height - FOBLES_WINDOW_TITLE_BAR_HEIGHT - FOBLES_WINDOW_VIEWPORT_MARGIN;
      const next: FoblesWindowState = { ...current, restoreRect, collapsed: true, maximized: false, top: dockedTop };
      extensionLog.debug("Fobles window: minimizing window", { storageKey, current, restoreRect, dockedTop, next });
      persist(next);
      return next;
    });
  }, [persist, restoreRectOrDefault, storageKey]);

  const toggleMaximize = useCallback(() => {
    hasUserInteractedRef.current = true;
    setState((current) => {
      if (current.maximized) {
        const next: FoblesWindowState = {
          ...current,
          ...restoreRectOrDefault(current),
          collapsed: false,
          maximized: false,
          restoreRect: undefined,
        };
        persist(next);
        return next;
      }
      const viewport = viewportRect(window);
      const restoreRect =
        current.collapsed && current.restoreRect
          ? current.restoreRect
          : dialogRef.current
            ? readRect(dialogRef.current)
            : current;
      const next: FoblesWindowState = {
        ...current,
        restoreRect,
        collapsed: false,
        maximized: true,
        left: FOBLES_WINDOW_VIEWPORT_MARGIN,
        top: FOBLES_WINDOW_VIEWPORT_MARGIN,
        width: viewport.width - FOBLES_WINDOW_VIEWPORT_MARGIN * 2,
        height: viewport.height - FOBLES_WINDOW_VIEWPORT_MARGIN * 2,
      };
      persist(next);
      return next;
    });
  }, [persist, restoreRectOrDefault]);

  const dragStartRef = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
    left: number;
    top: number;
    moved: boolean;
  } | null>(null);

  const onTitlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target instanceof Element && event.target.closest("button"))) {
      return;
    }
    if (stateRef.current.collapsed) {
      extensionLog.debug("Fobles window: ignored title pointer down while minimized", { storageKey, pointerId: event.pointerId, detail: event.detail, state: stateRef.current });
      return;
    }
    event.preventDefault();
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) {
      extensionLog.debug("Fobles window: title pointer down had no window rect", { storageKey, pointerId: event.pointerId });
      return;
    }
    hasUserInteractedRef.current = true;
    dragStartRef.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, left: rect.left, top: rect.top, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    extensionLog.debug("Fobles window: title drag armed", { storageKey, pointerId: event.pointerId, detail: event.detail, rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height } });
  }, [storageKey]);

  const onTitlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start || start.pointerId !== event.pointerId) {
      return;
    }
    const rectWidth = dialogRef.current?.getBoundingClientRect().width ?? 0;
    const maxLeft = Math.max(
      FOBLES_WINDOW_VIEWPORT_MARGIN,
      window.innerWidth - rectWidth - FOBLES_WINDOW_VIEWPORT_MARGIN,
    );
    const maxTop = Math.max(
      FOBLES_WINDOW_VIEWPORT_MARGIN,
      window.innerHeight - FOBLES_WINDOW_TITLE_BAR_HEIGHT - FOBLES_WINDOW_VIEWPORT_MARGIN,
    );
    const left = Math.min(Math.max(start.left + event.clientX - start.clientX, FOBLES_WINDOW_VIEWPORT_MARGIN), maxLeft);
    const top = Math.min(Math.max(start.top + event.clientY - start.clientY, FOBLES_WINDOW_VIEWPORT_MARGIN), maxTop);
    start.moved = start.moved || left !== start.left || top !== start.top;
    setState((current) => ({ ...current, left, top }));
  }, []);

  const onTitlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const start = dragStartRef.current;
      if (!start || start.pointerId !== event.pointerId) {
        return;
      }
      event.currentTarget.releasePointerCapture(event.pointerId);
      dragStartRef.current = null;
      setDragging(false);
      if (!start.moved) {
        extensionLog.debug("Fobles window: title click completed without geometry change", { storageKey, pointerId: event.pointerId, detail: event.detail, state: stateRef.current });
        return;
      }
      const next: FoblesWindowState = { ...stateRef.current, collapsed: false, maximized: false, restoreRect: undefined };
      extensionLog.debug("Fobles window: title drag completed", { storageKey, pointerId: event.pointerId, start, next });
      setState(next);
      persist(next);
    },
    [persist],
  );

  const resizeStartRef = useRef<{
    pointerId: number;
    edge: ResizeEdge;
    startX: number;
    startY: number;
    rect: WindowRect;
  } | null>(null);

  const onResizePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>, edge: ResizeEdge) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    hasUserInteractedRef.current = true;
    resizeStartRef.current = {
      pointerId: event.pointerId,
      edge,
      startX: event.clientX,
      startY: event.clientY,
      rect: readRect(dialog),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onResizePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const start = resizeStartRef.current;
      if (!start || start.pointerId !== event.pointerId) {
        return;
      }
      const dx = event.clientX - start.startX;
      const dy = event.clientY - start.startY;
      let next = { ...start.rect };
      if (start.edge.includes("e")) {
        next.width = start.rect.width + dx;
      }
      if (start.edge.includes("s")) {
        next.height = start.rect.height + dy;
      }
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
      if (!start || start.pointerId !== event.pointerId) {
        return;
      }
      event.currentTarget.releasePointerCapture(event.pointerId);
      resizeStartRef.current = null;
      persist(stateRef.current);
    },
    [persist],
  );

  const style = useMemo<React.CSSProperties>(
    () => ({
      left: state.left,
      top: state.top,
      width: state.width,
      height: state.collapsed ? FOBLES_WINDOW_TITLE_BAR_HEIGHT : state.height,
    }),
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
