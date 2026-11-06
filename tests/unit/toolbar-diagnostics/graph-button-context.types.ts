export type GraphButtonBundle = Pick<
  typeof import("../../../src/content/toolbar/toolbar-buttons.tsx"), "GraphButton"
> & Pick<typeof import("../../../src/constants/fobles.constants.ts"), "ICONS" | "TEXT">;