// @source-path [fobles] src/content/foundation/sitecore/fobles-url.ts
import { CONST } from "../../../constants/const";
import { isGuidLike, stripGuidBraces } from "./guid";

export function normalizeFoblesValue(raw: string): string {
  if (!raw) return raw;

  if (isGuidLike(raw)) {
    return stripGuidBraces(raw);
  }
  const trimmed = raw.trim();
  const withoutLeadingSlash = trimmed.replace(/^\/+/, "");

  if (!withoutLeadingSlash) {
    return "/sitecore/content/";
  }

  const lowered = withoutLeadingSlash.toLowerCase();

  if (lowered.startsWith("sitecore/media library/") || lowered.startsWith("media library/")) {
    return `/${withoutLeadingSlash}`;
  }

  if (lowered.startsWith("sitecore/")) {
    return `/${withoutLeadingSlash}`;
  }

  if (lowered.startsWith("content/")) {
    return `/sitecore/${withoutLeadingSlash}`;
  }

  return `/sitecore/${withoutLeadingSlash}`;
}

export function buildFoblesUrl(fo: string): string {
  const normalizedFo = normalizeFoblesValue(fo);
  const host = location.hostname;
  const protocol = window.location.protocol;
  return `${protocol}//${host}${CONST.SITECORE.RELATIVE_PATHS_ENCODED.CONTENT_EDITOR_LEGACY}?sc_bw=1&fo=${normalizedFo}`;
}
