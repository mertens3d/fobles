// @source-path [fobles] src/content/features/reference-graph/graph-viewport-settings.ts

import type cytoscape from "cytoscape";
import {
  getStorageValue,
  setStorageValue,
} from "../../../shared/storage/storage";

const STORAGE_KEY =
  "fobles-reference-graph-viewport";

type GraphViewportState = {
  rootItemId: string;
  zoom: number;
  center: {
    x: number;
    y: number;
  };
};

function isGraphViewportState(
  value: unknown,
): value is GraphViewportState {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const candidate =
    value as Partial<GraphViewportState>;

  return (
    typeof candidate.rootItemId === "string" &&
    typeof candidate.zoom === "number" &&
    Number.isFinite(candidate.zoom) &&
    typeof candidate.center === "object" &&
    candidate.center !== null &&
    typeof candidate.center.x === "number" &&
    Number.isFinite(candidate.center.x) &&
    typeof candidate.center.y === "number" &&
    Number.isFinite(candidate.center.y)
  );
}

export async function getGraphViewportState():
  Promise<GraphViewportState | undefined> {
  const values =
    await getStorageValue<unknown>(
      [STORAGE_KEY],
      "local",
    );

  const value = values[STORAGE_KEY];

  return isGraphViewportState(value)
    ? value
    : undefined;
}

export async function saveGraphViewportState(
  cy: cytoscape.Core,
  rootItemId: string,
): Promise<void> {
  if (cy.destroyed()) {
    return;
  }

  const zoom = cy.zoom();
  const pan = cy.pan();

  const state: GraphViewportState = {
    rootItemId,
    zoom,
    center: {
      x: (cy.width() / 2 - pan.x) / zoom,
      y: (cy.height() / 2 - pan.y) / zoom,
    },
  };

  await setStorageValue(
    {
      [STORAGE_KEY]: state,
    },
    "local",
  );
}

export function restoreGraphViewportState(
  cy: cytoscape.Core,
  rootItemId: string,
  state: GraphViewportState | undefined,
): boolean {
  let restored = false;

  if (
    state &&
    state.rootItemId === rootItemId &&
    !cy.destroyed()
  ) {
    const zoom = Math.min(
      cy.maxZoom(),
      Math.max(
        cy.minZoom(),
        state.zoom,
      ),
    );

    cy.zoom(zoom);

    cy.pan({
      x:
        cy.width() / 2 -
        state.center.x * zoom,
      y:
        cy.height() / 2 -
        state.center.y * zoom,
    });

    restored = true;
  }

  return restored;
}