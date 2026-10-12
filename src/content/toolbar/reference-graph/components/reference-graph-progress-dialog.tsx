import type {
    HarvestProgressStatus,
    ProgressStep,
} from "../../../sitecore-harvester/sitecore-harvester.types";

export type ProgressItem = ProgressStep & {
    status: HarvestProgressStatus | "pending";
};

type ReferenceGraphProgressDialogProps = {
    steps: ProgressItem[];
    onCancel: () => void;
};

export function ReferenceGraphProgressDialog({
    steps,
    onCancel,
}: ReferenceGraphProgressDialogProps) {
    return (
        <>
            <div className="fobles-reference-graph-progress-steps">
                {steps.map((step) => (
                    <div key={step.stepKey}>
                        {step.status === "complete" ? "✓" : "○"}{" "}
                        {step.label}
                        {step.status === "skipped" ? " - Skipped" : ""}
                    </div>
                ))}
            </div>

            <div className="fobles-reference-graph-progress-action">
                <button
                    type="button"
                    className="fobles-reference-graph-progress-cancel"
                    onClick={onCancel}
                >
                    Cancel
                </button>
            </div>
        </>
    );
}