// @source-path [fobles] src/content/sitecore-harvester/harvest-session.types.ts

import type { BooleanTripleState } from "../macros/ribbon-toggle-macro";

export type HarvestEditorState = {
  rawValues: BooleanTripleState;
  standardFields: BooleanTripleState;
};

export type HarvestSession = {
  requestId: string;
  originalEditorState: HarvestEditorState;
};