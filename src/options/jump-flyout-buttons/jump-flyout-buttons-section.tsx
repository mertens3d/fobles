// @source-path [fobles] src/options/jump-flyout-buttons/jump-flyout-buttons-section.tsx

import { useEffect, useState } from "react";
import { JUMP_FLYOUT_BUTTON_CATALOG, type JumpFlyoutButtonDescriptor } from "../../shared/jump-flyout/button-catalog";
import {
  getJumpFlyoutButtonSettings,
  sanitizeJumpFlyoutPathSuffix,
  setJumpFlyoutButtonSettings,
  type JumpFlyoutButtonSettings,
} from "../../shared/jump-flyout/button-settings";
import {
  getUserTreeJumps,
  setUserTreeJumps,
  type UserTreeJump,
} from "../../shared/jump-flyout/user-tree-jump-settings";
import {
  getUserAdminPages,
  setUserAdminPages,
  type UserAdminPage,
} from "../../shared/jump-flyout/user-admin-page-settings";
import { TEXT } from "../../constants/fobles.constants";
import { JumpFlyoutColumn } from "./jump-flyout-column";
import { JumpFlyoutButtonRow } from "./jump-flyout-button-row";
import { UserTreeJumpEditor, normalizeUserTreeJumpEntriesForSave } from "./user-tree-jump-editor";
import { UserAdminPageEditor, normalizeUserAdminPageEntriesForSave } from "./user-admin-page-editor";

function groupByColumn(descriptors: readonly JumpFlyoutButtonDescriptor[]): Map<string, JumpFlyoutButtonDescriptor[]> {
  const columns = new Map<string, JumpFlyoutButtonDescriptor[]>();
  descriptors.forEach((descriptor) => {
    const column = columns.get(descriptor.column) ?? [];
    column.push(descriptor);
    columns.set(descriptor.column, column);
  });
  return columns;
}

const COLUMNS = groupByColumn(JUMP_FLYOUT_BUTTON_CATALOG);

export function JumpFlyoutButtonsSection() {
  const [enabledByButtonId, setEnabledByButtonId] = useState<Record<string, boolean>>({});
  const [pathSuffixByButtonId, setPathSuffixByButtonId] = useState<Record<string, string>>({});
  const [userTreeJumps, setUserTreeJumpsState] = useState<UserTreeJump[]>([]);
  const [userAdminPages, setUserAdminPagesState] = useState<UserAdminPage[]>([]);
  const [openColumn, setOpenColumn] = useState<string>();
  const [status, setStatus] = useState("");

  useEffect(() => {
    void Promise.all([getJumpFlyoutButtonSettings(), getUserTreeJumps(), getUserAdminPages()]).then(
      ([settings, treeJumps, adminPages]) => {
        const enabled: Record<string, boolean> = {};
        const pathSuffix: Record<string, string> = {};
        JUMP_FLYOUT_BUTTON_CATALOG.forEach((descriptor) => {
          enabled[descriptor.id] = settings[descriptor.id]?.enabled !== false;
          pathSuffix[descriptor.id] = settings[descriptor.id]?.encodedPathSuffix ?? "";
        });
        setEnabledByButtonId(enabled);
        setPathSuffixByButtonId(pathSuffix);
        setUserTreeJumpsState(treeJumps);
        setUserAdminPagesState(adminPages);
      },
    );
  }, []);

  function sanitizePathSuffix(buttonId: string): void {
    setPathSuffixByButtonId((current) => ({
      ...current,
      [buttonId]: sanitizeJumpFlyoutPathSuffix(current[buttonId] ?? ""),
    }));
  }

  async function handleSave(): Promise<void> {
    const settings: JumpFlyoutButtonSettings = {};
    JUMP_FLYOUT_BUTTON_CATALOG.forEach((descriptor) => {
      settings[descriptor.id] = {
        label: descriptor.label,
        enabled: enabledByButtonId[descriptor.id] !== false,
        encodedPathSuffix: sanitizeJumpFlyoutPathSuffix(pathSuffixByButtonId[descriptor.id] ?? ""),
      };
    });
    await Promise.all([
      setJumpFlyoutButtonSettings(settings),
      setUserTreeJumps(normalizeUserTreeJumpEntriesForSave(userTreeJumps)),
      setUserAdminPages(normalizeUserAdminPageEntriesForSave(userAdminPages)),
    ]);
    setStatus("Jump flyout buttons saved.");
  }

  return (
    <details className="settings-section">
      <summary>Jump Menu Buttons</summary>
      <p>
        Toggle buttons on or off, and optionally add a sub-path suffix to a Tree Jump button's base path. Under Tree
        Jumps, add your own User Tree Jumps too - each is rooted at /sitecore/, up to 30.
      </p>
      <div id="jump-flyout-buttons">
        {Array.from(COLUMNS.entries()).map(([columnTitle, descriptors]) => (
          <JumpFlyoutColumn
            key={columnTitle}
            title={columnTitle}
            open={openColumn === columnTitle}
            onToggle={(open) => setOpenColumn(open ? columnTitle : undefined)}
          >
            {descriptors.map((descriptor) => (
              <JumpFlyoutButtonRow
                key={descriptor.id}
                descriptor={descriptor}
                enabled={enabledByButtonId[descriptor.id] !== false}
                pathSuffix={pathSuffixByButtonId[descriptor.id] ?? ""}
                onToggle={(enabled) => setEnabledByButtonId((current) => ({ ...current, [descriptor.id]: enabled }))}
                onPathSuffixChange={(value) =>
                  setPathSuffixByButtonId((current) => ({ ...current, [descriptor.id]: value }))
                }
                onPathSuffixBlur={() => sanitizePathSuffix(descriptor.id)}
              />
            ))}
            {columnTitle === TEXT.GROUP_NAME.TREE_JUMPS && (
              <UserTreeJumpEditor entries={userTreeJumps} onChange={setUserTreeJumpsState} />
            )}
            {columnTitle === TEXT.GROUP_NAME.ADMIN_PAGES && (
              <UserAdminPageEditor entries={userAdminPages} onChange={setUserAdminPagesState} />
            )}
          </JumpFlyoutColumn>
        ))}
      </div>
      <button id="save-jump-flyout-buttons" type="button" onClick={() => void handleSave()}>
        Save jump flyout buttons
      </button>
      <p id="jump-flyout-buttons-status" role="status">
        {status}
      </p>
    </details>
  );
}
