import { FOBLES } from "../constants";
import { ensurePathShape } from "../helper";
import type { FileFoble as FileConfig } from "../foble.types";
import { applySingleInputFieldStrategy } from "../shared/apply-single-input-field";

export function applyFileStrategy(doc: Document, config: FileConfig): void {
  applySingleInputFieldStrategy(doc, config, {
    actionPrefix: FOBLES.SITECORE.ACTION_PREFIXES.FILE,
    buttonClass: FOBLES.CLASSES.BUTTONS.FILE,
    wrapperClass: FOBLES.CLASSES.WRAPPERS.FILE,
    getTarget: (value) => value ? ensurePathShape(value, "media") : null,
  });
}