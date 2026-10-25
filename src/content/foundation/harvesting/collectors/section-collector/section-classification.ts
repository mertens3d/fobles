// @source-path [fobles] src/content/foundation/harvesting/collectors/section-collector/section-classification.ts

import { CONST } from "../../../../../constants/const";

// Standard Template sections (Appearance, Security, ...) go to the Standard Fields crop; every
// other rendered section goes to the ordinary Fields crop. Never driven by
// .scEditorFieldLabelAdministrator, "[standard value]" text, field names, or inheritance state -
// those describe where a FIELD'S VALUE comes from, not which section it lives in.
export function isStandardSectionName(name: string): boolean {
  return CONST.SITECORE.HARVEST.STANDARD_SECTION_NAMES_LC.has(name.trim().toLowerCase());
}
