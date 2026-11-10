import type { Locator } from "@playwright/test";
import type { MouseCoordinates } from "./mouse-proxy.types";


export type HoverAndSlideOutOptions = {
  name: string;
  hoverTarget: Locator;
  flyoutTarget: Locator;
  hoverRegion: Locator | Locator[];
  mousePosition: MouseCoordinates;
};
