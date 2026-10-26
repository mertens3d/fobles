// @source-path [fobles] src/content/foundation/harvesting/harvest-session.types.ts

import type { BooleanTripleState } from "../sitecore/macros/ribbon-toggle-macro";

export type HarvestEditorState = {
  rawValues: BooleanTripleState;
  standardFields: BooleanTripleState;
};

export type HarvestSession = {
  requestId: string;
  originalEditorState: HarvestEditorState;
};