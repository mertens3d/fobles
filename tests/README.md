# Testing Fobles

Playwright end-to-end tests live in `tests/e2e/` and exercise the extension against a real Sitecore environment.

## File Organization

- `mouse-proxy.ts` - the mouse marker/animation system, plus `clickWithMouseMarker` (move, flash,
  click - the one entry point every interactive Sitecore-page click should use). Defaults to a
  target's center; pass `{ corner: "top-left" }` to land on its top-left corner instead (e.g.
  `highlightQuickInfoPath`'s triple-click, so the marker visually starts at the text's beginning).
- `speak-bubble.ts` - `showSpeakBubble`/`hideSpeakBubble`, a fixed-position banner (white box,
  black border) injected into the top-level page only (not any frame), used to narrate
  promo-video scenes since there's no voiceover. `showSpeakBubble`'s required `{ xPercent,
  yPercent }` places the bubble's center at that percentage of the viewport - every call site
  picks its own position (no default) so a scene can dodge whatever it's about to click, or add
  visual variety. Hidden entirely in SPRINT mode, like the mouse marker.
- `frame-finder.ts` - generic "find the frame containing this selector" lookups (`findFrameWithSelector`,
  `findFoblesFrame`). Passive queries, not user actions - not macros.
  - `findFrameWithSelector` retries across `page.frames()` since a frame (e.g. a Sitecore gallery)
    can load asynchronously after it's first called; `timeoutMs` of 0 (its default) is a single
    fail-fast pass instead of a retry loop.
  - `findFoblesFrame` anchors on the toolbar container (`.fobles-toolbar-container`), which is
    always present whether the page has the full or compact toolbar (unlike the Quick Menu
    trigger, which compact pages remove) - with a 10s retry window, since a freshly navigated
    page's toolbar takes a moment for the content script to inject it.
