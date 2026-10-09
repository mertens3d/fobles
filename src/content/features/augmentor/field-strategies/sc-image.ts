import { FOBLES } from "../../../../constants/fobles";
import { CONST } from "../../../../constants/const";
import { ensurePathShape } from "../helper";
import type { ImageFobles as ImageConfig } from "../fobles.types";
import { applySingleInputFieldStrategy } from "../shared/apply-single-input-field";

export function applyImageStrategy(doc: Document, config: ImageConfig): void {
  applySingleInputFieldStrategy(doc, config, {
    actionPrefix: CONST.SITECORE.ACTION_PREFIXES.IMAGE,
    buttonClass: FOBLES.CLASSES.BUTTONS.IMAGE,
    wrapperClass: FOBLES.CLASSES.WRAPPERS.IMAGE,
    getTarget: (value) => value ? ensurePathShape(value, "media") : null,
  });
}