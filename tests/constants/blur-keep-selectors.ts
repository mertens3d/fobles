// Named "keep" sets for blurTreeExcept (helpers/fobles-helpers-support/screenshots.ts) - each
// entry pairs the container to prune-blur with the selectors identifying branches that must stay
// sharp. Add more entries here as more pages/containers get this treatment; never inline a
// keep-list at the call site.
export const BLUR_KEEP = {
  CONTENT_TREE: {
    CE_CONTAINER_SELECTOR: ".scContentTreeContainer",
    INSERT_FROM_TEMPLATE_CONTAINER_SELECTOR: "#Templates_3C1715FE6A134FCF845FDE308BA9741D",
    SELECT_THE_TEMPLATE_CONTAINER_SELECTOR: "#TemplateLister_3C1715FE6A134FCF845FDE308BA9741D",
    // Each kept node stays sharp along with its own direct children, but not deeper descendants
    // (see blurTreeExcept's recursion) - so "sitecore" reveals Content/Layout/Media Library/
    // System/Templates as labels, but nothing nested any deeper gets a free pass unless it's also
    // listed here or in KEEP_SUBTREE_SELECTORS below.
    KEEP_SELECTORS: [
      "#Tree_Node_11111111111111111111111111111111", // sitecore (root - fixed Sitecore item id)
      "#Tree_Node_0DE95AE441AB4D019EB067441B7C2450", // Content
      "#Tree_Node_EB2E4FFD27614653B05226A64D385227", // Layout
      "#Tree_Node_3D6658D8A0BF4E75B3E2D050FABCF4E1", // Media Library
      "#Tree_Node_13D6D6C6C50B4BBDB3312B04F1A58F21", // System
      "#Tree_Node_3C1715FE6A134FCF845FDE308BA9741D", // Templates
      "#Tree_Node_BAD98E0EC1B54598AC1321B06218B30C", // Templates/Branches
      "#Tree_Node_2E5892C5A5294646989B1F15DE10453E", // Templates/Common
      "#Tree_Node_B26BD0358D0A4DF38F672DE3C7FDD74A", // Templates/Foundation
      "#Tree_Node_8F3430793CC54EF7BC2732ADDB46F45E", // Templates/Feature
      "#Tree_Node_825B30B4B40B422E992023A1B6BDA89C", // Templates/Project
      "#Tree_Node_99999999999999999999999999999999", // Probably doesn't exist
    ],
    // Unlike KEEP_SELECTORS, these stay sharp along with their ENTIRE real subtree, however deep
    // - Fobles' own test fixture data, safe to show in full rather than pruned one level at a
    // time.
    KEEP_SUBTREE_SELECTORS: [
      "#Tree_Node_EBCB389D15F74430B00220DF22CF36F8", // Fobles Testing
    ],
    // Decorative chrome that sits beside (not inside) a kept node's own anchor - the expand/
    // collapse glyph and gutter Sitecore renders, plus Fobles' own tree button/hidden glyph
    // spacer. A kept node's real children container (holding its actual nested items, if
    // expanded) deliberately does NOT match any of these, so it still gets evaluated normally.
    FURNITURE_SELECTORS: [
      ".scContentTreeNodeGlyph",
      ".scContentTreeNodeGutter",
      ".tree-fobles-wrapper",
      ".tree-fobles-spacer",
    ],
  },
  RIBBON_BUTTONS: {
    CONTAINER_SELECTOR: ".scRibbonNavigatorButtonsGroupButtons",
    // Ribbon strip ids embed the currently open item's GUID (not a fixed id), so match by suffix
    // instead of exact id - still correct regardless of which item's editor is open. Every
    // standard Content Editor tab except My Toolbar/Developer (user-customized, left blurred).
    KEEP_SELECTORS: [
      '[id$="_Nav_HomeStrip"]',
      '[id$="_Nav_NavigateStrip"]',
      '[id$="_Nav_ReviewStrip"]',
      '[id$="_Nav_PublishStrip"]',
      '[id$="_Nav_VersionsStrip"]',
      '[id$="_Nav_ConfigureStrip"]',
      '[id$="_Nav_PresentationStrip"]',
      '[id$="_Nav_SecurityStrip"]',
      '[id$="_Nav_ViewStrip"]',
    ],
  },
} as const;
