# Rendering Graph - research notes

## Shortcut found: skip the iframe/dialog navigation entirely

`graph.md`'s original plan clicks through LayoutDetails -> DeviceEditor -> SelectRendering ->
Field Editor dialogs. That's unnecessary. When Content Editor's View menu has **Standard Fields**
and **Raw Values** both on, the item's Layout section already renders a `Final renderings` field
(fallback: `Renderings`, for shared-only layout with no version override) whose raw value is the
item's full `LayoutDefinition` XML - everything we want, already on the page, no clicks required.

Confirmed against `example markup/layout section.html`:

```xml
<r xmlns:p="p" xmlns:s="s" p:p="1">
  <d id="{FE5D7FDF-89C0-4D99-9AA3-B5FBD009C9F3}">
    <r uid="{...}" s:id="{E82609B8-F10B-47FE-8D6D-785BB1FF49EB}"
       s:ds="local:/Data/Two Column CTA Text Block 1"
       s:par="ArdenVariant&amp;GridParameters&amp;...&amp;CacheClearingBehavior=Clear%20on%20publish"
       s:ph="main" />
    ...
  </d>
</r>
```

- `{FE5D7FDF-89C0-4D99-9AA3-B5FBD009C9F3}` is the well-known **Default device** id (also used as
  `de=` in `graph.md`'s DeviceEditor URL) - this is the `<d>` to read for the POC.
- `s:id` = rendering item id. `s:ds` = datasource path (already human-readable). `s:ph` =
  placeholder key. `s:par` = rendering parameters, `&`-joined key=value pairs, values
  individually URL-encoded (e.g. `Clear%20on%20publish`).
- No rendering *name* is present in this XML - only the rendering item's GUID. Resolving the
  friendly name (e.g. "Fobles Header") requires a separate lookup (deferred - see open questions).

## How to find the field on the page

Existing selectors already cover this (`SITECORE.SELECTORS` in `src/constants/sitecore.ts`):
`EDITOR_FIELD_MARKER` (`.scEditorFieldMarker`) wraps each field; match on the field's
`scEditorFieldLabel` text starting with "Final renderings" (fallback "Renderings"), then read
the `.scContentControl` input's value inside the same marker - same label-prefix-match pattern
`getQuickInfoValue` already uses in `ai-pages.ts`.

## Current implementation (post-POC-v1)

- `src/content/features/jump-flyout/rendering-graph.ts` - harvests the graph, auto-enabling
  Standard Fields/Raw Values if either is off and restoring them to their original state
  afterward. Both toggles are Sitecore ribbon checkboxes (`SITECORE.RIBBON_CHECKBOXES`) that
  trigger a full page postback on click, so the enable -> harvest -> restore sequence is a small
  resumable state machine persisted to `localStorage` (`resumeRenderingGraph`, wired into
  `src/content/toolbar-runtime.ts` next to `resumeKickAllUsers`) - the harvested graph itself
  rides along in that same persisted state so the final restore reload doesn't lose it.
- `src/content/macros/ribbon-toggle-macro.ts` - generic read/toggle helpers for any Sitecore
  ribbon checkbox, built on the existing `findRibbonCheckbox` proxy-button helper.
- Each control is enriched with its resolved name + full item path (via a `fetch` of its own
  content-editor page), a `link` (fo URL to the rendering item), and a `datasourceLink` (fo URL
  to its datasource item, resolving `local:` paths relative to the current item's own path).
  Each is also enriched with its `template` (Quick Info "Template:" row) for the hover tooltip.
- The shared Renderings field's `<d l="{guid}">` attribute (the device's actual Layout item
  reference) is parsed too and resolved the same way as a rendering (`sharedLayoutName`/Link).
- `src/content/features/jump-flyout/rendering-graph-modal.ts` - renders the result as a
  [cytoscape](https://js.cytoscape.org/) graph in a `<dialog>` injected into the active Content
  Editor page (not a new tab/page - simpler, no new build entry or manifest changes needed).
  Laid out with [cytoscape-dagre](https://github.com/cytoscape/cytoscape.js-dagre) (`rankDir:
  "TB"`) - a layered/Sugiyama-style algorithm that minimizes edge crossings as part of the
  algorithm itself, unlike `breadthfirst` (tried first, even with `circle: true`).
  Topology (Item is the root): `Item -> Template (if known)` and
  `Item -> Device: Default -> Shared Layout -> Layout (if known)`,
  `Device: Default -> Final Layout -> Control -> Datasource/Variant (if present)`.
  Satellite/referenced-data nodes (dashed border, smaller font) are all built through
  one generic `appendSatellites` helper (kind + value + optional link), so adding another
  referenced-data kind later is just one more list entry, not a bespoke if-block. No nested
  placeholder/parent edges between controls yet (see Known limitations). Every node's label is
  prefixed with its kind (DEVICE/ITEM/CONTROL/DATASOURCE/VARIANT/TEMPLATE/LAYOUT); the three
  structural wrapper nodes (Default/Shared Layout/Final Layout) just get a plain label.
  Node label is just the name; hovering shows name/GUID/path/template via
  [cytoscape-popper](https://github.com/cytoscape/cytoscape.js-popper) + [tippy.js](https://atomiks.github.io/tippyjs/)
  (one tippy instance per node, created lazily on first hover). Tapping a node opens its `link`
  in a new tab. Tippy's own CSS isn't imported (would need its own esbuild/manifest wiring) -
  the tooltip content div is fully inline-styled instead. Clicking outside either dialog (the
  progress one or the graph one) closes it, same as clicking Close/Cancel.
- A "Researching..." progress dialog with Cancel (same file) shows immediately on click and on
  every reload the toggle sequence triggers. Cancel aborts in-flight fetches and, if toggles were
  already flipped, still lets the sequence finish restoring them - it just skips the harvest.


## Reusable code


- `getCurrentItemId(doc)` (`src/content/features/jump-flyout/ai-pages.ts`) - active item id via
  Quick Info, no tree interaction needed if we're reading data already on the current page.
- `FlyoutOption.action` (`src/shared/jump-flyout/jump-flyout.types.ts`) - hook for a flyout button
  to run custom logic instead of navigating; see `kickAllUsers` in `kick-users.ts` for the pattern.
- `buildFoblesUrl` / `openFoblesUrl` (`src/content/features/augmentor/helper.ts`) - build/open a
  content-editor `fo=` link, useful for a per-rendering "open this item" link.
- `findRibbonCheckbox` / `postSitecoreEvent` (`src/content/features/augmentor/proxy-buttons-ribbon.ts`)
  - already used by the Standard Fields/Raw Values proxy buttons; now also the basis for
    `src/content/macros/ribbon-toggle-macro.ts`.

## Known limitations / possible next steps

- Only the Default device is harvested.
- Graph topology is a flat star (current item -> each control) - doesn't yet reflect nested
  dynamic placeholders (`p:before`/`p:after` positioning in the raw XML).
- Datasource nodes aren't in the graph yet, only `datasourceLink` data on each control node.

