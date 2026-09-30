// Load this script manually. It performs no automatic game actions.
// Optionally paste an exact path to a harmless game control for the final button.
const harmlessControlPath = "";

export async function afterLoad() {
  rev.global.demoInvocations = 0;
  rev.global.demoMaintenance = 0;
  rev.global.demoMonitor = 0;

  rev.ui.status = { text: "UI demo", posX: 20, posY: 20, padding: { thickness: 4 }, color: [30, 30, 30, 210] };
  rev.ui.button = {
    text: "Click, hover, then pause", posX: 100, posY: -100,
    lenX: { min: 100, max: 400 }, lenY: 28,
    color: [40, 40, 40, 190], border: { thickness: 2, color: [255, 100, 0, 150] },
    corner: { radius: 5, topLeft: 0, bottomLeft: 0 }, padding: { thickness: 4, left: 0, right: 8 },
    states: { clicks: 0 },
  };
  rev.ui.button.setOnHover!(function() { this.color = [0, 120, 0, 190]; });
  rev.ui.button.setOnLeave!(function() { this.color = [40, 40, 40, 190]; });
  rev.ui.button.setOnClick!(async function() {
    const button = this;
    const clicks = typeof button.states.clicks === "number" ? button.states.clicks + 1 : 1;
    button.states.clicks = clicks;
    button.text = `Click ${clicks}; paused=${rev.paused}`;
    await rev.sleep(1000);
    if (rev.ui.button === button) button.text = "Click, hover, then pause";
  });

  rev.ui.signal = { posX: 70, posY: -105, lenX: 16, lenY: 16, corner: { radius: 8 }, color: [0, 255, 0] };
  rev.ui.edge = {
    text: "Far edge: resize the window", posX: -20, posY: 20,
    lenX: { min: 120, max: 320 }, padding: { thickness: 6, left: 18 },
    border: { thickness: 2, color: [180, 120, 255] }, corner: { radius: 100 }, color: [30, 30, 60],
  };
  rev.ui.edge.setOnClick!(function() { this.text = this.text === "Short" ? "Far edge grows with its text" : "Short"; });
  rev.ui.outline = {
    text: "Change outline", posX: 100, posY: -145, lenX: 150, lenY: 28,
    border: { thickness: 2, color: [255, 0, 0, 130] }, corner: { radius: 5 }, padding: { thickness: 4 },
  };
  rev.ui.outline.setOnClick!(function() {
    const button = rev.ui.button;
    if (!button) return;
    button.border = { thickness: button.border?.thickness === 2 ? 10 : 2, color: [255, 100, 0, 150] };
  });
  rev.ui.replace = {
    text: "Delete / recreate signal", posX: 100, posY: -190, lenX: 180, lenY: 28, color: [40, 40, 40],
  };
  rev.ui.replace.setOnClick!(function() {
    if (rev.ui.signal) delete rev.ui.signal;
    else rev.ui.signal = { posX: 70, posY: -105, lenX: 16, lenY: 16, corner: { radius: 8 }, color: [0, 255, 0] };
  });
  rev.ui.clip = {
    text: "This text must stay inside the padded rounded box", posX: -20, posY: 75,
    lenX: 160, lenY: 30, corner: { radius: 15, topLeft: 0 }, padding: { thickness: 6, left: 20 },
    color: [0, 50, 90], border: { thickness: 3, color: [0, 180, 255, 150] },
  };
  rev.ui.toggleClip = {
    text: "Hide clipped label", posX: -20, posY: 115, lenX: 160, lenY: 28, color: [40, 40, 40],
    states: { hidden: false },
  };
  rev.ui.toggleClip.setOnClick!(function() {
    const clip = rev.ui.clip;
    if (!clip) return;
    const hidden = this.states.hidden !== true;
    this.states.hidden = hidden;
    clip.hidden = hidden;
    this.text = hidden ? "Show clipped label" : "Hide clipped label";
  });
  rev.ui.gameControl = {
    text: harmlessControlPath ? "Invoke chosen control" : "Game-control test disabled", posX: 100, posY: -235,
    lenX: 210, lenY: 28, color: [40, 40, 40], states: { harmlessControlPath },
  };
  rev.ui.gameControl.setOnClick!(async function() {
    const path = this.states.harmlessControlPath;
    if (typeof path === "string" && path) await rev.invoke(path);
  });
  rev.ui.stop = { text: "Stop demo", posX: 100, posY: -280, lenX: 100, lenY: 28, color: [120, 20, 20] };
  rev.ui.stop.setOnClick!(function() { rev.stop(); });

  // Click the first button to change its automatic width; the second follows with a 12px gap.
  rev.ui.variableWidth = {
    text: "Grow me", posX: 100, posY: -325, lenX: { min: 100 }, lenY: 28,
    padding: { thickness: 4, left: 8, right: 8 }, color: [30, 80, 120],
  };
  rev.ui.followWidth = {
    text: "I follow the first", posX: rev.ui.variableWidth.posX! + await rev.ui.variableWidth.width!() + 12,
    posY: rev.ui.variableWidth.posY, lenY: 28,
    padding: { thickness: 4, left: 8, right: 8 }, color: [80, 40, 120],
  };
  rev.ui.variableWidth.setOnClick!(async function() {
    const second = rev.ui.followWidth;
    if (!second) return;
    const text = this.text === "Grow me" ? "Click to shrink this wider button" : "Grow me";
    this.text = text;
    const width = await this.width!();
    if (rev.ui.variableWidth === this && rev.ui.followWidth === second && this.text === text)
      second.posX = this.posX! + width + 12;
  });
  rev.ui.followWidth.setOnClick!(function() { console.log("Following button clicked"); });

  rev.ui.sizeDemo = {
    text: "Font size: 14", size: 14, posX: 100, posY: -370,
    padding: { thickness: 6, left: 10, right: 10 }, color: [60, 50, 100], states: { size: 14 },
  };
  rev.ui.sizeDemo.setOnClick!(function() {
    const size = this.states.size === 14 ? 28 : 14;
    this.states.size = size;
    this.size = size;
    this.text = `Font size: ${size}`;
  });

  rev.ui.onlyInAttack = {
    basedOn: "scene:-284/CANVAS[0]/safe_area[0]/views[1]/attacks[4]/content[0]/panel[0]",
    text: "Only in attack", posX: -10, posY: -10,
  };

  rev.daemon.monitor = async function() {
    for (let tick = 0; tick < 240; tick++) {
      rev.global.demoMonitor = tick;
      const invocations = typeof rev.global.demoInvocations === "number" ? rev.global.demoInvocations : 0;
      const maintenance = typeof rev.global.demoMaintenance === "number" ? rev.global.demoMaintenance : 0;
      if (rev.ui.status) rev.ui.status.text = `Paused: ${rev.paused}; default: ${invocations}; maintenance: ${maintenance}; monitor: ${tick}`;
      if (rev.ui.signal) rev.ui.signal.color = rev.paused ? [255, 160, 0] : [0, 255, 0];
      await rev.sleep(250);
    }
    if (rev.ui.status) rev.ui.status.text += " (monitor finished)";
  };

  (async function() {
    for (let tick = 0; tick < 60; tick++) {
      await rev.ensureRunning();
      rev.global.demoMaintenance = (typeof rev.global.demoMaintenance === "number" ? rev.global.demoMaintenance : 0) + 1;
      await rev.sleep(1000);
    }
  })().catch(console.error);
}

export default function() {
  rev.global.demoInvocations = (typeof rev.global.demoInvocations === "number" ? rev.global.demoInvocations : 0) + 1;
}
