import { clearTreeButtons, toggleTreeButtons as toggleTreeButtonsFeature } from "./features/fobles/treeNodeFobles/index";
import { clearFobles, setFoblesDismissHandler, triggerFobles } from "./features/fobles";
import { setAfterFoblesNavigationHandler } from "./features/fobles/helper";

let lightningBoltActive = false;
let foblesActive = false;
let treeButtonsActive = false;

function setFoblesState(nextState: boolean): void {
  foblesActive = nextState;
  if (nextState) {
    triggerFobles(document);
  } else {
    clearFobles(document);
  }
}

function setTreeButtonState(nextState: boolean): void {
  treeButtonsActive = nextState;

  if (nextState) {
    toggleTreeButtonsFeature();
    return;
  }

  clearTreeButtons(document);
}

function turnOffFobles(): void {
  lightningBoltActive = false;
  setTreeButtonState(false);
  setFoblesState(false);
}

setAfterFoblesNavigationHandler(turnOffFobles);
setFoblesDismissHandler(() => {
  if (lightningBoltActive) turnOffFobles();
});

export function toggleLightningBolt(): void {
  const nextState = !lightningBoltActive;
  lightningBoltActive = nextState;

  if (nextState) {
    setTreeButtonState(true);
    setFoblesState(true);
  } else {
    setTreeButtonState(false);
    setFoblesState(false);
  }
}
