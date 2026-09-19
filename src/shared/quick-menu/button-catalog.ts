import { TEXT } from "../../content/constants";
import {
  ADMIN_PAGE_GROUP,
  AI_GROUP,
  APPLICATION_PAGE_GROUP,
  THIRD_PARTY_GROUP,
  TREE_JUMP_GROUP,
} from "../../content/features/quick-menu/menu-groups";
import type { MenuGroup } from "../../content/features/quick-menu/menu.types";
import type { QuickMenuButtonDescriptor } from "./quick-menu.types";

export type { QuickMenuButtonDescriptor } from "./quick-menu.types";

const buildButtonCatalog = (): readonly QuickMenuButtonDescriptor[] => {
  const columns: ReadonlyArray<{ title: string; groups: readonly MenuGroup[] }> = [
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

export const QUICK_MENU_BUTTON_CATALOG: readonly QuickMenuButtonDescriptor[] = buildButtonCatalog();
