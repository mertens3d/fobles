import { FOBLES } from "../constants";
import type { StyleChecklistFobles as StyleChecklistConfig } from "../fobles.types";
import { createFoblesItemButton } from "../shared/create-fobles-item-button";
import { createFoblesWrapper } from "../shared/create-fobles-wrapper";
import { formatFoId } from "../shared/guid";

export function applyStyleChecklistStrategy(doc: Document, config: StyleChecklistConfig): void {
  doc.querySelectorAll<HTMLInputElement>(config.FoblesTopSelector).forEach((checkbox) => {
    if (checkbox.hasAttribute(FOBLES.ATTRIBUTES.MARKER)) return;

    const styleId = checkbox.getAttribute("styleid");
    const container = checkbox.closest(".style-selector");
    if (!styleId || !container) return;

    checkbox.setAttribute(FOBLES.ATTRIBUTES.MARKER, "1");

    const label = checkbox.value.trim() || checkbox.closest("label")?.textContent?.trim() || styleId;
    const wrapper = createFoblesWrapper(doc, {
      tag: "span",
      strategy: config.strategy,
      classNames: [FOBLES.CLASSES.WRAPPERS.ROW],
    });
    // Appended as the label's sibling, not a descendant of it - a native <label> toggles its
    // checkbox on any click inside it, which would fire on this button too if it lived inside.
    wrapper.appendChild(createFoblesItemButton(doc, label, formatFoId(styleId), FOBLES.CLASSES.BUTTONS.STYLE_CHECKLIST));
    container.appendChild(wrapper);
  });
}
