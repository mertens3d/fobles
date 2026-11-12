import type { SitecoreHarvestFiltersState } from "../../../constants/_base/_base.types";
import type { StepKey } from "../../../constants/constants.types";
import type { HarvestProgressCallback, HarvestProgressStatus } from "../harvesting/sitecore-harvester.types";
import type { WorkSession } from "../workers/session/work-session.types";
import type { PreparedReferenceModel } from "./acquisition/acquisition.types";
import type { ReferenceModelHarvestProgress, ReferenceModelProcessingProgress, ReferenceModelSessionStateChange } from "./processing/processing.types";
import type { PhaseProgress } from "./progress/lifecycle.types";
import type { openFoblesDataSession } from "./reference-data-service";

export type FoblesDataAcquisition = FoblesDataSession;

export type LegacyOptions = Parameters<typeof openFoblesDataSession>[0];

export type FoblesDataAcquisitionOptions = Omit<LegacyOptions, "workSession"> & { workOperation: WorkSession };

export type FoblesDataFlavor = "reference-model";

export type FoblesDataRequest = {
  flavor: FoblesDataFlavor;
  target: "current-object";
  doc: Document;
  workSession: WorkSession;
  signal: AbortSignal;
  filters: SitecoreHarvestFiltersState;
  onAcquireProgress?: HarvestProgressCallback;
  onHarvestRequired?: () => void;
  onModelReady?: (model: PreparedReferenceModel) => void;
};

export type FoblesReferenceModelData = {
  itemId: string;
  model: PreparedReferenceModel;
  resolveCandidateTreeNodeIds: ReadonlySet<string>;
  cacheRevalidationResultByTreeNodeId: ReadonlyMap<string, "passed" | "error">;
};

export type FoblesDataSession = {
  data: FoblesReferenceModelData;
  completion: Promise<void>;
  subscribeChange: (listener: ReferenceModelSessionStateChange) => () => void;
  subscribeProcessingProgress: (listener: (progress: ReferenceModelProcessingProgress) => void) => () => void;
  subscribeHarvestProgress: (listener: (progress: ReferenceModelHarvestProgress) => void) => () => void;
  updateFilters: (filters: SitecoreHarvestFiltersState) => void;
  dispose: () => void;
};

export type FoblesAcquisitionProgress = { harvestRequired: boolean; progress: PhaseProgress };

export type AcquisitionProgressListener = (progress: FoblesAcquisitionProgress) => void;

export type AcquisitionState = {
  harvestRequired: boolean;
  finished: boolean;
  statusByStepKey: Map<StepKey, HarvestProgressStatus>;
  listeners: Set<AcquisitionProgressListener>;
};
