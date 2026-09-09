import type { FobleConfig } from "./foble.types";

export const fieldConfigs: FobleConfig[] = [
  {
    strategy: "drop-tree",
    // Sitecore AI adds role/aria attributes to the combobox input, while XP keeps the
    // legacy readonly text field + dropdown button pattern. Match both so we don't need
    // a version detector for this field strategy.
    FobleTopSelector: "input.scComboboxEdit[readonly]",
    additionalElementsToHide: ["img.scComboboxDropDown"],
  },
  {
    strategy: "drop-link",
    FobleTopSelector: "select.scContentControl.scCombobox",
    sitecoreFieldTypes: ["Drop Link"],
  },
  {
    strategy: "droplist",
    FobleTopSelector: "select.scContentControl.scCombobox",
    sitecoreFieldTypes: ["Droplist"],
  },
  {
    strategy: "multilist-options",
    FobleTopSelector: "table.scContentControlMultilist",
  },
  {
    strategy: "multilist-with-search",
    FobleTopSelector: ".scContentControlSearchListContainer > table.scContentControlMultilist",
  },
  {
    strategy: "tag-list",
    FobleTopSelector: "table.scContentControl.scContentControlTreelist",
    sitecoreFieldTypes: ["Tag List"],
  },
  {
    strategy: "tree-list",
    FobleTopSelector: "div.scContentControl.scContentControlTreelist",
  },
  {
    strategy: "treelist-ex",
    FobleTopSelector: "div.scContentControl.scTreelistEx",
  },
  {
    strategy: "file",
    FobleTopSelector: "input.scContentControl",
  },
  {
    strategy: "general-link",
    FobleTopSelector: "input.scContentControl",
    sitecoreFieldTypes: ["General Link", "General Link with Search"],
  },
  {
    strategy: "icon",
    FobleTopSelector: "input.scContentControl",
    sitecoreFieldTypes: ["Icon"],
  },
  {
    strategy: "image",
    FobleTopSelector: "input.scContentControlImage",
  },
  {
    strategy: "internal-link",
    FobleTopSelector: "input.scContentControl",
    sitecoreFieldTypes: ["Internal Link"],
  },
  {
    strategy: "quick-info-section",
    FobleTopSelector: "td.scEditorSectionPanelCell > table.scEditorQuickInfo",
    candidates: [
      {
        labelStartsWith: "Item ID:",
        sources: [
          {
            selector: "input.scEditorHeaderQuickInfoInput[readonly]",
            valueSource: "value",
            targetKind: "guid",
            wrapperVariant: "quickinfo",
          },
        ],
      },
      {
        labelStartsWith: "Item path:",
        sources: [
          {
            selector: "input.scEditorHeaderQuickInfoInput[readonly]",
            valueSource: "value",
            targetKind: "sitecore-path",
            wrapperVariant: "quickinfo",
          },
        ],
      },
      {
        labelStartsWith: "Template:",
        sources: [
          {
            selector: "a[onclick*='shell:edittemplate']",
            valueSource: "text",
            targetKind: "sitecore-path",
            wrapperVariant: "row",
          },
          {
            selector: "input.scEditorHeaderQuickInfoInputID[readonly]",
            valueSource: "value",
            targetKind: "guid",
            wrapperVariant: "quickinfo",
          },
        ],
      },
    ],
  },
  {
    strategy: "reference-links",
    FobleTopSelector: "#Links a.scLink[onclick*='item:load']",
  },
  {
    strategy: "template-path",
    FobleTopSelector: "a.scTemplate span.scTemplatePath",
  },

];
