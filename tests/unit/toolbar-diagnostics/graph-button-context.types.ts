export type GraphButtonBundle = Pick<
  typeof import("../../../src/content/toolbar/toolbar-buttons.tsx"), "GraphButton"
> & Pick<typeof import("../../../src/constants/fobles-b.const.ts"), "ICONS" | "TEXT">;