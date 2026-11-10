import type { Locator } from "@playwright/test";
import type { MouseCoordinates } from "./mouse-proxy.types";

export type HoverAndGrowOptions = {
  name: string;
  hoverTarget: Locator;
  measureTarget: Locator;
  moveAwayTargets: Locator | Locator[];
  mousePosition: MouseCoordinates;
};
