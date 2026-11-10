import type { UserAdminPage } from "../../shared/jump-flyout/jump-flyout.types";

export type UserAdminPageEditorProps = {
  entries: readonly UserAdminPage[];
  onChange: (entries: UserAdminPage[]) => void;
};
