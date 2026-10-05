export const DIAGNOSTIC = {
  IGNORABLE_URLS: [
    "https://delivery-sitecore.sitecorecontenthub.cloud/api/public/content/",
  ],
  IGNORABLE_CONSOLE_MESSAGES: [
    "Failed to load resource: the server responded with a status of 404",
  ],
  IGNORED_DIAGNOSTIC_URL_PATTERN: /\/-\/icon\//i,
  IGNORED_CONSOLE_WARNING_PATTERN: /has both allow-scripts and allow-same-origin/i,
  IGNORED_REQUEST_FAILURES:[
    'ERR_BLOCKED_BY_ORB'
  ]
};