- `sitecore-macros.ts` - actual canned click/gesture sequences (ribbon tabs, galleries, dragging
  the toolbar, dismissing Fobles' own confirm dialog) that a spec reuses as one step. Every macro
  logs `[Macro: <name>] - Start` as its first line.
  - `openQuickMenu` is idempotent - it checks the flyout's `data-visible` attribute (not
    Playwright's `.isVisible()`, which can't tell: the flyout is hidden via `opacity`/
    `pointer-events` in CSS, not `display`/`visibility`, so Playwright always reports it visible).
  - `clickTreeJump`/`highlightQuickInfoPath` each find their own fresh fobles frame internally
    rather than accepting one from the caller, since a frame handed in from an earlier
    navigation/activation step can go stale by the time they actually run.
  - `clickTreeJump` dismisses Fobles' own confirm dialog afterward unless `modifiers` includes
    `"Control"` (a Ctrl+click opens a new tab and never shows that dialog) or `skipDialogDismiss`
    is set (for a caller that wants to inspect/interact with the dialog itself).
  - `dismissFoblesConfirmDialogIfPresent` searches every frame, since the dialog renders wherever
    the clicked button lives; `turnOffWarning` unchecks the dialog's warning checkbox first.
  - `openLinksGallery`: Sitecore loads the Links gallery into its own dynamically created frame
    (the button's `showGallery(...)` target), not the ribbon's own frame, so it searches every
    frame on the page rather than assuming it lands in the frame passed in.
  - `dragToolbarTo` exercises the real drag gesture (pointerdown -> pointermove -> pointerup, the
    same sequence `wireContainerDragging` in `src/content/toolbar/drag.ts` listens for) rather
    than setting the container's position directly. It starts from the toolbar grip specifically
    because that's guaranteed to be a non-interactive drag handle regardless of which toolbar
    buttons happen to be showing.
  - `clickLbolt`/`clickTreeFoblesButton(itemId)` target every fobles-generated item button (tree
    button, every field-strategy item button via `createFoblesItemButton`, and quick-info-section's
    buttons) via `data-fobles-item-id` (`src/content/features/augmentor/shared/fobles-item-id.ts`
    assigns it, appending `-1`/`-2`/etc. if the same item id gets used again in the same pass, e.g.
    a field referencing the same item as the tree node - reset every time Fobles/tree buttons
    toggle on or off, in `feature-toggle.ts`'s `toggleLightningBolt`). Not fully guaranteed unique
    even so (nothing stops a duplicate suffix from colliding with a different real id) -
    `clickTreeFoblesButton` scopes to the tree button's own class first, then takes `.first()`
    regardless, since any such collision would still navigate to the same item either way.
  - `scrollTreeContainer(scrollTopPx)` scrolls the tree panel (`#ContentTreeInnerPanel`, a native
    Sitecore element present from page load) to a fixed scrollTop, called before `clickLbolt` -
    the tree's own fobles button doesn't exist until after LBolt runs, so scrolling has to target
    the native tree, not the (not-yet-created) fobles button.
  - `setTreePanelWidth(widthPx)` sets the `scContentEditorFoldersWidth` cookie the tree/editor
    splitter reads its width from on page load - call before navigating (not after), since
    Sitecore only reads this cookie at load time. Found via a DevTools before/after diff of
    `document.cookie` around a manual splitter drag; setting `#ContentTreePanel`'s inline style
    directly didn't work; a real drag-simulation on the splitter bar would have too, but the
    cookie needs no interaction with the (fragile, jQuery-UI-style) splitter widget at all.
- `fobles-helpers.ts` - asserting Fobles' resulting behavior (activation, navigation, screenshots),
  not how to reach the UI that triggers it.
- `fixtures/extension.ts` - opens the extension's own options/popup pages and drives their real
  UI (never reads/writes `chrome.storage` directly - tests should only ever reach a setting the
  same way a real user would).

## Setup

1. Copy `.env.example` to `.env` and set `SITECORE_TEST_ENVIRONMENTS` to your local endpoint.
2. Install browsers once: `npx playwright install`.
3. Run `npm run test:e2e`. Sitecore's auth cookies appear to be session-only, so a separate
   login-then-close step never survives to the next run - if a test hits a login form, it prints a
   banner and waits (no need to touch Playwright Inspector); log in by hand in that same browser
   window and the test continues automatically once the login form disappears.

## Running Tests

```text
npm run test:e2e
npm run test:e2e:debug
```

To verify Playwright configuration and test discovery without opening a browser or contacting Sitecore:

```text
npm run test:e2e:list
```

## Sitecore Test Login Warning

If you're prompted to log in on every run even within the same test session, or Content Editor
doesn't load after logging in, the Sitecore active-user limit may be full. Use Sitecore's Kick
User tool to free an existing session, then try again.

All tests share one persistent browser profile (`tests/test-artifacts/browser-profile`), which
only one process can open at a time - `playwright.config.ts` forces `workers: 1` and the
`browserContext` fixture is worker-scoped (`fixtures/playwright.ts`) so the whole run shares a
single browser instance instead of racing to open the same profile from multiple processes.

If a run gets force-killed (crash, closing the terminal, a second Ctrl+C), its browser process can
be left running and holding that profile lock - every later run then fails immediately with
"Opening in existing browser session". Run `npm run test:e2e:unlock` to find and kill any leftover
`msedge.exe` processes locking the profile.

### Stopping A Run Safely

**Warning:** stopping a run mid-test leaves the Sitecore session logged in, which keeps its
active-user slot occupied until the session eventually expires on its own - repeated force-stops
can exhaust the available slots for everyone. To stop cleanly, press **Ctrl+C once** and let
Playwright finish interrupting (it still runs fixture teardown, which logs the session out) -
don't press Ctrl+C again or close the terminal window, since that force-kills the process before
teardown can run.

## Promo Video (`promoVideo/promoVideo-demo.spec.ts`)

A short, deliberately un-asserted walkthrough for recording a store-listing promo video - not
part of the regular regression suite. Run with `npm run test:e2e:promoVideo`; recording itself is
controlled by `RECORD_VIDEO` in `tests/settings/VideoSwitch.ts`. Target runtime: under 1:45 - trim
clips in an editor afterward rather than padding the script out.

- Deliberately no `expect()`/assertions and no `test.step()` breakdown - this is a recording, not
  a regression test, and neither one changes what ends up in the video. If a recording starts
  failing, add `console.log` narration to narrow it down rather than reintroducing assertions.
- `clickTreeJump`/`clickTreeFoblesButton` turn the confirm dialog's warning checkbox off by
  default (dismiss it if present, and don't show it again) - pass `{ turnOffWarning: false }` to
  keep the dialog reappearing on every navigation (e.g. `fobles.spec.ts`'s dialog-visibility test
  drives the dialog directly instead, without going through these macros). The promo video test
  restores the setting to on afterward regardless of outcome (via the real popup UI, in a
  `finally`) so a recording session never leaks into other suites sharing the same persistent
  browser profile.
- A tree-jump click navigates the page away, so any frame reference captured before the click is
  stale afterward - `clickTreeJump`/`highlightQuickInfoPath` each re-find their own fobles frame
  internally (`findFoblesFrame`) rather than accepting one from the caller, so a spec never has to
  carry a frame across a navigation itself.
- The "Ctrl + Click opens ... in a new tab" scene narrates a Ctrl+click but deliberately performs
  a plain click (no `modifiers`) - Playwright records one video per page, so an actual new tab
  would split the recording in two. The video never shows the whole browser chrome (no visible
  address bar/tab strip), so the on-page result looks identical either way.
- There's no voiceover, so `showSpeakBubble`/`hideSpeakBubble` (`speak-bubble.ts`) narrate each
  scene with an on-page speech-bubble banner instead (e.g. "Click opens the tree jump path in the
  same tab").
- Recording happens on a brand-new page (`sharedBrowserContext.newPage()`), created only after
  `00-session-start.spec.ts` has already run on the original shared page and handled any
  interactive login wait - the new page inherits that already-authenticated session (same
  persistent context), so its video never has login dead time baked in. Explicitly closed right
  after the scenes finish so its video finalizes promptly instead of idling through
  `zz-session-end.spec.ts`'s logout.
- Playwright names each recorded video after a random hash and writes one file per page - besides
  the dedicated recording page above, the original shared page (used by `00-session-start`/
  `zz-session-end`) gets its own (mostly blank) video too. `sharedBrowserContext`
  (`fixtures/playwright.ts`) clears `promo-video/` before launching and, once the context closes,
  renames every `.webm` in it to a static name - the largest file becomes `main.webm` (the real
  recording always dwarfs any incidental/blank page's video), everything else becomes
  `secondary-N.webm`. This keeps the same, predictable filenames run to run instead of piling up
  new hash-named files.
- `promo-video/` gets wiped at the start of every recording run, so `main.webm` never survives
  past the next take. Once you're happy with a take, run `npm run test:e2e:promoVideo:save`
  (`tools/scripts/test/save-promo-video.js`) to copy it to
  `playwright-results/videoComposit/FoblesPromoVideoMain.webm` - a separate folder the recording
  itself never touches, so it survives later runs. On-demand only, not run automatically.
- Toolbar drag is deliberately left out for now - it was hanging live (see
  `toolbar/toolbar-drag.spec.ts` for the real regression test) and isn't worth blocking a first
  working recording on; add it back once that's root-caused.

## Strategy Scenario Coverage

Sitecore test data for each field strategy lives under `/sitecore/system/Modules/Fobles Testing/Strategy Scenarios`
(serialized in `tests/items-fobles/`), one content item per strategy with `0x`/`1x`/`3x`/`10x`
fields to exercise different source-list sizes. Quick-review checklist only — not the source of
truth; check the serialized items themselves for what actually exists, and whether a Playwright
spec actually consumes each one yet.

### Hardcoded Expected Values

Each `strategies/*.spec.ts` file hardcodes its own expected values (item GUIDs, resolved paths,
button text) as consts rather than reading them from the serialized YAML at runtime - tests
should assert against a fixed, independent expectation, not "whatever the data currently says"
(otherwise a real regression could pass silently). These consts were harvested by hand by looking
up the relevant item's own YAML file under `tests/items-fobles/serialization/` and reading its
`Path:`/`ID:` value directly. If the underlying test data changes (an item is renamed, moved, or
re-pulled), the consts don't update automatically - re-harvest them the same way and update the
spec file.

General approach per field type: one field instance with no value, one with a single value, and
— only for field types that actually support multiple selections (lists) — additional variations
across list sizes (currently `0x`/`1x`/`3x`/`10x`).

`quick-info-section`, `reference-links`, and `template-path` don't get dedicated content items -
they operate on Sitecore's own built-in Quick Info panel, item references, and template link,
which every item already has. Any existing scenario item exercises them.

- [x] drop-link
- [x] droplist
- [x] drop-tree
- [x] file
- [x] general-link
- [x] icon
- [x] image
- [x] internal-link
- [x] multilist-options
- [x] multilist-with-search
- [x] quick-info-section (no dedicated item needed - see note above)
- [x] reference-links (no dedicated item needed - see note above; has its own spec under `tests/e2e/editor/`, unlike quick-info-section/template-path)
- [ ] style-checklist (new - operates on Presentation Details -> Controls -> Edit's "Styles" checkbox widget, not a regular content item field; no test yet)
- [x] tag-list
- [x] template-path (no dedicated item needed - see note above)
- [x] tree-list
- [x] treelist-ex

## Editor Scenario Coverage

`tests/e2e/editor/` tests the editor-strategies (`src/content/features/augmentor/editor-
strategies/`) - these decorate a piece of Content Editor's own UI chrome rather than a single
Sitecore field, so unlike `strategies/*.spec.ts` they don't toggle Fobles on before locating their
target: that UI chrome (e.g. the "Links" gallery) often only exists in the DOM *after* an extra
Sitecore interaction (a ribbon click, a gallery open), so Fobles is toggled on last, once it's
already present for it to decorate.

- [x] reference-links
- [x] quick-info-section (exception to the toggle-last rule above - its Quick Info panel target is
  always present in the DOM already, so it toggles Fobles on first like `strategies/*.spec.ts` does)
- [ ] template-path
