# Item history domain

- GUIDs are lowercase dashed strings without braces. Braced, dashed and compact 32-character inputs are accepted.
- Item paths retain display casing, collapse repeated separators, convert backslashes and remove surrounding whitespace/trailing slashes. Paths must be rooted at `/sitecore`; dot segments and control characters are invalid.
- Classification matches root/descendant segment boundaries case-insensitively: `/sitecore/templates`, `/sitecore/layout`, `/sitecore/system`. All other valid item paths are Content.
- Persisted rows require valid GUID/name/path/category and a finite nonnegative timestamp. Category spellings are case-insensitive; the canonical category is derived from the path. Newest rows supply all metadata for duplicate GUIDs; equal timestamps preserve input order. Deduplication precedes per-category caps: Content 10; Media Library, Templates, Layout, and System 5 each.
- Scope keys contain only the normalized HTTP(S) URL origin and trimmed lowercase database. Non-default ports are retained. URL paths, queries, language and extra scope properties never participate.
- `getHistory` and `subscribeHistory` read local storage through the facade. Subscriptions do not perform an initial read and return a cleanup function.
- `mutateHistory` delegates to `requestHistoryChange`; neither client entry point writes storage or maintains a tab-local queue.
- The background registration owns one serialized read/modify/write queue across tabs and scopes. It validates the sender's HTTP(S) origin against the scope and timestamps visits with `Date.now()` inside the queued operation. Rejected mutations do not poison subsequent queue entries.
- Responses are `{ ok: true, history }` or `{ ok: false, error }`; the client resolves canonical history or rejects. The writer opts into facade storage error propagation so failed reads/writes cannot be acknowledged as success. Existing facade callers retain their default fallback behavior.
- Runtime imports reachable by Node-native TypeScript tests use explicit `.ts` extensions. Do not add a barrel or browser-global initialization to the model dependency chain.