// @source-path [fobles] src/content/toolbar/jump-flyout/jump-flyout-column.tsx

import { CLASS } from "../../../constants/fobles.constants";
import type { FlyoutGroup } from "../../../constants/FlyoutOption";
import { JumpFlyoutGroup } from "./jump-flyout-group";

export type JumpFlyoutColumnProps = {
  doc: Document;
  groups: readonly FlyoutGroup[];
  onOptionActivated: () => void;
  title?: string;
  children?: React.ReactNode;
};

export function JumpFlyoutColumn({ doc, groups, onOptionActivated, title, children }: JumpFlyoutColumnProps) {
  return (
    <div className={CLASS.JUMP_FLYOUT.COLUMN}>
      {title && <div className={CLASS.JUMP_FLYOUT.COLUMN_TITLE}>{title}</div>}
      {groups.map((group, index) => (
        <JumpFlyoutGroup key={group.title ?? index} doc={doc} group={group} onOptionActivated={onOptionActivated} />
      ))}
      {children}
    </div>
  );
}
