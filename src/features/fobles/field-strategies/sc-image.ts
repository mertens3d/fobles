import { FOBLES } from "../constants";
import { ensurePathShape } from "../helper";
import type { ImageFoble as ImageConfig } from "../foble.types";
import { applySingleInputFieldStrategy } from "../shared/apply-single-input-field";

export function applyImageStrategy(doc: Document, config: ImageConfig): void {
  applySingleInputFieldStrategy(doc, config, {
    actionPrefix: FOBLES.SITECORE.ACTION_PREFIXES.IMAGE,
    buttonClass: FOBLES.CLASSES.BUTTONS.IMAGE,
    wrapperClass: FOBLES.CLASSES.WRAPPERS.IMAGE,
    getTarget: (value) => value ? ensurePathShape(value, "media") : null,
  });
}