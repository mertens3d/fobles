// @source-path [fobles] src/content/toolbar/toolbar-grip.tsx

import { CLASS } from "../../constants/fobles-b.const";

const GRIP_ROWS = 5;
const GRIP_COLUMNS = [3, 9] as const;
const GRIP_DOT_RADIUS = 1.3;

export function ToolbarGrip() {
  const rowSpacing = 24 / (GRIP_ROWS + 1);
  const dots: Array<{ cx: number; cy: number }> = [];
  for (let row = 1; row <= GRIP_ROWS; row += 1) {
    for (const x of GRIP_COLUMNS) {
      dots.push({ cx: x, cy: rowSpacing * row });
    }
  }
  return (
    <svg className={CLASS.TOOLBAR_GRIP} viewBox="0 0 12 24" aria-hidden="true" focusable="false">
      {dots.map((dot, index) => (
        <circle key={index} cx={dot.cx} cy={dot.cy} r={GRIP_DOT_RADIUS} fill="currentColor" />
      ))}
    </svg>
  );
}
