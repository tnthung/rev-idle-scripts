import { demoClick, demoWorker } from "./lib/two_runtime_demo.ts";

// Load this entry file with the game connected, then Run. This demo only updates its own UI.
// 1. Pause during a five-second wait. Main and detached counters freeze; background keeps ticking.
// 2. While paused, click the request and async buttons. Async clicks finish; requests wait for main.
// 3. Resume. The same invocation/token continues. An expired sleep resumes without another five seconds.
// 4. Disable async clicks during a click: setOnClick(null) prevents new calls; the existing call finishes.
// 5. Replace or unregister the worker. Its current run keeps ticking until you click Finish current run.
//    A replacement starts only after that run finishes. Repeated replacements keep only the latest.
// Stop removes all demo UI and ends both runtimes. Reload resets the demo's shared counters.
// Run one copy at a time: rev.global is process-wide, and these keys are specific to this demo.

export function afterLoad() {
  rev.global.twoRuntimeDemoInvocations = 0;
  rev.global.twoRuntimeDemoWorkerRun = 0;
  rev.global.twoRuntimeDemoReleaseThrough = 0;

  rev.ui.demoStatus = {
    text: "Two-runtime demo — starting background…", posX: 20, posY: 60,
    lenX: 640, lenY: 38, size: 18, padding: { thickness: 8 }, color: [30, 45, 65, 240],
  };
  rev.ui.demoInstructions = {
    text: "Pause during a main wait, then try the buttons below. Resume continues the same token.",
    posX: 20, posY: 104, lenX: 640, lenY: 30, padding: { thickness: 6 }, color: [25, 30, 40, 240],
  };
  rev.ui.demoMain = {
    text: "MAIN: waiting for Run and a game connection", posX: 20, posY: 142,
    lenX: 640, lenY: 60, padding: { thickness: 8 }, color: [35, 55, 85, 240],
  };
  rev.ui.demoDetached = {
    text: "DETACHED MAIN: 0 ticks", posX: 20, posY: 210,
    lenX: 640, lenY: 30, padding: { thickness: 6 }, color: [35, 55, 85, 240],
  };
  rev.ui.demoMailbox = {
    text: "Send request to main | sent: 0, handled: 0", posX: 20, posY: 248,
    lenX: 640, lenY: 38, padding: { thickness: 8 }, color: [65, 45, 95, 240],
    states: { sent: 0, handled: 0 },
  };
  rev.ui.demoMailbox.setOnClick!(function() {
    // Element states are shared with main. This handler's locals are not.
    this.states.sent = Number(this.states.sent) + 1;
    this.text = `Send request to main | sent: ${this.states.sent}, handled: ${this.states.handled}`;
    this.color = [95, 55, 120, 240];
  });

  rev.ui.demoAsync = {
    text: "Async click: multiply score by 10 | score: 1e30", posX: 20, posY: 294,
    lenX: 640, lenY: 54, padding: { thickness: 8 }, color: [30, 80, 70, 240],
    states: { started: 0, completed: 0, score: "1e30" },
  };
  // Defined in another module, whose BigNum import is reconstructed in background.
  rev.ui.demoAsync.setOnClick!(demoClick);
  rev.ui.demoAsync.setOnHover!(function() { this.border = { thickness: 2, color: [100, 230, 180] }; });
  rev.ui.demoAsync.setOnLeave!(function() { this.border = { thickness: 0 }; });
  rev.ui.demoToggle = {
    text: "Disable async clicks", posX: 20, posY: 356, lenX: 310, lenY: 34,
    padding: { thickness: 8 }, color: [50, 65, 80, 240], states: { enabled: true },
  };
  rev.ui.demoToggle.setOnClick!(function() {
    this.states.enabled = !this.states.enabled;
    rev.ui.demoAsync!.setOnClick!(this.states.enabled ? demoClick : null);
    this.text = this.states.enabled ? "Disable async clicks" : "Enable async clicks";
  });
  rev.ui.demoStop = {
    text: "Stop demo", posX: 350, posY: 356, lenX: 310, lenY: 34,
    padding: { thickness: 8 }, color: [115, 40, 45, 240],
  };
  rev.ui.demoStop.setOnClick!(function() { rev.stop(); });

  rev.ui.demoWorker = {
    text: "WORKER: starting…", posX: 20, posY: 410, lenX: 640, lenY: 38,
    padding: { thickness: 8 }, color: [65, 55, 30, 240], states: { run: 0 },
  };
  rev.ui.demoRegistry = {
    text: "Worker registered", posX: 20, posY: 454, lenX: 640, lenY: 30,
    padding: { thickness: 6 }, color: [45, 40, 30, 240],
  };
  rev.ui.demoReplace = {
    text: "Replace worker", posX: 20, posY: 492, lenX: 200, lenY: 36,
    padding: { thickness: 8 }, color: [85, 65, 35, 240],
  };
  rev.ui.demoReplace.setOnClick!(function() {
    // Unregistering does not cancel an active run. A fresh registration waits for it.
    delete rev.daemon.demoWorker;
    rev.daemon.demoWorker = demoWorker;
    rev.ui.demoRegistry!.text = "Replacement registered. Finish the current run to let it start.";
  });
  rev.ui.demoUnregister = {
    text: "Unregister worker", posX: 240, posY: 492, lenX: 200, lenY: 36,
    padding: { thickness: 8 }, color: [85, 65, 35, 240],
  };
  rev.ui.demoUnregister.setOnClick!(function() {
    delete rev.daemon.demoWorker;
    rev.ui.demoRegistry!.text = "Unregistered. The current run continues until you finish it.";
  });
  rev.ui.demoFinish = {
    text: "Finish current run", posX: 460, posY: 492, lenX: 200, lenY: 36,
    padding: { thickness: 8 }, color: [85, 65, 35, 240],
  };
  rev.ui.demoFinish.setOnClick!(function() {
    // Cooperative completion is separate from removing the registration.
    rev.global.twoRuntimeDemoReleaseThrough = Number(rev.ui.demoWorker!.states!.run);
  });

  rev.daemon.demoWorker = demoWorker;
  rev.daemon.demoMonitor = async function() {
    for (let tick = 1; ; tick++) {
      rev.ui.demoStatus!.text = `${rev.paused ? "PAUSED" : "RUNNING"} | BACKGROUND: ${tick} ticks | worker registered: ${"demoWorker" in rev.daemon}`;
      rev.ui.demoStatus!.color = rev.paused ? [95, 65, 20, 240] : [30, 70, 55, 240];
      await rev.sleep(250);
    }
  };

  // Ordinary detached work belongs to main. No explicit pause checkpoint is needed.
  (async function() {
    for (let tick = 1; ; tick++) {
      await rev.sleep(1000);
      rev.ui.demoDetached!.text = `DETACHED MAIN: ${tick} ticks — freezes during Pause`;
    }
  })().catch(console.error);
}

export default async function() {
  rev.global.twoRuntimeDemoInvocations = Number(rev.global.twoRuntimeDemoInvocations) + 1;
  const invocation = Number(rev.global.twoRuntimeDemoInvocations);
  const token = Math.random().toString(16).slice(2, 8);

  // These locals, the loop position and the pending await survive Pause/Resume.
  for (let step = 1; step <= 3; step++) {
    rev.ui.demoMain!.text = `MAIN: invocation ${invocation}, token ${token}, step ${step}/3\nAwaiting five seconds — pause now`;
    await rev.sleep(5000);

    // Read shared state after the wait so clicks made during Pause are visible.
    const mailbox = rev.ui.demoMailbox!;
    mailbox.states!.handled = mailbox.states!.sent;
    mailbox.text = `Send request to main | sent: ${mailbox.states!.sent}, handled: ${mailbox.states!.handled}`;
    mailbox.color = [30, 80, 70, 240];
    rev.ui.demoMain!.text = `MAIN: invocation ${invocation}, token ${token}, step ${step}/3\nContinued after await; requests handled`;
    await rev.sleep(1000);
  }
  // Returning permits the host to start another invocation, with a new token.
}
