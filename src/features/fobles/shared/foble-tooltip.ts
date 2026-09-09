import { FOBLES } from "../constants";

const tooltips = new WeakMap<Document, HTMLDivElement>();
const tooltipDismissListeners = new WeakSet<Document>();

const getOrCreateTooltip = (doc: Document): HTMLDivElement => {
  const existing = tooltips.get(doc);
  if (existing?.isConnected) return existing;

  const tooltip = doc.createElement("div");
  tooltip.className = FOBLES.CLASSES.TOOLTIP.BASE;
  tooltip.setAttribute("role", "tooltip");
  tooltip.hidden = true;
  doc.body.appendChild(tooltip);
  tooltips.set(doc, tooltip);
  return tooltip;
};

const positionTooltip = (
  button: HTMLElement,
  tooltip: HTMLDivElement,
  event?: PointerEvent,
): void => {
  const view = button.ownerDocument.defaultView;
  if (!view) return;

  const buttonRect = button.getBoundingClientRect();
  const preferredLeft = event?.clientX ?? buttonRect.left;
  const preferredTop = event?.clientY ?? buttonRect.bottom;
  const left = Math.min(
    Math.max(preferredLeft + 12, 8),
    view.innerWidth - tooltip.offsetWidth - 8,
  );
  const below = preferredTop + 18;
  const top = below + tooltip.offsetHeight <= view.innerHeight
    ? below
    : Math.max(buttonRect.top - tooltip.offsetHeight - 8, 8);
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
};

const populateTooltip = (doc: Document, tooltip: HTMLDivElement): void => {
  const primary = doc.createElement("span");
  primary.className = FOBLES.CLASSES.TOOLTIP.PRIMARY;
  primary.textContent = FOBLES.TEXT.TOOLTIP.PRIMARY;
  const secondary = doc.createElement("span");
  secondary.className = FOBLES.CLASSES.TOOLTIP.SECONDARY;
  secondary.textContent = FOBLES.TEXT.TOOLTIP.SECONDARY;
  tooltip.replaceChildren(primary, secondary);
};

export function hideFobleTooltip(doc: Document): void {
  removeFobleTooltips(doc);
}

export function removeFobleTooltips(doc: Document): void {
  doc.querySelectorAll(`.${FOBLES.CLASSES.TOOLTIP.BASE}`).forEach((tooltip) => {
    tooltip.remove();
  });
  tooltips.delete(doc);
}

const listenForTooltipDismissal = (doc: Document): void => {
  if (tooltipDismissListeners.has(doc)) return;

  doc.addEventListener("pointermove", (event) => {
    const target = event.target as Element | null;
    if (!target?.closest(FOBLES.SELECTORS.BUTTON)) {
      hideFobleTooltip(doc);
    }
  });
  tooltipDismissListeners.add(doc);
};

export function attachFobleTooltip(button: HTMLElement): void {
  button.removeAttribute("title");
  listenForTooltipDismissal(button.ownerDocument);

  const show = (event?: PointerEvent): void => {
    const doc = button.ownerDocument;
    const tooltip = getOrCreateTooltip(doc);
    populateTooltip(doc, tooltip);
    tooltip.hidden = false;
    positionTooltip(button, tooltip, event);
  };
  const hide = (): void => {
    hideFobleTooltip(button.ownerDocument);
  };

  button.addEventListener("pointerenter", (event) => show(event));
  button.addEventListener("pointermove", (event) => {
    const tooltip = tooltips.get(button.ownerDocument);
    if (tooltip && !tooltip.hidden) positionTooltip(button, tooltip, event);
  });
  button.addEventListener("pointerleave", hide);
  button.addEventListener("focus", () => show());
  button.addEventListener("blur", hide);
  button.addEventListener("click", hide);
}