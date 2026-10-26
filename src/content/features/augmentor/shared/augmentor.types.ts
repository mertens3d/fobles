import type { FoblesStrategy } from "../../../foundation/sitecore/fobles-strategy.types";

export type CreateFoblesWrapperOptions = {
  strategy: FoblesStrategy;
  classNames: readonly string[];
  tag?: "div" | "span";
  cssHeightProperty?: string;
  height?: number;
  pane?: string;
};

export type FrameDocumentOptions = {
  skipMenuOwned?: boolean;
};

export type MeasureFoblesPaneHeightOptions = {
  shrinkBy?: number;
};

export type { SingleInputFieldOptions } from "../fobles.types";
