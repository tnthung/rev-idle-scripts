// Load this script manually. It performs no automatic game actions.
// Optionally paste an exact path to a harmless game control for the final button.
const harmlessControlPath = "";
let invocations = 0;
let maintenance = 0;
let clicks = 0;

export function afterLoad() {
  rev.ui.status = { text: "UI demo", posX: 20, posY: 20, padding: { thickness: 4 }, color: [30, 30, 30, 210] };
  rev.ui.button = {
    text: "Click, hover, then pause", posX: 100, posY: -100,
    lenX: { min: 100, max: 400 }, lenY: 28,
    color: [40, 40, 40, 190],
    border: { thickness: 2, color: [255, 100, 0, 150] },
    corner: { radius: 5, topLeft: 0, bottomLeft: 0 },
    padding: { thickness: 4, left: 0, right: 8 },
    onHover() { if (rev.ui.button) rev.ui.button.color = [0, 120, 0, 190]; },
    onLeave() { if (rev.ui.button) rev.ui.button.color = [40, 40, 40, 190]; },
    async onClick() {
      const button = rev.ui.button;
      if (!button) return;
      button.text = `Click ${++clicks}; paused=${rev.paused}`;
      await rev.sleep(1000);
      if (rev.ui.button === button) button.text = "Click, hover, then pause";
    },
  };
  rev.ui.signal = { posX: 70, posY: -105, lenX: 16, lenY: 16, corner: { radius: 8 }, color: [0, 255, 0] };
  rev.ui.edge = {
    text: "Far edge: resize the window", posX: -20, posY: 20,
    lenX: { min: 120, max: 320 }, padding: { thickness: 6, left: 18 },
    border: { thickness: 2, color: [180, 120, 255] }, corner: { radius: 100 }, color: [30, 30, 60],
    onClick() {
      if (rev.ui.edge) rev.ui.edge.text = rev.ui.edge.text === "Short" ? "Far edge grows with its text" : "Short";
    },
  };
  rev.ui.outline = {
    text: "Change outline", posX: 100, posY: -145, lenX: 150, lenY: 28,
    border: { thickness: 2, color: [255, 0, 0, 130] }, corner: { radius: 5 }, padding: { thickness: 4 },
    onClick() {
      const button = rev.ui.button;
      if (button) button.border = { thickness: button.border?.thickness === 2 ? 10 : 2, color: [255, 100, 0, 150] };
    },
  };
  rev.ui.replace = {
    text: "Delete / recreate signal", posX: 100, posY: -190, lenX: 180, lenY: 28, color: [40, 40, 40],
    onClick() {
      if (rev.ui.signal) delete rev.ui.signal;
      else rev.ui.signal = { posX: 70, posY: -105, lenX: 16, lenY: 16, corner: { radius: 8 }, color: [0, 255, 0] };
    },
  };
  rev.ui.clip = {
    text: "This text must stay inside the padded rounded box", posX: -20, posY: 75,
    lenX: 160, lenY: 30, corner: { radius: 15, topLeft: 0 }, padding: { thickness: 6, left: 20 },
    color: [0, 50, 90], border: { thickness: 3, color: [0, 180, 255, 150] },
  };
  rev.ui.gameControl = {
    text: harmlessControlPath ? "Invoke chosen control" : "Game-control test disabled", posX: 100, posY: -235,
    lenX: 210, lenY: 28, color: [40, 40, 40],
    async onClick() { if (harmlessControlPath) await rev.invoke(harmlessControlPath); },
  };
  rev.ui.stop = { text: "Stop demo", posX: 100, posY: -280, lenX: 100, lenY: 28, color: [120, 20, 20], onClick() { rev.stop(); } };

  // Bounded monitor: continues for one minute, including during pause.
  (async () => {
    for (let tick = 0; tick < 240; tick++) {
      if (rev.ui.status) rev.ui.status.text = `Paused: ${rev.paused}; default: ${invocations}; maintenance: ${maintenance}; monitor: ${tick}`;
      if (rev.ui.signal) rev.ui.signal.color = rev.paused ? [255, 160, 0] : [0, 255, 0];
      await rev.sleep(250);
    }
    if (rev.ui.status) rev.ui.status.text += " (monitor finished)";
  })().catch(console.error);

  (async () => {
    for (let tick = 0; tick < 60; tick++) {
      await rev.ensureRunning();
      maintenance++;
      await rev.sleep(1000);
    }
  })().catch(console.error);
}

export default function() {
  invocations++;
}
