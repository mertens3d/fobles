// Single source of truth for the human-readable build timestamp, shared by
// write-build-info.js and add-generated-banner.js so both build steps agree
// on the exact same value instead of duplicating the format/parsing logic.
export function computeBuildStamp(now = new Date()) {
  const centralParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
  }).formatToParts(now);
  const getPart = (type) =>
    centralParts.find((part) => part.type === type)?.value ?? "";

  return `${getPart("year")}-${getPart("month")}-${getPart("day")} ${getPart("hour")}:${getPart("minute")}:${getPart("second")} ${getPart("timeZoneName")}`;
}
