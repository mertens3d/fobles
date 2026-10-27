// @source-path [fobles] src/content/shared/ui/json-tree/json-tree.types.ts
export type JsonEntry = readonly [string, unknown];

export type JsonTreeProps = {
  value: unknown;
  defaultOpenDepth?: number;
};

export type JsonTreeNodeProps = {
  name: string | undefined;
  value: unknown;
  depth: number;
  defaultOpenDepth: number;
};

export type JsonPrimitiveProps = {
  value: unknown;
};
