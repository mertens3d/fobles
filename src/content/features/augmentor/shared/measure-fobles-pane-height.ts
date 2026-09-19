export type MeasureFoblesPaneHeightOptions = {
  shrinkBy?: number;
};

// Field strategies size their replacement pane off the original control's rendered height,
// with a 96px floor so an empty/collapsed control still gets a usable pane.
export const measureFoblesPaneHeight = (
  element: Element,
  options: MeasureFoblesPaneHeightOptions = {},
): number => {
  const rect = element.getBoundingClientRect();
  const baseHeight = Math.max(rect.height || (element as HTMLElement).offsetHeight || 0, 96);
  const shrunkHeight = options.shrinkBy ? baseHeight - options.shrinkBy : baseHeight;
  return Math.max(Math.ceil(shrunkHeight), 96);
};
