import { CLASS, SELECTORS, type ToolbarCorner, type ToolbarPlacement } from "../constants";
import type { ToolbarContext } from "./types";

const draggableContainers = new WeakSet<HTMLElement>();
const MIN_EDGE_MARGIN = 4;
const RESIZE_SETTLE_DELAY_MS = 200;

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        `button, a, input, select, textarea, [role='button'], ${SELECTORS.QUICK_MENU}, ${SELECTORS.PROXY_BUTTONS}`,
      ),
    )
  );
}

function clampOffset(value: number, maxOffset: number): number {
  const upperBound = Math.max(maxOffset, MIN_EDGE_MARGIN);
  return Math.min(Math.max(value, MIN_EDGE_MARGIN), upperBound);
}

function clampPlacement(
  container: HTMLElement,
  win: Window,
  placement: ToolbarPlacement,
): ToolbarPlacement {
  const rect = container.getBoundingClientRect();
  return {
    corner: placement.corner,
    offsetX: clampOffset(placement.offsetX, win.innerWidth - rect.width - MIN_EDGE_MARGIN),
    offsetY: clampOffset(placement.offsetY, win.innerHeight - rect.height - MIN_EDGE_MARGIN),
  };
}

function computeNearestCornerPlacement(
  container: HTMLElement,
  win: Window,
): ToolbarPlacement {
  const rect = container.getBoundingClientRect();
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

  const nearestCorner = candidates.reduce((closest, candidate) => {
    const distance = Math.hypot(candidate.x - centroidX, candidate.y - centroidY);
    return distance < closest.distance
      ? { corner: candidate.corner, distance }
      : closest;
  }, { corner: candidates[0].corner, distance: Infinity }).corner;

  return clampPlacement(container, win, {
    corner: nearestCorner,
    offsetX: nearestCorner.endsWith("right") ? width - rect.right : rect.left,
    offsetY: nearestCorner.startsWith("bottom") ? height - rect.bottom : rect.top,
  });
}

export function applyToolbarPlacement(
  container: HTMLElement,
  win: Window,
  placement: ToolbarPlacement,
): void {
  const clamped = clampPlacement(container, win, placement);
  container.dataset.position = clamped.corner;
  const isBottom = clamped.corner.startsWith("bottom");
  const isRight = clamped.corner.endsWith("right");

  container.style.top = isBottom ? "auto" : `${clamped.offsetY}px`;
  container.style.bottom = isBottom ? `${clamped.offsetY}px` : "auto";
  container.style.left = isRight ? "auto" : `${clamped.offsetX}px`;
  container.style.right = isRight ? `${clamped.offsetX}px` : "auto";
}

export function wireContainerDragging(
  context: ToolbarContext,
  container: HTMLElement,
): void {
  if (draggableContainers.has(container)) return;
  draggableContainers.add(container);

  let startClientX = 0;
  let startClientY = 0;
  let startLeft = 0;
  let startTop = 0;

  container.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || isInteractiveTarget(event.target)) return;
    event.preventDefault();
    const rect = container.getBoundingClientRect();
    startClientX = event.clientX;
    startClientY = event.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    container.setPointerCapture(event.pointerId);
    container.classList.add(CLASS.TOOLBAR_DRAGGING);
  });

  container.addEventListener("pointermove", (event) => {
    if (!container.classList.contains(CLASS.TOOLBAR_DRAGGING)) return;
    const rect = container.getBoundingClientRect();
    const maxLeft = context.win.innerWidth - rect.width - MIN_EDGE_MARGIN;
    const maxTop = context.win.innerHeight - rect.height - MIN_EDGE_MARGIN;
    const nextLeft = clampOffset(startLeft + (event.clientX - startClientX), maxLeft);
    const nextTop = clampOffset(startTop + (event.clientY - startClientY), maxTop);
    container.style.left = `${nextLeft}px`;
    container.style.top = `${nextTop}px`;
    container.style.right = "auto";
    container.style.bottom = "auto";
  });

  const endDrag = (event: PointerEvent): void => {
    if (!container.classList.contains(CLASS.TOOLBAR_DRAGGING)) return;
    container.releasePointerCapture(event.pointerId);
    container.classList.remove(CLASS.TOOLBAR_DRAGGING);
    const placement = computeNearestCornerPlacement(container, context.win);
    applyToolbarPlacement(container, context.win, placement);
    context.setPlacement(placement);
  };

  container.addEventListener("pointerup", endDrag);
  container.addEventListener("pointercancel", endDrag);

  let resizeSettleTimer: number | null = null;

  context.win.addEventListener("resize", () => {
    if (container.classList.contains(CLASS.TOOLBAR_DRAGGING)) return;

    if (resizeSettleTimer === null) {
      container.classList.add(CLASS.TOOLBAR_RESIZING);
    } else {
      context.win.clearTimeout(resizeSettleTimer);
    }

    resizeSettleTimer = context.win.setTimeout(() => {
      resizeSettleTimer = null;
      const corner = (container.dataset.position as ToolbarCorner) ?? context.placement.corner;
      const rect = container.getBoundingClientRect();
      const currentPlacement: ToolbarPlacement = {
        corner,
        offsetX: corner.endsWith("right") ? context.win.innerWidth - rect.right : rect.left,
        offsetY: corner.startsWith("bottom") ? context.win.innerHeight - rect.bottom : rect.top,
      };
      applyToolbarPlacement(container, context.win, currentPlacement);
      container.classList.remove(CLASS.TOOLBAR_RESIZING);
    }, RESIZE_SETTLE_DELAY_MS);
  });
}
