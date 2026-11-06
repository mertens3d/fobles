import { showFoblesErrorDialog } from "../../../shared/error-dialog.ts";
import { TEMPLATE_BASES_RESTORATION_ERROR_CODE } from "../../foundation/harvesting/coordinator/template-bases-lease.const.ts";
import { STRUCTURAL_RESTORATION_WARNING } from "./structural-error.const.ts";

function hasRestorationFailure(error: unknown, seen = new Set<object>()): boolean {
  let found = false;
  if (typeof error === "object" && error !== null && !seen.has(error)) {
    seen.add(error);
    if ("code" in error && error.code === TEMPLATE_BASES_RESTORATION_ERROR_CODE) {
      found = true;
    } else if (Array.isArray(error)) {
      found = error.some((cause: unknown) => hasRestorationFailure(cause, seen));
    } else {
      found = ("cause" in error && hasRestorationFailure(error.cause, seen)) ||
        ("errors" in error && hasRestorationFailure(error.errors, seen));
    }
  }
  return found;
}

export function handleStructuralDiscoveryError(error: unknown, doc: Document = document): void {
  if (hasRestorationFailure(error)) {
    showFoblesErrorDialog(doc, {
      title: STRUCTURAL_RESTORATION_WARNING.TITLE,
      messagePublicFacing: STRUCTURAL_RESTORATION_WARNING.MESSAGE,
    });
  }
}