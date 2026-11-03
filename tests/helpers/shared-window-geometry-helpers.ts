import { expect, type Locator } from "@playwright/test";

export type BoundingBoxRect = { x: number; y: number; width: number; height: number };

const BOX_PROPERTIES = ["x", "y", "width", "height"] as const;

type BoxProperty = (typeof BOX_PROPERTIES)[number];

// Playwright's boundingBox() returns null for a detached/hidden element - callers doing geometry
// math want a guaranteed box, not a null-check repeated at every call site.
export async function getRequiredBoundingBox(locator: Locator, label: string): Promise<BoundingBoxRect> {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`Expected ${label} to have a bounding box.`);
  }
  return box;
}

// Shared FoblesWindow drag/resize/collapse/maximize specs all assert "this box stayed close to
// that box" on some subset of x/y/width/height - centralizing it keeps per-spec tolerance/props
// consistent instead of each spec re-deriving its own toBeCloseTo calls.
export function expectBoxClose(
  actual: BoundingBoxRect,
  expected: BoundingBoxRect,
  properties: readonly BoxProperty[] = BOX_PROPERTIES,
): void {
  for (const property of properties) {
    expect(
      actual[property],
      `Expected box.${property} (${actual[property]}) to stay close to ${expected[property]}`,
    ).toBeCloseTo(expected[property], 0);
  }
}
