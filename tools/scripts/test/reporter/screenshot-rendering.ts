import type { NoteInfo, ScreenshotInfo } from "./reporter-types";
import { escapeHtml } from "./report-utils";

function aliasScreenshotName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.startsWith("data-section-")) return "Data section";
  if (lower.startsWith("item-path-")) return "Item path";
  if (lower.startsWith("step-")) return "Step screenshot";
  if (lower === "screenshot" || lower.startsWith("screenshot")) return "Full page";
  return "Screenshot";
}

export function renderScreenshotLinks(screenshots?: ScreenshotInfo[]): string {
  if (!screenshots?.length) return "";

  const links = screenshots
    .map(
      (shot) => `
      <img src="${escapeHtml(shot.href)}" alt="${escapeHtml(aliasScreenshotName(shot.name))}" title="${escapeHtml(shot.name)}" class="screenshot-thumb" loading="lazy">`,
    )
    .join("<br>");

  return `<div class="screenshot-links">${links}</div>`;
}

export function renderNotes(notes?: NoteInfo[]): string {
  if (!notes?.length) return "";
  return notes
    .map((note) => `<div class="actual-note">${escapeHtml(note.text)}</div>`)
    .join("");
}
