import { STORAGE } from "../../../constants/extension-const";
import {
    getStorageValue,
    setStorageValue,
} from "../../../shared/storage/storage";

const DEFAULT_CONTROLS_EXPANDED = true;

export async function getGraphControlsExpanded():
    Promise<boolean> {
    const result = await getStorageValue<unknown>(
        [
            STORAGE.KEY
                .REFERENCE_GRAPH
                .CONTROLS_EXPANDED,
        ],
        "local",
    );

    const storedValue =
        result[
            STORAGE.KEY
                .REFERENCE_GRAPH
                .CONTROLS_EXPANDED
        ];

    let controlsExpanded =
        DEFAULT_CONTROLS_EXPANDED;

    if (typeof storedValue === "boolean") {
        controlsExpanded = storedValue;
    }

    return controlsExpanded;
}

export async function setGraphControlsExpanded(
    controlsExpanded: boolean,
): Promise<void> {
    await setStorageValue(
        {
            [STORAGE.KEY
                .REFERENCE_GRAPH
                .CONTROLS_EXPANDED]:
                controlsExpanded,
        },
        "local",
    );
}