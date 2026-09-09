import { FOBLES } from "../constants";
import type { TemplatePathFoble as TemplatePathConfig } from "../foble.types";
import { buildFobleUrl, createFobleButton } from "../helper";

export function applyTemplatePathStrategy(
  doc: Document,
  config: TemplatePathConfig,
): void {
  doc.querySelectorAll<HTMLElement>(config.FobleTopSelector).forEach((element) => {
    if (element.hasAttribute(FOBLES.ATTRIBUTES.MARKER)) return;

    const text = element.textContent?.trim() ?? "";
    const pathStart = text.indexOf("/sitecore/");
    if (pathStart < 0) return;

    const target = text.slice(pathStart);
    const wrapper = doc.createElement("span");
    wrapper.setAttribute(FOBLES.ATTRIBUTES.WRAPPER, "1");
    wrapper.setAttribute(FOBLES.ATTRIBUTES.STRATEGY, config.strategy);
    wrapper.classList.add(
      FOBLES.CLASSES.WRAPPERS.BASE,
      FOBLES.CLASSES.WRAPPERS.TEMPLATE_PATH,
    );
    wrapper.appendChild(createFobleButton(doc, target, buildFobleUrl(target), {
      classNames: [
        FOBLES.CLASSES.BUTTONS.BASE,
        FOBLES.CLASSES.BUTTONS.TEMPLATE_PATH,
      ],
    }));

    element.setAttribute(FOBLES.ATTRIBUTES.MARKER, "1");
    element.after(wrapper);
  });
}