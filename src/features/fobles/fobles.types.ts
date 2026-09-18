export type ButtonConfig = {
  label: string;
  onClick: () => void;
  icon?: string;
};

export type DropdownOption = {
  label: string;
  path?: string;
  url?: string;
  onClick?: () => void;
};

export type DropdownConfig = {
  options: DropdownOption[];
  onSelect: (option: DropdownOption) => void;
  placeholder?: string;
};


export type FoblesStrategy =
  | "drop-link"
  | "drop-tree"
  | "droplist"
  | "file"
  | "general-link"
  | "icon"
  | "image"
  | "internal-link"
  | "multilist-options"
  | "multilist-with-search"
  | "quick-info-section"
  | "reference-links"
  | "tag-list"
  | "template-path"
  | "tree-list"
  | "treelist-ex";

export type DroplinkFoblesStrategy = Extract<FoblesStrategy, "drop-link">;
export type DropTreeFoblesStrategy = Extract<FoblesStrategy, "drop-tree">;
export type DroplistFoblesStrategy = Extract<FoblesStrategy, "droplist">;
export type FileFoblesStrategy = Extract<FoblesStrategy, "file">;
export type GeneralLinkFoblesStrategy = Extract<FoblesStrategy, "general-link">;
export type IconFoblesStrategy = Extract<FoblesStrategy, "icon">;
export type ImageFoblesStrategy = Extract<FoblesStrategy, "image">;
export type InternalLinkFoblesStrategy = Extract<FoblesStrategy, "internal-link">;
export type MultilistOptionsFoblesStrategy = Extract<FoblesStrategy, "multilist-options">;
export type MultilistWithSearchFoblesStrategy = Extract<FoblesStrategy, "multilist-with-search">;
export type QuickInfoSectionFoblesStrategy = Extract<FoblesStrategy, "quick-info-section">;
export type ReferenceLinksFoblesStrategy = Extract<FoblesStrategy, "reference-links">;
export type TagListFoblesStrategy = Extract<FoblesStrategy, "tag-list">;
export type TemplatePathFoblesStrategy = Extract<FoblesStrategy, "template-path">;
export type TreeListFoblesStrategy = Extract<FoblesStrategy, "tree-list">;
export type TreelistExFoblesStrategy = Extract<FoblesStrategy, "treelist-ex">;

export type FoblesConfigBase<TStrategy extends FoblesStrategy> = {
  strategy: TStrategy;
  FoblesTopSelector: string;
  getButtonText?: (element: Element, value: string) => string;
  buttonName?: string;
  sitecoreFieldTypes?: readonly string[];
};

export type DroplinkFobles = FoblesConfigBase<DroplinkFoblesStrategy>;

export type DropTreeFobles = FoblesConfigBase<DropTreeFoblesStrategy> & {
  additionalElementsToHide?: string[];
};

export type DroplistFobles = FoblesConfigBase<DroplistFoblesStrategy>;

export type FileFobles = FoblesConfigBase<FileFoblesStrategy>;

export type SitecoreGeneralLinkFieldType =
  | "General Link"
  | "General Link with Search";

export type GeneralLinkFobles = FoblesConfigBase<GeneralLinkFoblesStrategy> & {
  sitecoreFieldTypes: readonly SitecoreGeneralLinkFieldType[];
};

export type IconFobles = FoblesConfigBase<IconFoblesStrategy>;

export type ImageFobles = FoblesConfigBase<ImageFoblesStrategy>;

export type InternalLinkFobles = FoblesConfigBase<InternalLinkFoblesStrategy>;

export type MultilistOptionsFobles = FoblesConfigBase<MultilistOptionsFoblesStrategy>;

export type MultilistWithSearchFobles = FoblesConfigBase<MultilistWithSearchFoblesStrategy>;

export type QuickInfoSource = {
  selector: string;
  valueSource: "text" | "value";
  targetKind: "guid" | "sitecore-path";
  wrapperVariant: "quickinfo" | "row";
};

export type QuickInfoCandidate = {
  labelStartsWith: string;
  sources: readonly QuickInfoSource[];
};

export type QuickInfoSectionFobles = FoblesConfigBase<QuickInfoSectionFoblesStrategy> & {
  candidates: readonly QuickInfoCandidate[];
};

export type ReferenceLinksFobles = FoblesConfigBase<ReferenceLinksFoblesStrategy>;

export type TagListFobles = FoblesConfigBase<TagListFoblesStrategy>;

export type TemplatePathFobles = FoblesConfigBase<TemplatePathFoblesStrategy>;

export type TreeListFobles = FoblesConfigBase<TreeListFoblesStrategy>;

export type TreelistExFobles = FoblesConfigBase<TreelistExFoblesStrategy>;

export type FoblesConfig =
  | DroplinkFobles
  | DropTreeFobles
  | DroplistFobles
  | FileFobles
  | GeneralLinkFobles
  | IconFobles
  | ImageFobles
  | InternalLinkFobles
  | MultilistOptionsFobles
  | MultilistWithSearchFobles
  | QuickInfoSectionFobles
  | ReferenceLinksFobles
  | TagListFobles
  | TemplatePathFobles
  | TreeListFobles
  | TreelistExFobles;

export type SingleInputFieldOptions = {
  actionPrefix: string;
  buttonClass: string;
  wrapperClass: string;
  getTarget: (value: string) => string | null;
};