import type { Page } from "../../fixtures/playwright";
import { CONST } from "../../CONST";
import type { MouseCoordinates } from "../mouse-proxy.types";

export async function drawMousePath(
  page: Page,
  startPosition: MouseCoordinates,
  targetPosition: MouseCoordinates,
): Promise<void> {
  await page.evaluate(
    ({ startX, startY, endX, endY, config }) => {
      const svg =
        (document.getElementById(
          config.DEBUG_LINE_ID,
        ) as SVGSVGElement | null) ??
        (document.createElementNS(
          config.SVG_NAMESPACE,
          config.TAGS.SVG,
        ) as SVGSVGElement);

      svg.id = config.DEBUG_LINE_ID;
      svg.style.position = config.VIEWPORT_STYLE.POSITION;
      svg.style.left = config.VIEWPORT_STYLE.LEFT;
      svg.style.top = config.VIEWPORT_STYLE.TOP;
      svg.style.width = config.VIEWPORT_STYLE.WIDTH;
      svg.style.height = config.VIEWPORT_STYLE.HEIGHT;
      svg.style.pointerEvents = config.VIEWPORT_STYLE.POINTER_EVENTS;
      svg.style.zIndex = config.VIEWPORT_STYLE.Z_INDEX;
      svg.style.opacity = String(config.OPACITY);

      const line = document.createElementNS(
        config.SVG_NAMESPACE,
        config.TAGS.LINE,
      ) as SVGLineElement;

      line.setAttribute(config.LINE_ATTRIBUTES.X1, String(startX));
      line.setAttribute(config.LINE_ATTRIBUTES.Y1, String(startY));
      line.setAttribute(config.LINE_ATTRIBUTES.X2, String(endX));
      line.setAttribute(config.LINE_ATTRIBUTES.Y2, String(endY));
      line.setAttribute(config.LINE_ATTRIBUTES.STROKE, config.COLOR);
      line.setAttribute(
        config.LINE_ATTRIBUTES.STROKE_WIDTH,
        config.STROKE_WIDTH,
      );

      line.dataset.startX = String(startX);
      line.dataset.startY = String(startY);

      const endCircle = document.createElementNS(
        config.SVG_NAMESPACE,
        config.TAGS.CIRCLE,
      ) as SVGCircleElement;

      endCircle.setAttribute(config.ENDPOINT_ATTRIBUTES.CX, String(endX));
      endCircle.setAttribute(config.ENDPOINT_ATTRIBUTES.CY, String(endY));
      endCircle.setAttribute(
        config.ENDPOINT_ATTRIBUTES.RADIUS,
        config.ENDPOINT_RADIUS,
      );
      endCircle.setAttribute(
        config.ENDPOINT_ATTRIBUTES.FILL,
        config.ENDPOINT_FILL,
      );

      svg.replaceChildren(line, endCircle);
      document.documentElement.appendChild(svg);
    },
    {
      startX: startPosition.x,
      startY: startPosition.y,
      endX: targetPosition.x,
      endY: targetPosition.y,
      config: CONST.TESTING.MOUSE.PATH,
    },
  );
}

export async function updateMousePath(
  page: Page,
  progress: number,
): Promise<void> {
  await page.evaluate(
    ({ progress, config }) => {
      const svg = document.getElementById(
        config.DEBUG_LINE_ID,
      ) as SVGSVGElement | null;

      if (!svg) return;

      const line = svg.querySelector("line");

      if (!line) return;

      const fadeStart = 0.8;

      if (progress <= fadeStart) return;

      const disappearProgress = (progress - fadeStart) / (1 - fadeStart);

      const startX = Number(line.dataset.startX);
      const startY = Number(line.dataset.startY);
      const endX = Number(line.getAttribute("x2"));
      const endY = Number(line.getAttribute("y2"));

      const currentX = startX + (endX - startX) * disappearProgress;

      const currentY = startY + (endY - startY) * disappearProgress;

      line.setAttribute("x1", String(currentX));
      line.setAttribute("y1", String(currentY));

      svg.style.opacity = String(
        Number(config.OPACITY) * (1 - disappearProgress),
      );

      if (progress >= 1) {
        svg.remove();
      }
    },
    {
      progress,
      config: CONST.TESTING.MOUSE.PATH,
    },
  );
}
