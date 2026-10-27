// @source-path [fobles] src/content/shared/ui/json-tree/json-tree.tsx
import { useState } from "react";
import { JSON_TREE } from "./json-tree.const";
import { getJsonEntries, previewJson } from "./json-tree-preview";
import type { JsonPrimitiveProps, JsonTreeNodeProps, JsonTreeProps } from "./json-tree.types";

function JsonPrimitive({ value }: JsonPrimitiveProps) {
  const [showAll, setShowAll] = useState(false);
  let content;
  if (typeof value === "string") {
    const truncated = !showAll && value.length > JSON_TREE.MAX_INLINE_STRING_CHARS;
    content = (
      <>
        <span className={JSON_TREE.CLASS.STRING}>{`"${truncated ? value.slice(0, JSON_TREE.MAX_INLINE_STRING_CHARS) : value}"`}</span>
        {truncated ? (
          <button type="button" className={JSON_TREE.CLASS.MORE} onClick={() => setShowAll(true)}>
            {`\u2026 ${value.length - JSON_TREE.MAX_INLINE_STRING_CHARS} more chars, ${JSON_TREE.TEXT.SHOW_ALL}`}
          </button>
        ) : null}
      </>
    );
  } else if (typeof value === "number") {
    content = <span className={JSON_TREE.CLASS.NUMBER}>{String(value)}</span>;
  } else {
    content = <span className={JSON_TREE.CLASS.LITERAL}>{String(value)}</span>;
  }
  return content;
}

function JsonTreeNode({ name, value, depth, defaultOpenDepth }: JsonTreeNodeProps) {
  const entries = getJsonEntries(value);
  const [open, setOpen] = useState(depth < defaultOpenDepth);
  const nameElement = name === undefined ? null : <><span className={JSON_TREE.CLASS.KEY}>{name}</span>{":"}</>;
  let node;
  if (!entries) {
    node = (
      <div className={JSON_TREE.CLASS.LINE}>
        <span className={JSON_TREE.CLASS.SPACER} />
        {nameElement}
        <JsonPrimitive value={value} />
      </div>
    );
  } else if (entries.length === 0) {
    node = (
      <div className={JSON_TREE.CLASS.LINE}>
        <span className={JSON_TREE.CLASS.SPACER} />
        {nameElement}
        <span className={JSON_TREE.CLASS.LITERAL}>{Array.isArray(value) ? JSON_TREE.TEXT.EMPTY_ARRAY : JSON_TREE.TEXT.EMPTY_OBJECT}</span>
      </div>
    );
  } else {
    const label = Array.isArray(value) ? `Array(${entries.length})` : JSON_TREE.TEXT.OBJECT_LABEL;
    node = (
      <div>
        <div className={JSON_TREE.CLASS.LINE}>
          <button
            type="button"
            className={JSON_TREE.CLASS.TOGGLE}
            aria-expanded={open}
            aria-label={open ? JSON_TREE.TEXT.COLLAPSE : JSON_TREE.TEXT.EXPAND}
            onClick={() => setOpen(!open)}
          >
            {open ? JSON_TREE.GLYPH.OPEN : JSON_TREE.GLYPH.CLOSED}
          </button>
          {nameElement}
          <span className={JSON_TREE.CLASS.SUMMARY} onClick={() => setOpen(!open)}>
            {open ? label : previewJson(value)}
          </span>
        </div>
        {open ? (
          <div className={JSON_TREE.CLASS.CHILDREN}>
            {entries.map(([childName, childValue]) => (
              <JsonTreeNode key={childName} name={childName} value={childValue} depth={depth + 1} defaultOpenDepth={defaultOpenDepth} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }
  return node;
}

export function JsonTree({ value, defaultOpenDepth = JSON_TREE.DEFAULT_OPEN_DEPTH }: JsonTreeProps) {
  return (
    <div className={JSON_TREE.CLASS.ROOT}>
      <JsonTreeNode name={undefined} value={value} depth={0} defaultOpenDepth={defaultOpenDepth} />
    </div>
  );
}
