import { FOBLES } from "../constants";
import { SITECORE } from "../../../sitecore";
import {
  ensurePathShape,
} from "../helper";
import type { GeneralLinkFobles as GeneralLinkConfig } from "../fobles.types";
import { applySingleInputFieldStrategy } from "../shared/apply-single-input-field";
import { extractGuid } from "../shared/guid";

const getInternalTarget = (value: string): string | null => {
  const guid = extractGuid(value);
  if (guid) return guid;

  const trimmed = value.trim();
  if (/^\/?sitecore\//i.test(trimmed)) {
    return ensurePathShape(trimmed, "content");
  }

  return null;
};

export function applyGeneralLinkStrategy(
  doc: Document,
  config: GeneralLinkConfig,
): void {
  applySingleInputFieldStrategy(doc, config, {
    actionPrefix: SITECORE.ACTION_PREFIXES.GENERAL_LINK,
    buttonClass: FOBLES.CLASSES.BUTTONS.GENERAL_LINK,
    wrapperClass: FOBLES.CLASSES.WRAPPERS.GENERAL_LINK,
    getTarget: getInternalTarget,
  });
}