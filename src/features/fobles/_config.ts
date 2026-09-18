import type { FoblesConfig } from "./fobles.types";

export const fieldConfigs: FoblesConfig[] = [
  {
    strategy: "drop-tree",
    // Sitecore AI adds role/aria attributes to the combobox input, while XP keeps the
    // legacy readonly text field + dropdown button pattern. Match both so we don't need
    // a version detector for this field strategy.
    FoblesTopSelector: "input.scComboboxEdit[readonly]",
    additionalElementsToHide: ["img.scComboboxDropDown"],
  },
  {
    strategy: "drop-link",
    FoblesTopSelector: "select.scContentControl.scCombobox",
    sitecoreFieldTypes: ["Drop Link"],
  },
  {
    strategy: "droplist",
    FoblesTopSelector: "select.scContentControl.scCombobox",
    sitecoreFieldTypes: ["Droplist"],
  },
  {
    strategy: "multilist-options",
    FoblesTopSelector: "table.scContentControlMultilist",
  },
  {
    strategy: "multilist-with-search",
    FoblesTopSelector: ".scContentControlSearchListContainer > table.scContentControlMultilist",
  },
  {
    strategy: "tag-list",
    FoblesTopSelector: "table.scContentControl.scContentControlTreelist",
    sitecoreFieldTypes: ["Tag List"],
  },
  {
    strategy: "tree-list",
    FoblesTopSelector: "div.scContentControl.scContentControlTreelist",
  },
  {
    strategy: "treelist-ex",
    FoblesTopSelector: "div.scContentControl.scTreelistEx",
  },
  {
    strategy: "file",
    FoblesTopSelector: "input.scContentControl",
  },
  {
    strategy: "general-link",
    FoblesTopSelector: "input.scContentControl",
    sitecoreFieldTypes: ["General Link", "General Link with Search"],
  },
  {
    strategy: "icon",
    FoblesTopSelector: "input.scContentControl",
    sitecoreFieldTypes: ["Icon"],
  },
  {
    strategy: "image",
    FoblesTopSelector: "input.scContentControlImage",
  },
  {
    strategy: "internal-link",
    FoblesTopSelector: "input.scContentControl",
    sitecoreFieldTypes: ["Internal Link"],
  },
  {
    strategy: "quick-info-section",
    FoblesTopSelector: "td.scEditorSectionPanelCell > table.scEditorQuickInfo",
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
    FoblesTopSelector: "#Links a.scLink[onclick*='item:load']",
  },
  {
    strategy: "template-path",
    FoblesTopSelector: "a.scTemplate span.scTemplatePath",
  },

];
