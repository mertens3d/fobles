import { FOBLES } from "../../../../constants/fobles";
import type { FoblesStrategy } from "../fobles.types";

export type CreateFoblesWrapperOptions = {
  strategy: FoblesStrategy;
  classNames: readonly string[];
  tag?: "div" | "span";
  cssHeightProperty?: string;
  height?: number;
  pane?: string;
};

// Every field strategy's "wrapper" element is tagged/classed identically; only the tag,
// variant classes, and an optional measured height differ per strategy.
export const createFoblesWrapper = (
  doc: Document,
  options: CreateFoblesWrapperOptions,
): HTMLElement => {
  const wrapper = doc.createElement(options.tag ?? "div");
  wrapper.setAttribute(FOBLES.ATTRIBUTES.WRAPPER, "1");
  wrapper.setAttribute(FOBLES.ATTRIBUTES.STRATEGY, options.strategy);
  if (options.pane) wrapper.setAttribute(FOBLES.ATTRIBUTES.PANE, options.pane);
  wrapper.classList.add(FOBLES.CLASSES.WRAPPERS.BASE, ...options.classNames);
  if (options.cssHeightProperty && options.height !== undefined) {
    wrapper.style.setProperty(options.cssHeightProperty, `${options.height}px`);
  }
  return wrapper;
};
