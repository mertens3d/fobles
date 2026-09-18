import { FOBLES } from "../constants";
import { SITECORE } from "../../../extension/sitecore";
import { ensurePathShape } from "../helper";
import type { FileFobles as FileConfig } from "../fobles.types";
import { applySingleInputFieldStrategy } from "../shared/apply-single-input-field";

export function applyFileStrategy(doc: Document, config: FileConfig): void {
  applySingleInputFieldStrategy(doc, config, {
    actionPrefix: SITECORE.ACTION_PREFIXES.FILE,
    buttonClass: FOBLES.CLASSES.BUTTONS.FILE,
    wrapperClass: FOBLES.CLASSES.WRAPPERS.FILE,
    getTarget: (value) => value ? ensurePathShape(value, "media") : null,
  });
}