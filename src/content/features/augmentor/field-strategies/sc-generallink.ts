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

  // General Link's Media picker resolves to a path relative to the media library root (e.g.
  // "/Fobles Testing/Jpeg A"), omitting the "/sitecore/media library" prefix every other link
  // type's resolved value includes - the other link types (External/Anchor/Email/JavaScript)
  // never render as a bare leading-slash path, so this is unambiguous.
  if (/^\//.test(trimmed)) {
    return ensurePathShape(trimmed, "media");
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