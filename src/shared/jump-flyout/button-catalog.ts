import { TEXT } from "../../constants/fobles.constants";
import {
  ADMIN_PAGE_GROUP,
  AI_GROUP,
  APPLICATION_PAGE_GROUP,
  THIRD_PARTY_GROUP,
  TREE_JUMP_GROUP
} from "../../constants/flyout-groups";
import type { FlyoutGroup } from "./jump-flyout.types";
import type { JumpFlyoutButtonDescriptor } from "./jump-flyout.types";

export type { JumpFlyoutButtonDescriptor } from "./jump-flyout.types";

const buildButtonCatalog = (): readonly JumpFlyoutButtonDescriptor[] => {
  const columns: ReadonlyArray<{ title: string; groups: readonly FlyoutGroup[] }> = [
    { title: TEXT.GROUP_NAME.TREE_JUMPS, groups: TREE_JUMP_GROUP },
    { title: TEXT.GROUP_NAME.ADMIN_PAGES, groups: [...ADMIN_PAGE_GROUP, AI_GROUP, THIRD_PARTY_GROUP] },
    { title: TEXT.GROUP_NAME.APPLICATION_PAGES, groups: [APPLICATION_PAGE_GROUP] },
  ];

  return columns.flatMap(({ title, groups }) =>
    groups.flatMap((group) =>
      group.groupMembers
        .filter((option) => !option.isIncomplete)
        .map((option) => ({
          id: option.id,
          label: option.label,
          column: title,
          group: group.title,
          supportsPathSuffix: option.path !== undefined,
          basePath: option.path,
        })),
    ),
  );
};

export const JUMP_FLYOUT_BUTTON_CATALOG: readonly JumpFlyoutButtonDescriptor[] = buildButtonCatalog();
