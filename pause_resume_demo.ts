// Load this script with the game connected, then Run. It only updates its own UI.
// Pause freezes the main counter; Resume continues the same loop and local counter.
// Pause for 3 seconds uses a daemon to resume while main is suspended.
// The manual buttons cancel any pending automatic resume. Stop removes the demo UI.

export function afterLoad() {
  rev.ui("pauseDemoStatus", {
    text: "Pause/resume demo", posX: 20, posY: 60, lenX: 540, lenY: 38,
    size: 18, padding: { thickness: 8 }, color: [30, 45, 65, 240],
  });
  rev.ui("pauseDemoMain", {
    text: "MAIN: waiting for Run", posX: 20, posY: 106, lenX: 540, lenY: 38,
    padding: { thickness: 8 }, color: [35, 55, 85, 240],
  });
  rev.ui("pauseDemoPause", {
    text: "Pause", posX: 20, posY: 152, lenX: 170, lenY: 36,
    padding: { thickness: 8 }, color: [95, 65, 20, 240],
  }).setOnClick(function() {
    rev.ui.pauseDemoAuto!.states.resumeAt = 0;
    rev.pause();
  });
  rev.ui("pauseDemoResume", {
    text: "Resume", posX: 205, posY: 152, lenX: 170, lenY: 36,
    padding: { thickness: 8 }, color: [30, 80, 55, 240],
  }).setOnClick(function() {
    rev.ui.pauseDemoAuto!.states.resumeAt = 0;
    rev.resume();
  });
  rev.ui("pauseDemoAuto", {
    text: "Pause for 3 seconds", posX: 20, posY: 196, lenX: 355, lenY: 36,
    padding: { thickness: 8 }, color: [65, 45, 95, 240], states: { resumeAt: 0 },
  }).setOnClick(function() {
    // UI state is shared between main and background callbacks.
    this.states.resumeAt = Date.now() + 3000;
    rev.pause();
  });
  rev.ui("pauseDemoStop", {
    text: "Stop demo", posX: 390, posY: 152, lenX: 170, lenY: 36,
    padding: { thickness: 8 }, color: [115, 40, 45, 240],
  }).setOnClick(function() { rev.stop(); });

  rev.daemon("pauseDemoMonitor", async function() {
    for (let tick = 1; ; tick++) {
      const resumeAt = Number(rev.ui.pauseDemoAuto!.states.resumeAt);
      if (resumeAt > 0 && Date.now() >= resumeAt) {
        rev.ui.pauseDemoAuto!.states.resumeAt = 0;
        rev.resume();
      }
      // The flag reflects the applied transition, after JavaScript yields.
      rev.ui.pauseDemoStatus!.text = `${rev.paused ? "PAUSED" : "RUNNING"} | background ticks: ${tick}`;
      await rev.sleep(100);
    }
  });
}

export function beforePause() {
  console.log("Pause demo: beforePause");
}

export function afterResume() {
  console.log("Pause demo: afterResume");
}

export default async function() {
  // This local counter survives pause/resume within the same invocation.
  for (let tick = 1; ; tick++) {
    rev.ui.pauseDemoMain!.text = `MAIN: ${tick} ticks (freezes while paused)`;
    await rev.sleep(1000);
  }
}
