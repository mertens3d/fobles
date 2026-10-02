// A screenshot name can't contain path separators or most punctuation - jump targets are Sitecore
// paths (e.g. "/sitecore/media library/Project"), so collapse anything unsafe into a dash.
export function toSafeFileName(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
}

// Playwright's own attachment storage appends "-png-<40-char-hash>.png" to whatever name we give
// testInfo.attach() - combined with a long test folder name and a verbose, strategy-prefixed step
// title, the full absolute path can exceed Windows' 260-character MAX_PATH limit (confirmed: some
// viewers report "file not found" for a file that genuinely exists, once over that limit). Cap our
// own portion of the name well short of that, independent of how long the actual step title is.
const MAX_STEP_SCREENSHOT_NAME_LENGTH = 40;

// Blindly truncating a step's full title from the start can erase its only differentiating part -
// confirmed live: two "tree jump" steps under the same long shared prefix ("Tree Jump: Click:
// navigates to \"...\"") collided into an identical key once that shared prefix alone approached
// MAX_STEP_SCREENSHOT_NAME_LENGTH, since the quoted value (the only thing that actually differed)
// never survived the truncation. Preferring the quoted value, plus just enough of the action text
// immediately before it to still tell e.g. Ctrl+click apart from a plain click on the same value,
// keeps whichever part actually differs. static-test-reporter.cjs's extractStepMatchKeys must stay
// in sync with this.
export function buildStepMatchKey(matchKey: string): string {
  const quoted = matchKey.match(/"([^"]+)"/);
  if (!quoted)
    return toSafeFileName(matchKey).slice(0, MAX_STEP_SCREENSHOT_NAME_LENGTH);

  const action = toSafeFileName(matchKey.slice(0, quoted.index)).slice(-15);
  const value = toSafeFileName(quoted[1]);
  return `${action}-${value}`.slice(0, MAX_STEP_SCREENSHOT_NAME_LENGTH);
}
