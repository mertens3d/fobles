import { FOBLES } from "../constants";
import type { ReferenceLinksFobles as ReferenceLinksConfig } from "../fobles.types";
import { buildFoblesUrl, createFoblesButton } from "../helper";
import { extractGuid } from "../shared/guid";

export function applyReferenceLinksStrategy(
  doc: Document,
  config: ReferenceLinksConfig,
): void {
  doc.querySelectorAll<HTMLAnchorElement>(config.FoblesTopSelector).forEach((anchor) => {
    if (anchor.hasAttribute(FOBLES.ATTRIBUTES.MARKER)) return;

    const target = extractGuid(anchor.getAttribute("onclick"));
    const label = anchor.textContent?.replace(/\s+/g, " ").trim() ?? "";
    if (!target || !label) return;

    const wrapper = doc.createElement("span");
    wrapper.setAttribute(FOBLES.ATTRIBUTES.WRAPPER, "1");
    wrapper.setAttribute(FOBLES.ATTRIBUTES.STRATEGY, config.strategy);
    wrapper.classList.add(
      FOBLES.CLASSES.WRAPPERS.BASE,
      FOBLES.CLASSES.WRAPPERS.REFERENCE_LINKS,
    );
    wrapper.appendChild(createFoblesButton(doc, label, buildFoblesUrl(target), {
      classNames: [
        FOBLES.CLASSES.BUTTONS.BASE,
        FOBLES.CLASSES.BUTTONS.REFERENCE_LINKS,
      ],
    }));

    anchor.classList.add(FOBLES.CLASSES.HIDDEN);
    anchor.setAttribute(FOBLES.ATTRIBUTES.MARKER, "1");
    anchor.after(wrapper);
  });
}