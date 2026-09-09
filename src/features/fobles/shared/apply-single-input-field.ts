import { FOBLES } from "../constants";
import type { FobleConfigBase, FobleStrategy } from "../foble.types";
import { buildFobleUrl, createFobleButton } from "../helper";
import { applyButtonClasses } from "./apply-button-classes";
import { hideWithStyledSpacer } from "./hide-with-styled-spacer";

export type SingleInputFieldOptions = {
  actionPrefix: string;
  buttonClass: string;
  wrapperClass: string;
  getTarget: (value: string) => string | null;
};

const hasActionPrefix = (
  input: HTMLInputElement,
  actionPrefix: string,
): boolean => {
  const fieldCell = input.closest(FOBLES.SELECTORS.FIELD_CELL);
  return Array.from(fieldCell?.querySelectorAll(FOBLES.SELECTORS.FIELD_ACTION) ?? [])
    .some((button) =>
      (button.getAttribute("onclick") ?? "")
        .toLowerCase()
        .includes(`${actionPrefix.toLowerCase()}:`),
    );
};

const hideFieldActions = (input: HTMLInputElement): void => {
  const actions = input
    .closest(FOBLES.SELECTORS.FIELD_CELL)
    ?.querySelector<HTMLElement>(FOBLES.SELECTORS.FIELD_ACTIONS);
  if (actions) hideWithStyledSpacer(actions);
};

export function applySingleInputFieldStrategy<TStrategy extends FobleStrategy>(
  doc: Document,
  config: FobleConfigBase<TStrategy>,
  options: SingleInputFieldOptions,
): void {
  doc.querySelectorAll<HTMLInputElement>(config.FobleTopSelector).forEach((input) => {
    if (
      input.hasAttribute(FOBLES.ATTRIBUTES.MARKER) ||
      !hasActionPrefix(input, options.actionPrefix)
    ) return;

    input.setAttribute(FOBLES.ATTRIBUTES.MARKER, "1");
    hideFieldActions(input);

    const value = input.value.trim();
    const target = options.getTarget(value);
    if (!target) return;

    const wrapper = doc.createElement("span");
    wrapper.setAttribute(FOBLES.ATTRIBUTES.WRAPPER, "1");
    wrapper.setAttribute(FOBLES.ATTRIBUTES.STRATEGY, config.strategy);
    wrapper.classList.add(
      FOBLES.CLASSES.WRAPPERS.BASE,
      FOBLES.CLASSES.WRAPPERS.STACKED,
      options.wrapperClass,
    );

    const button = createFobleButton(
      doc,
      config.getButtonText?.(input, value) ?? value,
      buildFobleUrl(target),
      {
        classNames: [
          FOBLES.CLASSES.BUTTONS.BASE,
          options.buttonClass,
        ],
      },
    );
    applyButtonClasses(button);
    wrapper.appendChild(button);

    input.classList.add(FOBLES.CLASSES.HIDDEN);
    input.after(wrapper);
  });
}