// @source-path [fobles] src/content/toolbar/use-toolbar-drag.ts

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CLASS, SELECTORS } from "../../constants/fobles.constants";
import type { ToolbarCorner } from "../../constants/constants.types";
import type { ToolbarPlacement } from "../../constants/constants.types";
import type { ToolbarContext } from "./toolbarcontext.types";
import { HISTORY_SELECTOR } from "./history/history.const";
import type { ToolbarDragResult, DragPosition } from "./ToolbarDragResult.types";

const MIN_EDGE_MARGIN = 4;
const RESIZE_SETTLE_DELAY_MS = 200;

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        `button, a, input, select, textarea, [role='button'], .fobles-window, .fobles-window-portal-root, ${SELECTORS.JUMP_FLYOUT}, ${SELECTORS.PROXY_BUTTONS}, ${HISTORY_SELECTOR.PANEL}`,
      ),
    )
  );
}

function clampOffset(value: number, maxOffset: number): number {
  const upperBound = Math.max(maxOffset, MIN_EDGE_MARGIN);
  return Math.min(Math.max(value, MIN_EDGE_MARGIN), upperBound);
}

function clampPlacement(win: Window, placement: ToolbarPlacement, width: number, height: number): ToolbarPlacement {
  return {
    corner: placement.corner,
    offsetX: clampOffset(placement.offsetX, win.innerWidth - width - MIN_EDGE_MARGIN),
    offsetY: clampOffset(placement.offsetY, win.innerHeight - height - MIN_EDGE_MARGIN),
  };
}

function computeNearestCornerPlacement(win: Window, rect: DOMRect): ToolbarPlacement {
  const centroidX = rect.left + rect.width / 2;
  const centroidY = rect.top + rect.height / 2;
  const width = win.innerWidth;
  const height = win.innerHeight;
  const candidates: Array<{ corner: ToolbarCorner; x: number; y: number }> = [
    { corner: "upper-left", x: 0, y: 0 },
    { corner: "upper-right", x: width, y: 0 },
    { corner: "bottom-left", x: 0, y: height },
    { corner: "bottom-right", x: width, y: height },
  ];
  const nearestCorner = candidates.reduce(
    (closest, candidate) => {
      const distance = Math.hypot(candidate.x - centroidX, candidate.y - centroidY);
      return distance < closest.distance ? { corner: candidate.corner, distance } : closest;
    },
    { corner: candidates[0].corner, distance: Infinity },
  ).corner;
  return clampPlacement(
    win,
    {
      corner: nearestCorner,
      offsetX: nearestCorner.endsWith("right") ? width - rect.right : rect.left,
      offsetY: nearestCorner.startsWith("bottom") ? height - rect.bottom : rect.top,
    },
    rect.width,
    rect.height,
  );
}

function placementToStyle(placement: ToolbarPlacement): React.CSSProperties {
  const isBottom = placement.corner.startsWith("bottom");
  const isRight = placement.corner.endsWith("right");
  return {
    top: isBottom ? "auto" : `${placement.offsetY}px`,
    bottom: isBottom ? `${placement.offsetY}px` : "auto",
    left: isRight ? "auto" : `${placement.offsetX}px`,
    right: isRight ? `${placement.offsetX}px` : "auto",
  };
}

export function useToolbarDrag(context: ToolbarContext): ToolbarDragResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [placement, setPlacement] = useState<ToolbarPlacement>(context.placement);
  const [dragPosition, setDragPosition] = useState<DragPosition | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const draggingRef = useRef(false);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const resizeSettleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    draggingRef.current = dragging;
  }, [dragging]);

  useEffect(() => {
    if (draggingRef.current) {
      return;
    }
    setPlacement(context.placement);
    // Only resyncs from the externally-owned placement (e.g. a storage-change push from
    // toolbar-runtime.ts); an in-progress drag is the local, more current source of truth.
  }, [context.placement.corner, context.placement.offsetX, context.placement.offsetY]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const rect = container.getBoundingClientRect();
    setPlacement((current) => clampPlacement(context.win, current, rect.width, rect.height));
    // Clamps the initial placement against the container's just-measured size, once on mount.
  }, []);

  useEffect(() => {
    function onResize(): void {
      const container = containerRef.current;
      if (!container || draggingRef.current) {
        return;
      }
      if (resizeSettleTimerRef.current === null) {
        setResizing(true);
      } else {
        context.win.clearTimeout(resizeSettleTimerRef.current);
      }
      resizeSettleTimerRef.current = context.win.setTimeout(() => {
        resizeSettleTimerRef.current = null;
        const rect = container.getBoundingClientRect();
        setPlacement((current) => clampPlacement(context.win, current, rect.width, rect.height));
        setResizing(false);
      }, RESIZE_SETTLE_DELAY_MS);
    }
    context.win.addEventListener("resize", onResize);
    return () => {
      context.win.removeEventListener("resize", onResize);
      if (resizeSettleTimerRef.current !== null) {
        context.win.clearTimeout(resizeSettleTimerRef.current);
      }
    };
  }, [context.win]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>): void {
    if (event.button !== 0 || isInteractiveTarget(event.target)) {
      return;
    }
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    dragStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    setDragPosition({ left: rect.left, top: rect.top });
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>): void {
    const start = dragStartRef.current;
    if (!dragging || !start) {
      return;
    }
    const maxLeft = context.win.innerWidth - start.width - MIN_EDGE_MARGIN;
    const maxTop = context.win.innerHeight - start.height - MIN_EDGE_MARGIN;
    setDragPosition({
      left: clampOffset(start.left + (event.clientX - start.clientX), maxLeft),
      top: clampOffset(start.top + (event.clientY - start.clientY), maxTop),
    });
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>): void {
    if (!dragging) {
      return;
    }
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
    setDragPosition(null);
    dragStartRef.current = null;
    const rect = event.currentTarget.getBoundingClientRect();
    const nextPlacement = computeNearestCornerPlacement(context.win, rect);
    setPlacement(nextPlacement);
    context.setPlacement(nextPlacement);
  }

  const style = useMemo<React.CSSProperties>(() => {
    if (dragPosition) {
      return { left: `${dragPosition.left}px`, top: `${dragPosition.top}px`, right: "auto", bottom: "auto" };
    }
    return placementToStyle(placement);
  }, [dragPosition, placement]);

  const className = [
    CLASS.TOOLBAR_CONTAINER,
    dragging ? CLASS.TOOLBAR_DRAGGING : "",
    resizing ? CLASS.TOOLBAR_RESIZING : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    containerRef,
    className,
    dataPosition: placement.corner,
    style,
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  };
}
