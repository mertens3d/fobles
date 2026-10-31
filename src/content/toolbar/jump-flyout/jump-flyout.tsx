// @source-path [fobles] src/content/toolbar/jump-flyout/jump-flyout.tsx

import { CLASS } from "../../../constants/fobles.constants";
import { TEXT } from "../../../constants/fobles.constants";
import { FOBLES } from "../../../constants/fobles";
import { ADMIN_PAGE_GROUP, AI_GROUP, APPLICATION_PAGE_GROUP, THIRD_PARTY_GROUP, TREE_JUMP_GROUP } from "../../../constants/flyout-groups";
import { JumpFlyoutColumn } from "./jump-flyout-column";
import { UserTreeJumpGroup } from "./user-tree-jump-group";
import { UserAdminPageGroup } from "./user-admin-page-group";

export type JumpFlyoutProps = {
  doc: Document;
  visible: boolean;
  onOptionActivated: () => void;
  onCancelHide: () => void;
  onScheduleHide: () => void;
};

export function JumpFlyout({ doc, visible, onOptionActivated, onCancelHide, onScheduleHide }: JumpFlyoutProps) {
  return (
    <div className={CLASS.JUMP_FLYOUT.FLYOUT} data-visible={visible ? "true" : "false"} {...{ [FOBLES.ATTRIBUTES.DATA.KEY.JUMP_FLYOUT]: "1" }} onMouseEnter={onCancelHide} onMouseLeave={onScheduleHide}>
      <div className={CLASS.JUMP_FLYOUT.COLUMNS}>
        <JumpFlyoutColumn doc={doc} title={TEXT.GROUP_NAME.TREE_JUMPS} groups={TREE_JUMP_GROUP} onOptionActivated={onOptionActivated}>
          <UserTreeJumpGroup doc={doc} onOptionActivated={onOptionActivated} />
        </JumpFlyoutColumn>
        <JumpFlyoutColumn doc={doc} title={TEXT.GROUP_NAME.ADMIN_PAGES} groups={[...ADMIN_PAGE_GROUP, AI_GROUP, THIRD_PARTY_GROUP]} onOptionActivated={onOptionActivated}>
          <UserAdminPageGroup doc={doc} onOptionActivated={onOptionActivated} />
        </JumpFlyoutColumn>
        {/* Omits a column title: the sole group in this column already renders its own title. */}
        <JumpFlyoutColumn doc={doc} groups={[APPLICATION_PAGE_GROUP]} onOptionActivated={onOptionActivated} />
      </div>
    </div>
  );
}
