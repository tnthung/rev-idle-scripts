import { BigNum } from "./utils.ts";

// This exported handler originates here, not in the entry module that registers it.
// BigNum is an import, so it is available when the handler is reconstructed in background.
// Persist strings in shared state; construct runtime-local class instances inside the callback.
export async function demoClick(this: RevUiElement & { states: Record<string, RevJsonValue> }) {
  this.states.started = Number(this.states.started) + 1;
  this.states.score = new BigNum(this.states.score as string).mul(new BigNum(10)).toString();
  this.text = `Async click | started: ${this.states.started}, completed: ${this.states.completed}\nImported BigNum score: ${this.states.score}`;

  await rev.sleep(2000);

  // Multiple clicks can overlap. Read the current shared counts after yielding.
  this.states.completed = Number(this.states.completed) + 1;
  this.text = `Async click | started: ${this.states.started}, completed: ${this.states.completed}\nImported BigNum score: ${this.states.score}`;
}

export async function demoWorker() {
  rev.global.twoRuntimeDemoWorkerRun = Number(rev.global.twoRuntimeDemoWorkerRun) + 1;
  const run = Number(rev.global.twoRuntimeDemoWorkerRun);
  rev.ui.demoWorker!.states.run = run;
  rev.ui.demoRegistry!.text = `Worker run ${run} started`;

  for (let tick = 1; Number(rev.global.twoRuntimeDemoReleaseThrough) < run; tick++) {
    rev.ui.demoWorker!.text = `WORKER: run ${run}, tick ${tick} — continues during Pause and unregister`;
    await rev.sleep(500);
  }

  rev.ui.demoWorker!.text = `WORKER: run ${run} finished. A queued replacement can now start.`;
}
