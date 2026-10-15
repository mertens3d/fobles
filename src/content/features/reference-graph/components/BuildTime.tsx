


export function BuildTime({ buildElapsedSeconds }: { buildElapsedSeconds: number | undefined; }) {
  return <div className="fobles-reference-graph-build-time">
    {buildElapsedSeconds !== undefined
      ? `Built in ${buildElapsedSeconds.toFixed(3)}s`
      : "Building graph"}
  </div>;
}
