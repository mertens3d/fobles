// @source-path [fobles] src/content/features/reference-graph/graph-nodes/text-line-breaker.ts


export const LINE_BREAKER = {
  MAX_LABEL_LINE_LENGTH: 16,
  LINE_BREAK_REGEX: {
    SPACE: /\s+/g,
    DASH: /-/g,
    CAMEL_CASE: /(?=[A-Z])/g
  }
}


export type LabelBreakResult = {
  success: boolean;
  label: string;
};

export function tryBreakLabel(
  labelBreakResult: LabelBreakResult,
  boundaryPattern: RegExp,
) {

  const matches = [...labelBreakResult.label.matchAll(boundaryPattern)];

  if (matches.length > 0) {
    const middle = labelBreakResult.label.length / 2;
    const match = matches.reduce((best, current) =>
      Math.abs((current.index ?? 0) - middle) <
        Math.abs((best.index ?? 0) - middle)
        ? current
        : best,
    );

    const breakIndex = match.index ?? 0;
    const left = labelBreakResult.label.slice(0, breakIndex).trimEnd();
    const right = labelBreakResult.label.slice(breakIndex).trimStart();

    if (
      left.length <= LINE_BREAKER.MAX_LABEL_LINE_LENGTH &&
      right.length <= LINE_BREAKER.MAX_LABEL_LINE_LENGTH
    ) {
      labelBreakResult.label = `${left}\n${right}`;
      labelBreakResult.success = true;
    } else {
      labelBreakResult.success = false;
    }
  }
}

export function clampMiddle(labelBreakResult: LabelBreakResult, edgeLength = 12): void {

  const halfLength = Math.floor(labelBreakResult.label.length / 2);
  if(halfLength <= edgeLength) {
    labelBreakResult.label = `${labelBreakResult.label.slice(0, halfLength)}\n${labelBreakResult.label.slice(-halfLength)}`;
    labelBreakResult.success = true;
    
  }else{
    const left = labelBreakResult.label.slice(0, edgeLength);
    const right = labelBreakResult.label.slice(-edgeLength);
    labelBreakResult.label = `${labelBreakResult.label.slice(0, edgeLength)}...\n...${labelBreakResult.label.slice(-edgeLength)}`
    labelBreakResult.success = true;
  }
}
