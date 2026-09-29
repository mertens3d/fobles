import { CONST } from "../CONST";

export function logStepDividerStart(name: string) {
  // console.log(`${CONST.LOG.STEP_DIVIDER}`);
  // console.log(`s) ${name}`);
  // console.log(`${CONST.LOG.STEP_DIVIDER}`);
}

export function logTestDividerStart(name: string) {
  console.log(`${CONST.LOG.TEST_DIVIDER}`);
  console.log(`s) ${name}`);
  console.log(`${CONST.LOG.TEST_DIVIDER}`);
}

export function logStepDividerEnd(name: string) {
  // console.log(`e) ${name}`);
}