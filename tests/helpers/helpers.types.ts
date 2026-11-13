import type { Locator } from "@playwright/test";
import type { BOX_PROPERTIES } from "./helpers.const";

export type BoundingBoxRect = { x: number; y: number; width: number; height: number };

export type FoblesStep = (
  title: string,
  body: (fullTitle: string) => Promise<void>,
  options?: { timeout?: number; screenshot?: boolean },
) => Promise<void>;

export type HoverAndGrowOptions = {
  name: string;
  hoverTarget: Locator;
  measureTarget: Locator;
  moveAwayTargets: Locator | Locator[];
  mousePosition: MouseCoordinates;
};

export type HoverAndSlideOutOptions = {
  name: string;
  hoverTarget: Locator;
  flyoutTarget: Locator;
  hoverRegion: Locator | Locator[];
  mousePosition: MouseCoordinates;
};

export type MouseCoordinates = { x: number; y: number };

export type ToolbarCorner = "upper-left" | "upper-right" | "bottom-right" | "bottom-left";

export type CornerPosition = { corner: ToolbarCorner; offsetX: number; offsetY: number };

export type BoxProperty = (typeof BOX_PROPERTIES)[number];

export type SitecoreSearchParams = { fo: string | null };
