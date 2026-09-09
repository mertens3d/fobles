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


export type FobleStrategy =
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

export type DroplinkFobleStrategy = Extract<FobleStrategy, "drop-link">;
export type DropTreeFobleStrategy = Extract<FobleStrategy, "drop-tree">;
export type DroplistFobleStrategy = Extract<FobleStrategy, "droplist">;
export type FileFobleStrategy = Extract<FobleStrategy, "file">;
export type GeneralLinkFobleStrategy = Extract<FobleStrategy, "general-link">;
export type IconFobleStrategy = Extract<FobleStrategy, "icon">;
export type ImageFobleStrategy = Extract<FobleStrategy, "image">;
export type InternalLinkFobleStrategy = Extract<FobleStrategy, "internal-link">;
export type MultilistOptionsFobleStrategy = Extract<FobleStrategy, "multilist-options">;
export type MultilistWithSearchFobleStrategy = Extract<FobleStrategy, "multilist-with-search">;
export type QuickInfoSectionFobleStrategy = Extract<FobleStrategy, "quick-info-section">;
export type ReferenceLinksFobleStrategy = Extract<FobleStrategy, "reference-links">;
export type TagListFobleStrategy = Extract<FobleStrategy, "tag-list">;
export type TemplatePathFobleStrategy = Extract<FobleStrategy, "template-path">;
export type TreeListFobleStrategy = Extract<FobleStrategy, "tree-list">;
export type TreelistExFobleStrategy = Extract<FobleStrategy, "treelist-ex">;

export type FobleConfigBase<TStrategy extends FobleStrategy> = {
  strategy: TStrategy;
  FobleTopSelector: string;
  getButtonText?: (element: Element, value: string) => string;
  buttonName?: string;
  sitecoreFieldTypes?: readonly string[];
};

export type DroplinkFoble = FobleConfigBase<DroplinkFobleStrategy>;

export type DropTreeFoble = FobleConfigBase<DropTreeFobleStrategy> & {
  additionalElementsToHide?: string[];
};

export type DroplistFoble = FobleConfigBase<DroplistFobleStrategy>;

export type FileFoble = FobleConfigBase<FileFobleStrategy>;

export type SitecoreGeneralLinkFieldType =
  | "General Link"
  | "General Link with Search";

export type GeneralLinkFoble = FobleConfigBase<GeneralLinkFobleStrategy> & {
  sitecoreFieldTypes: readonly SitecoreGeneralLinkFieldType[];
};

export type IconFoble = FobleConfigBase<IconFobleStrategy>;

export type ImageFoble = FobleConfigBase<ImageFobleStrategy>;

export type InternalLinkFoble = FobleConfigBase<InternalLinkFobleStrategy>;

export type MultilistOptionsFoble = FobleConfigBase<MultilistOptionsFobleStrategy>;

export type MultilistWithSearchFoble = FobleConfigBase<MultilistWithSearchFobleStrategy>;

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

export type QuickInfoSectionFoble = FobleConfigBase<QuickInfoSectionFobleStrategy> & {
  candidates: readonly QuickInfoCandidate[];
};

export type ReferenceLinksFoble = FobleConfigBase<ReferenceLinksFobleStrategy>;

export type TagListFoble = FobleConfigBase<TagListFobleStrategy>;

export type TemplatePathFoble = FobleConfigBase<TemplatePathFobleStrategy>;

export type TreeListFoble = FobleConfigBase<TreeListFobleStrategy>;

export type TreelistExFoble = FobleConfigBase<TreelistExFobleStrategy>;

export type FobleConfig =
  | DroplinkFoble
  | DropTreeFoble
  | DroplistFoble
  | FileFoble
  | GeneralLinkFoble
  | IconFoble
  | ImageFoble
  | InternalLinkFoble
  | MultilistOptionsFoble
  | MultilistWithSearchFoble
  | QuickInfoSectionFoble
  | ReferenceLinksFoble
  | TagListFoble
  | TemplatePathFoble
  | TreeListFoble
  | TreelistExFoble;