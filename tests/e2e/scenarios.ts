export type FoblesExpectation = {
  name: string;
  url: string;
  treeNodeId: string;
  expectedQuickInfoButtons: string[];
};

export const scenarios: readonly FoblesExpectation[] = [
  {
    name: "content-editor-root-item-lbolt",
    url: "/sitecore/shell/Applications/Content%20Editor.aspx?sc_bw=1&fo=0DE95AE4-41AB-4D01-9EB0-67441B7C2450",
    treeNodeId: "BContent0DE95AE441AB4D019EB067441B7C2450",
    expectedQuickInfoButtons: [
      "{0DE95AE4-41AB-4D01-9EB0-67441B7C2450}",
      "/sitecore/content",
      "/sitecore/templates/System/Main section",
    ],
  },
];
