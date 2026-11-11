export type WorkerTaskManagerRow = {
  id: string;
  activityAt: number;
  worker: string;
  status: string;
  task: string;
  target: string;
  workClass: string;
  phase: string;
  outcome: string;
  recoveries: number;
};
