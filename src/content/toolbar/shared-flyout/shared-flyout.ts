import type { ToolbarContext } from "../types";


export function createFlyoutTrigger(
  context: ToolbarContext,
  button: HTMLButtonElement,
  triggerClass: string,
  onHover: { open: () => void; scheduleClose: () => void; }): HTMLDivElement {
  const trigger = context.doc.createElement("div");
  trigger.className = triggerClass;
  trigger.appendChild(button);
  trigger.addEventListener("mouseenter", onHover.open);
  trigger.addEventListener("mouseleave", onHover.scheduleClose);
  return trigger;
}
