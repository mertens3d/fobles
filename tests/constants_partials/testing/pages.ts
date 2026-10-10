import { toBracedGuidQuery } from "../../helpers/guid-helpers";
import type { PageCase } from "../CONST.Types";
import { _SITECORE_BASE_CONST } from "../base/_sitecore-constants";

const FOBLES_TESTING_MODULE_ROOT_ID = _SITECORE_BASE_CONST.ITEMS.CONTENT_ITEM_ID;

const GALLERY_QUERY_SUFFIX =
  `id=${toBracedGuidQuery(FOBLES_TESTING_MODULE_ROOT_ID)}` +
  "&la=en&vs=1&db=master&sc_content=master&ShowEditor=1&Ribbon.RenderTabs=true";

// Only pages where (a) a guaranteed/known item already exists and (b) that item is confirmed
// reachable WITHOUT extra tree-navigation. Content Editor's own "&fo=<item>" deep link only
// updates the field panel - it does NOT reliably scroll/expand the left tree to match (confirmed
// live: tree buttons never appeared for either FOBLES_DATA_ITEM_A or FOBLES_TESTING_MODULE_ROOT
// via "&fo="). The tree's own top-level nodes (content/layout/media library/system/templates) are
// expanded by default on a fresh Content Editor load though, so SITECORE.ITEMS.CONTENT_ITEM_ID
// (Sitecore's own standard "/sitecore/content" root, not Fobles-Testing-specific) is used here
// instead - no "&fo=" param at all, relying on that default-expanded state.
export const FOBLES_PAGES : readonly PageCase[] = [
  {
    label: "Content Editor",
    encodedPath: _SITECORE_BASE_CONST.PATHS.CONTENT_EDITOR_BW_ENCODED,
    uiPath: "Jump Menu -> Content Editor",
    toolbarType: "full",
    foblesEligible: true,
    knownItemId: FOBLES_TESTING_MODULE_ROOT_ID,
  },
  {
    label: "Template Manager",
    encodedPath: "/sitecore/shell/Applications/Templates/Template-Manager",
    uiPath: "Jump Menu -> Template Manager",
    toolbarType: "full",
    foblesEligible: true,
    activationGap:
      "Has a guaranteed template item (FOBLES_YML.TEMPLATES.FOBLES_DATA_ITEM_TEMPLATE), but the " +
      "Content Editor case above confirmed \"&fo=<item>\" does NOT reveal/expand the tree to an " +
      "arbitrary node - the same is almost certainly true here. Needs either a tree-expand macro " +
      "or a shallower, default-visible template node instead.",
  },
  {
    label: "Content Manager",
    encodedPath: "/sitecore/shell/Applications/Content%20Manager/default.aspx",
    uiPath: "Jump Menu -> Content Manager",
    foblesEligible: true,
    toolbarType: "full",
    activationGap:
      "Unconfirmed whether this uses the same content tree as Content Editor (Tree_Node_ prefix) " +
      "- if so, SITECORE.ITEMS.CONTENT_ITEM_ID already covers it with no new content needed; if " +
      "it's a different tree/id convention, needs its own investigation first.",
  },
  {
    label: "PowerShell ISE",
    encodedPath: "/sitecore/shell/Applications/PowerShell/PowerShellIse?sc_bw=1&id=A870E3EA-A75E-447C-AC9C-00EB74EA7268&db=master",
    uiPath: "Jump Menu -> PowerShell ISE",
    foblesEligible: true,
    toolbarType: "full",
    activationGap:
      "Needs the Sitecore PowerShell Extensions (SPE) module installed to have a real Script " +
      "Library item to target (see docs/TODO.md's existing note - candidate item " +
      "{56DA8E7D-6CA5-4576-B1ED-4EDCCCC5B0B4}, SPE/Core/Platform/Functions/BaseXlsx) - not " +
      "guaranteed present in every environment, so deferred until that's confirmed available.",
  },
  {
    label: "Kick User",
    encodedPath: "/sitecore/client/Applications/LicenseOptions/KickUser.aspx",
    uiPath: "Jump Menu -> Kick User",
    foblesEligible: true,
    toolbarType: "full",
    activationGap:
      "Special-purpose admin page, not a content-browsing tree - unconfirmed whether it has any " +
      "Fobles-button-decoratable content at all. Needs investigation before this makes sense.",
  },
  {
    label: "File Explorer",
    encodedPath: "/sitecore/shell/default.aspx?xmlcontrol=FileExplorer",
    uiPath: "Jump Menu -> File Explorer",
    foblesEligible: false,
    toolbarType: "full",
    activationGap:
      "Browses physical server files, not Sitecore items - Fobles buttons navigate by item GUID " +
      "(buildFoblesUrl/formatFoId), which doesn't apply to a raw file path. Needs confirmation " +
      "this page has any GUID-based decoratable element at all before writing a real test (it may " +
      "simply be out of scope for this feature).",
  },
  {
    label: "Add From Template",
    encodedPath: "/sitecore/shell/default.aspx?xmlcontrol=AddFromTemplate",
    uiPath: "CE -> Home -> Insert -> Insert from template",
    foblesEligible: false,
    toolbarType: "full",
    activationGap:
      "Has a guaranteed template item already, blocked on the same tree-reveal problem as " +
      "Template Manager above (not a deep-link one, per the Content Editor finding).",
  },
  {
    label: "Change Template",
    encodedPath: "/sitecore/shell/Applications/Templates/Change%20template.aspx",
    uiPath: "CE -> Home -> Insert -> Change template",
    foblesEligible: true,
    toolbarType: "full",
    activationGap:
      "Page itself is now allowlisted (FOBLES_PAGES) and its tree widget's \"TemplateLister_\" id " +
      "prefix is now supported (src/content/sitecore.ts's TREE_ID_PREFIXES, " +
      "src/content/features/augmentor/treeNodeFobles/index.ts) - only the tree-reveal mechanics " +
      "(same problem as Template Manager/Add From Template above) remain.",
  },
  {
    label: "Gallery Subitems",
    encodedPath: `/sitecore/shell/default.aspx?xmlcontrol=Gallery.Subitems&${GALLERY_QUERY_SUFFIX}`,
    uiPath: "CE -> Navigate -> Subitems",
    foblesEligible: false,
    toolbarType: "compact",
    // Confirmed failing live: no Fobles toolbar container ever appears on this page (see
    // docs/TODO.md) - skip until that's investigated/fixed.
    skip: true,
    activationGap: "Blocked on the toolbar-not-appearing root issue above, not on test-writing.",
  },
  {
    label: "Gallery Favorites",
    encodedPath: `/sitecore/shell/default.aspx?xmlcontrol=Gallery.Favorites&${GALLERY_QUERY_SUFFIX}`,
    uiPath: "CE -> Navigate -> Favorites",
    foblesEligible: false,
    toolbarType: "compact",
    // Confirmed failing live: no Fobles toolbar container ever appears on this page (see
    // docs/TODO.md) - skip until that's investigated/fixed.
    skip: true,
    activationGap: "Same root issue as Gallery Subitems above.",
  },
  {
    label: "TreeListEx Editor",
    // hdl is an ephemeral, session-scoped handle to an in-memory field value - not reusable
    // across test runs. Fobles' own eligibility check only reads xmlcontrol (isMenuPathAllowed,
    // src/content/guard.ts), so the bare xmlcontrol param is the shortest functional URL.
    encodedPath: "/sitecore/shell/default.aspx?xmlcontrol=TreeListExEditor",
    uiPath: "CE -> Configure -> Editors",
    foblesEligible: true,
    toolbarType: "compact",
    // Confirmed live: this xmlcontrol itself returns a server-side 500 on the "ai" environment
    // (unrelated to Fobles) - skip until that's investigated, same as Gallery Subitems/Favorites.
    skip: true,
    activationGap:
      "This dialog's internal list widget appears to use yet another id convention (seen " +
      "elsewhere as \"FIELD<n>_all_<GUID>\", not Tree_Node_/TemplateLister_) - augmentor support " +
      "for it is unconfirmed. Needs a live markup check before extending getTreeNodeItemId " +
      "(src/content/features/augmentor/treeNodeFobles/index.ts) for this case.",
  },
  {
    label: "Device Editor",
    // de/id/vs/la identify which device+item+version+language to edit - none of that is Fobles'
    // own test data, and none of it affects toolbar-eligibility, so drop it for the same reason
    // as TreeListEx Editor above.
    encodedPath: "/sitecore/shell/default.aspx?xmlcontrol=DeviceEditor",
    uiPath: "CE -> Presentation -> Details",
    
    toolbarType: "compact",
    // Confirmed live: this xmlcontrol itself returns a server-side 500 on the "ai" environment
    // (unrelated to Fobles, same as TreeListEx Editor) - skip until that's investigated. Also kept
    // marked eligible: false, since FOBLES_PAGES still says Fobles shouldn't show here regardless.
    skip: true,
    foblesEligible: false,
  },
  {
    label: "Select Rendering",
    encodedPath: "/sitecore/shell/default.aspx?xmlcontrol=Sitecore.Shell.Applications.Dialogs.SelectRendering",
    uiPath: "CE -> Presentation -> Details -> Edit -> Controls -> Change",
    toolbarType: "compact",
    // Confirmed live: this xmlcontrol itself returns a server-side 500 on the "ai" environment -
    // skip until that's investigated, same as TreeListEx Editor/Device Editor above.
    foblesEligible: true,
    skip: true,
    activationGap:
      "Needs BOTH: (1) confirmation of this dialog's tree id convention (unconfirmed, likely " +
      "another custom prefix like TreeListEx Editor above), and (2) a guaranteed test rendering " +
      "item - renderings aren't covered by yml-fobles.CONST.ts at all yet (it only has " +
      "CONTENT/TEMPLATES/MEDIA sections). Needs a dedicated Fobles Testing rendering item created " +
      "and serialized before this can be written.",
  },
  {
    label: "Field Editor",
    // hdl is an ephemeral, session-scoped handle to an in-memory field value - not reusable
    // across test runs, and Fobles' own eligibility check never reads it (findAllowedPage,
    // src/content/guard.ts), so drop it for the same reason as TreeListEx Editor above.
    encodedPath: "/sitecore/shell/applications/field%20editor.aspx?mo=mini",
    uiPath: "Presentation Details -> Edit",
    foblesEligible: true,
    toolbarType: "compact",
    // Confirmed live: this page itself returns a server-side 500 on the "ai" environment - skip
    // until that's investigated, same as TreeListEx Editor/Device Editor/Select Rendering above.
    skip: true,
    activationGap:
      "Field-based dialog (mass field editing), not a tree - Fobles' button mechanism there (if " +
      "any) is a different code path than treeNodeFobles and is unconfirmed/untested.",
  },
] ;
