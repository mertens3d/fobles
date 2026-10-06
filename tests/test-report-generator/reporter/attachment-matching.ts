import type { NoteInfo, ReportStep, ScreenshotInfo } from "./reporter-types";

const STEP_SCREENSHOT_NAME_MATCH_LENGTH = 40;

type MatchableAttachment = ScreenshotInfo | NoteInfo;
type AttachmentField = "screenshots" | "notes";

function sanitizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractStepMatchKeys(title: string): string[] {
  const keys = [sanitizeForMatch(title).slice(0, STEP_SCREENSHOT_NAME_MATCH_LENGTH)];
  const quoted = title.match(/"([^"]+)"/);

  if (quoted) {
    const value = sanitizeForMatch(quoted[1]);
    keys.push(value.slice(0, STEP_SCREENSHOT_NAME_MATCH_LENGTH));
    const action = sanitizeForMatch(title.slice(0, quoted.index)).slice(-15);
    keys.push(`${action}-${value}`.slice(0, STEP_SCREENSHOT_NAME_MATCH_LENGTH));
  }

  return keys.filter(Boolean);
}

export function matchAttachmentsToSteps<T extends MatchableAttachment>(
  items: T[],
  steps: ReportStep[],
  field: AttachmentField,
): T[] {
  const remaining = [...items];

  for (const step of steps) {
    const keys = extractStepMatchKeys(step.title);
    const matched: T[] = [];

    for (let index = remaining.length - 1; index >= 0; index -= 1) {
      const itemKey = remaining[index].name.toLowerCase();
      const extensionIndex = itemKey.lastIndexOf(".");
      const extension = extensionIndex >= 0 ? itemKey.slice(extensionIndex) : "";

      if (!keys.some((key) => itemKey.endsWith(`${key}${extension}`))) continue;

      matched.unshift(remaining[index]);
      remaining.splice(index, 1);
    }

    if (matched.length) {
      if (field === "screenshots") {
        step.screenshots = matched as ScreenshotInfo[];
      } else {
        step.notes = matched as NoteInfo[];
      }
    }
  }

  return remaining;
}
