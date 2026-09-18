import { FOBLES } from "../constants";
import { SITECORE } from "../../../extension/sitecore";
import type { InternalLinkFobles as InternalLinkConfig } from "../fobles.types";
import { ensurePathShape } from "../helper";
import { applySingleInputFieldStrategy } from "../shared/apply-single-input-field";
import { extractGuid } from "../shared/guid";

const getInternalLinkTarget = (value: string): string | null => {
  const guid = extractGuid(value);
  if (guid) return guid;

  const trimmed = value.trim();
  return /^\/?sitecore\//i.test(trimmed)
    ? ensurePathShape(trimmed, "content")
    : null;
};

export function applyInternalLinkStrategy(
  doc: Document,
  config: InternalLinkConfig,
): void {
  applySingleInputFieldStrategy(doc, config, {
    actionPrefix: SITECORE.ACTION_PREFIXES.INTERNAL_LINK,
    buttonClass: FOBLES.CLASSES.BUTTONS.INTERNAL_LINK,
    wrapperClass: FOBLES.CLASSES.WRAPPERS.INTERNAL_LINK,
    getTarget: getInternalLinkTarget,
  });
}