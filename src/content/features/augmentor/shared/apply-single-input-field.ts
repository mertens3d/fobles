import { FOBLES } from "../constants";
import { SITECORE } from "../../../sitecore";
import type { FoblesConfigBase, FoblesStrategy, SingleInputFieldOptions } from "../fobles.types";
import { createFoblesWrapper } from "./create-fobles-wrapper";
import { createFoblesItemButton } from "./create-fobles-item-button";
import { hideWithStyledSpacer } from "./hide-with-styled-spacer";

export type { SingleInputFieldOptions } from "../fobles.types";

const hasActionPrefix = (
  input: HTMLInputElement,
  actionPrefix: string,
): boolean => {
  const fieldCell = input.closest(SITECORE.SELECTORS.FIELD_CELL);
  return Array.from(fieldCell?.querySelectorAll(SITECORE.SELECTORS.FIELD_ACTION) ?? [])
    .some((button) =>
      (button.getAttribute("onclick") ?? "")
        .toLowerCase()
        .includes(`${actionPrefix.toLowerCase()}:`),
    );
};

const hideFieldActions = (input: HTMLInputElement): void => {
  const actions = input
    .closest(SITECORE.SELECTORS.FIELD_CELL)
    ?.querySelector<HTMLElement>(SITECORE.SELECTORS.FIELD_ACTIONS);
  if (actions) hideWithStyledSpacer(actions);
};

export function applySingleInputFieldStrategy<TStrategy extends FoblesStrategy>(
  doc: Document,
  config: FoblesConfigBase<TStrategy>,
  options: SingleInputFieldOptions,
): void {
  doc.querySelectorAll<HTMLInputElement>(config.FoblesTopSelector).forEach((input) => {
    if (
      input.hasAttribute(FOBLES.ATTRIBUTES.MARKER) ||
      !hasActionPrefix(input, options.actionPrefix)
    ) return;

    input.setAttribute(FOBLES.ATTRIBUTES.MARKER, "1");
    hideFieldActions(input);

    const value = input.value.trim();
    const target = options.getTarget(value);
    if (!target) return;

    const wrapper = createFoblesWrapper(doc, {
      tag: "span",
      strategy: config.strategy,
      classNames: [FOBLES.CLASSES.WRAPPERS.STACKED, options.wrapperClass],
    });
    const buttonText = config.getButtonText?.(input, value) ?? value;
    wrapper.appendChild(createFoblesItemButton(doc, buttonText, target, options.buttonClass));

    input.classList.add(FOBLES.CLASSES.HIDDEN);
    input.after(wrapper);
  });
}