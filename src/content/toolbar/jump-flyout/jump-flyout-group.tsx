// @source-path [fobles] src/content/toolbar/jump-flyout/jump-flyout-group.tsx

import { CLASS } from "../../../constants/fobles.constants";
import type { FlyoutGroup } from "../../../constants/constants.types";
import { JumpFlyoutOptionButton } from "./jump-flyout-option-button";

export type JumpFlyoutGroupProps = { doc: Document; group: FlyoutGroup; onOptionActivated: () => void };

export function JumpFlyoutGroup({ doc, group, onOptionActivated }: JumpFlyoutGroupProps) {
  return (
    <div className={CLASS.JUMP_FLYOUT.GROUP}>
      {group.title && <div className={CLASS.JUMP_FLYOUT.GROUP_TITLE}>{group.title}</div>}
      <div className={CLASS.JUMP_FLYOUT.ACTIONS}>
        {group.groupMembers
          .filter((option) => !option.isIncomplete)
          .map((option) => (
            <JumpFlyoutOptionButton key={option.id} doc={doc} option={option} onOptionActivated={onOptionActivated} />
          ))}
      </div>
    </div>
  );
}
