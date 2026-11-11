import type { ReferenceModelNode } from "../../../foundation/reference-data/model/reference-model.types";

export type DetailRow = [string, string];

export type DiagnosticReferenceModelNode = Omit<ReferenceModelNode, "children" | "provenance" | "scItem"> & {
  scItem?: object;
  children: string;
  provenance: string;
  childCount: number;
};
