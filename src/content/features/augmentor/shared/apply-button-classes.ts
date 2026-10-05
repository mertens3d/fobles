import { FOBLES } from "../../../../constants/fobles";

export function applyButtonClasses(
  button: HTMLButtonElement,
  options?: { compact?: boolean },
): void {
  button.classList.add(FOBLES.CLASSES.BUTTONS.ACTION);
  if (options?.compact) {
    button.classList.add(FOBLES.CLASSES.BUTTONS.ACTION_COMPACT);
  }
}