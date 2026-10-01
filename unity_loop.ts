import { Action } from "./lib/action.ts";
import { UnityHistory } from "./lib/history.ts";
import {
  UnityReportElementState,
  updateUnityResult,
} from "./unity_loop_helper.ts";
import {
  DilationTree,
  DT_EXTRAS,
  DT_STAGES,
} from "./lib/dilation_tree.ts";
import {
  States,
  Planet,
  UnityZodiac,
  MineralUpgradeType,
  PolishUpgradeType,
} from "./lib/states.ts";
import {
  BigNum,
  GlobalVar,
  pollFor,
  range,
  UnityDirection,
  type Range,
} from "./lib/utils.ts";


declare const rev: Readonly<Rev & {
  ui: {
    "mineralElapsedClock": RevUiElement;
    "unityReport": RevUiElement<UnityReportElementState>;
  };
}>;


const PauseStart    = new GlobalVar<number>("pauseStart");
const PauseDuration = new GlobalVar<number>("pauseDuration");
const UnityStart    = new GlobalVar<number>("unityStart");
const MineralStart  = new GlobalVar<number>("mineralStart");


export async function beforePause() {
  PauseStart.set(Date.now());
}


export async function afterResume() {
  const pauseStart = await PauseStart.get() ?? 0;
  PauseDuration.update(value => (value ?? 0) + (Date.now()-pauseStart));
}


export async function afterLoad() {
  rev.resize(1725, 600);
  console.clear();
  Action.dismiss.loopDetached();
  Action.confirm.loopDetached();
  await loadConfig();

  { // setup mineral elapsed clock
    await Action.unity.minerals.ensureCanSkip();

    rev.ui("mineralElapsedClock", {
      basedOn: "scene:-552/CANVAS[0]/safe_area[0]/views[1]/unity[3]/content[0]/panel[1]/views[0]/minerals[3]/content[0]/views[0]/main[0]/background[0]/background[0]",
      posX: 10,
      posY: -70,
      text: "Elapsed: -",
    });

    rev.daemon("mineralElapsedClock", async function() {
      const MineralStart = new GlobalVar<number>("mineralStart");

      while (true) {
        await rev.sleep(100);

        try {
          if (!rev.ui.mineralElapsedClock) continue;
          const mineralStartTime = await MineralStart.get() ?? Date.now();
          const elapsed = Date.now() - mineralStartTime;
          rev.ui.mineralElapsedClock.text = `Elapsed: ${(elapsed/1000).toFixed(1)}s`;
        }

        catch (e) {
          console.error(e);
        }
      }
    });
  }

  { // setup unity run report
    const LAST_DEFAULT_REPORT = "Last Run: Loading...";

    rev.ui("unityReport", {
      hidden: true,
      font: "Consolas",
      color: [0x44, 0x44, 0x44],
      border: {
        thickness: 2,
        color: [0x33, 0x33, 0x33],
      },
      corner: {
        radius: 4,
      },
      posX: 10,
      posY: 10,
      padding: {
        thickness: 10,
      },
      states: {
        expanded: true,
      },
    }).setOnClick(async function() {
      using _ = await rev.mutex("unityReportExpandedUpdate")
      const expanded = this.states.expanded === true;
      this.states.expanded = !expanded;
      await updateUnityResult();
    });

    rev.daemon("unityReport", async function() {
      while (true) {
        await rev.sleep(100);
        try {
          using _ = await rev.mutex("unityReportExpandedUpdate")
          await updateUnityResult();
        }
        catch (e) { console.error(e); }
      }
    });
  }

  (async () => {
    while (true) {
      try { await zodiacMaintenance(); }
      catch (e) { console.error(e); }
      await rev.sleep(1000);
    }
  })().catch(e => console.error("Error in zodiac maintenance loop:", e));

  (async () => {
    while (true) {
      try { await attackMaintenance(); }
      catch (e) { console.error(e); }
      await rev.sleep(1000);
    }
  })().catch(e => console.error("Error in attack maintenance loop:", e));

  (async () => {
    while (true) {
      try { await mineralMaintenance(); }
      catch (e) { console.error(e); }
      await rev.sleep(1000);
    }
  })().catch(e => console.error("Error in mineral maintenance loop:", e));
}


export type ZodiacAction =
  | { type: "equip"; slot: number; planet: keyof typeof Planet }
  | { type: "takeOff", planet: keyof typeof Planet, onFull?: { type: "sell" | "sacrifice", slot: number } }
  | { type: "merge"; slots: [number, number, number] }
  | { type: "enhance"; slot: number; onFail?: ZodiacAction }
  | { type: "reforge"; slot: number; onFail?: ZodiacAction }
  | { type: "sacrifice"; slot: number }
  | { type: "sell"; slot: number };

export type ZodiacSnapshot = {
  inventory: Record<string, UnityZodiac>;
  planets:   Partial<Record<keyof typeof Planet, UnityZodiac>>;
};

export type Config = {
  shouldUnite?: (elapsed: number) => Promise<boolean>;
  shouldReset?: (elapsed: number) => Promise<boolean>;
  uniteWith?: () => Promise<Exclude<keyof typeof Action.main.unit, keyof Action>>;
  nextZodiacAction?: (state: ZodiacSnapshot) => Promise<ZodiacAction | null>;
  relicsToBuy?: () => Promise<number[]>;
  mineralUpgradesToBuy?: () => Promise<MineralUpgradeType[]>;
  shouldPolishPrestige?: (elapsed: number) => Promise<boolean>;
  weaponsToBuy?: () => Promise<PolishUpgradeType[]>;
};

let config: Config;
async function loadConfig() {
  config = (await import("./setup2.ts")).default;
}


let states: {
  eternityBootstrapped?: boolean,
  allECCompleted?:       boolean,
  dilationBootstrapped?: boolean,
  finish40DTP?:          boolean,
  completeFullTree?:     boolean,
  lastAttackCheck?:      number,
} = {};


export default async function main() {
  // hot reload config whenever updated
  await loadConfig();

  // get the elapsed time
  await UnityStart.update(value => value ?? Date.now());
  await PauseDuration.update(value => value ?? 0);
  const elapsed = (Date.now()
    - (await UnityStart.get())!
    - (await PauseDuration.get())!);

  // unit if the config indicates so
  if (await config.shouldUnite?.(elapsed)) {
    if (!config.uniteWith) {
      console.error("uniteWith must be defined to enable unite");
      rev.stop();
      return;
    }

    const direction = await config.uniteWith();
    const history = new UnityHistory(
      elapsed,
      await States.nextGold(),
      (await States.attackLevel()).level,
      (await States.nextUnityZodiacs())[UnityDirection[direction]]);

    try { await Action.main.unit[direction](); }
    catch (e) {
      console.error(`Errored when uniting zodiac:\n${e}`);
      return;
    }

    history.print();
    await history.pushGlobal();
    await UnityStart.set(Date.now());
  }

  // reset the game if the config indicates so
  else if (await config.shouldReset?.(elapsed)) {
    await Action.unity.trial.reset();
    await rev.sleep(100);
  }

  // initialize states for new run
  if (await States.currentEP().then(v => v.isZero)) {
    await PauseDuration.set(0);
    await PauseStart.set(0);
    states = {};
  }

  // main loop logic goes here
  try {
    if (!await bootstrapEternity() .catch(e => console.error(`Errored when bootstrapping eternity:\n${e}`))) return;
    if (!await bootstrapDilation() .catch(e => console.error(`Errored when bootstrapping dilation:\n${e}`))) return;
    if (!await finishDTP40Loadout().catch(e => console.error(`Errored when finishing dilation:\n${e}`))) return;
    await finishSpendingDTP();
  } catch (e) {
    console.error(`Errored in main loop:\n${e}`);
  }
}


async function zodiacMaintenance() {
  let so: ScreenOwnership | undefined;

  try {
    while (true) {
      const action = await config.nextZodiacAction?.({
        inventory: await States.unityZodiacInventory(),
        planets:   await States.planetZodiacInventory(),
      });

      if (!action) break;
      so ??= await rev.screenOwnership("Zodiac maintenance");
      await execute(action);
    }
  } finally {
    so?.release();
  }


  async function execute(action: ZodiacAction) {
    switch (action.type) {
      case "equip":
        console.log(`Equipping zodiac from slot ${action.slot} to planet ${action.planet}`);
        await Action.unity.astrology.planet.moveZodiac(action.slot, action.planet);
        break;

      case "takeOff": {
        console.log(`Taking off zodiac from planet ${action.planet}`);
        if (await Action.unity.astrology.planet.takeOff(action.planet))
          break;
        if (!action.onFull)
          throw new Error(`No inventory space to take off ${action.planet}`);
        await execute(action.onFull);
        break;
      }

      case "merge":
        console.log(`Merging zodiacs from slots ${action.slots.join(", ")}`);
        await Action.unity.astrology.planetShop.merge(action.slots[0], action.slots[1], action.slots[2]);
        break;

      case "enhance":
      case "reforge": {
        console.log(`Attempting to ${action.type} zodiac in slot ${action.slot}`);
        if (await Action.unity.astrology.planetShop[action.type](action.slot))
          break;
        if (!action.onFail)
          throw new Error(`Failed to ${action.type} and no onFail action provided`);
        await execute(action.onFail);
        break;
      }

      case "sacrifice":
      case "sell":
        console.log(`Selling zodiac from slot ${action.slot}`);
        await Action.unity.astrology.planetShop[action.type](action.slot);
        break;

      default:
        throw new Error(`Unknown action type: ${(action as any).type}`);
    }
  }
}


async function attackMaintenance() {
  const relicsToBuy = (await config.relicsToBuy?.() ?? [])[Symbol.iterator]();

  while (true) {
    await Action.attack.upgradeRings();
    const nextRelic = relicsToBuy.next();
    if (nextRelic.done) break;
    await Action.attack.buyRelics([nextRelic.value]);
  }
}


async function mineralMaintenance() {
  await MineralStart.update(value => value ?? Date.now());
  await Action.unity.minerals.refine.close();

  { // Upgrade mineral upgrades
    let so: ScreenOwnership | undefined;

    for (const type of await config.mineralUpgradesToBuy?.() ?? [])
      if ((await States.mineralUpgrade(type)).canBuy) {
        so ??= await rev.screenOwnership("Upgrading mineral upgrades");
        const key = MineralUpgradeType[type] as keyof typeof MineralUpgradeType;
        await Action.unity.minerals[`upgrade${key}`]();
        await rev.sleep(100);
      }

    so?.release();
  }

  { // Delete minerals too weak and update mineral level based on last gained gold and common minerals
    const lastGainedGold = UnityHistory.getHistories(1).at(0)?.goldGained;
    const commonMinerals = Object.entries(await States.commonMinerals());
    if (lastGainedGold) {
      const curLevel = await States.currentMineralLevel();
      const maxLevel = await States.maxMineralLevel();
      const minOwnedLevel = commonMinerals.length
        ? BigNum.min(...commonMinerals.map(([_, m]) => m.level))
        : maxLevel;
      const rawAffordableLevel = new BigNum(lastGainedGold.exponent - 107n).min(maxLevel);

      // Determine the target mineral level based on affordability and owned minerals
      let level = minOwnedLevel.min(rawAffordableLevel);
      if (rawAffordableLevel.sub(minOwnedLevel).gte(new BigNum(5))) {
        level = rawAffordableLevel;

        // Delete minerals that are below the target level
        for (const [slot, mineral] of commonMinerals) {
          if (mineral.level.lt(level)) {
            await Action.unity.minerals.delete(Number(slot));
            await rev.sleep(100);
          }
        }
      }

      if (curLevel.neq(level)) {
        console.log(`Setting mineral level to ${level.toInt()}`);
        using _so = await rev.screenOwnership("Setting mineral level");
        await Action.unity.minerals.setMineralLevel(level.toBigInt().toString());
        await rev.sleep(100);
      }
    }
  }

  spawn: { // Try to spawn
    const [gold, lvl, cur] = await Promise.all([
      States.currentGold(),
      States.currentMineralLevel(),
      States.currentMineralCost(),
      States.minMineralCost(),
    ]);

    if (gold.exponent - cur.exponent < 3n)
      break spawn;

    using _so = await rev.screenOwnership("Spawning mineral");
    console.log(`Spawning mineral level ${lvl.toInt()} at ${new Date().toISOString()}`);
    await Action.unity.minerals.spawn();
  }

  merge: { // Try to merge minerals
    let canMerge = false;

    const buckets = {} as Record<string, number[]>;
    for (const [slot, mineral] of Object.entries(await States.commonMinerals()))
      canMerge ||= (buckets[mineral.level.toInt()] ??= []).push(Number(slot)) >= 2;
    if (!canMerge) break merge;

    let so: ScreenOwnership | undefined;

    while (canMerge) {
      so ??= await rev.screenOwnership("Merging minerals");

      for (const [level, slots] of Object.entries(buckets))
        if (slots.length >= 2) {
          await Action.unity.minerals.merge(slots[0], slots[1]);
          await rev.sleep(100);
          (buckets[Number(level)+1] ??= []).push(slots[1]);
          buckets[Number(level)] = slots.slice(2);
        }

      canMerge = Object.values(buckets).some(slots => slots.length >= 2);
    }

    so?.release();
  }

  { // Prestige minerals when config indicates so
    const elapsed = Date.now() - (await MineralStart.get() ?? 0);
    if (await config.shouldPolishPrestige?.(elapsed)) {
      using _so = await rev.screenOwnership("Prestige minerals");
      await Action.unity.minerals.polish.prestige();
      await Action.unity.minerals.polish.close();
      await MineralStart.set(Date.now());
    }
  }

  { // Purchase weapons
    let so: ScreenOwnership | undefined;

    for (const type of await config.weaponsToBuy?.() ?? [])
      if ((await States.polishUpgrade(type)).CanBuy) {
        so ??= await rev.screenOwnership("Purchasing weapons");
        const key = PolishUpgradeType[type] as keyof typeof PolishUpgradeType;
        await Action.unity.minerals.polish[key].purchase();
        await rev.sleep(100);
      }

    await Action.unity.minerals.polish.close();

    so?.release();
  }
}


async function bootstrapEternity() {
  states.eternityBootstrapped ??= false;

  // finish bootstrapping eternity if current EP exponent is greater than 150
  if (await States.currentEP().then(v => v.exponent > 50n)) {
    if (!states.eternityBootstrapped) {
      states.eternityBootstrapped = true;
      console.log(`Eternity bootstrapped.`);
    }

    return true;
  }

  // if currently in dilation, exit first and return for next check
  if (await States.inDilation()) {
    await Action.eternity.dilation.toggle().catch(() => {});
    return false;
  }

  console.log("Bootstrapping eternity...");

  // claim IP twice to bootstrap infinity
  for (const _ of range(0, 2)) {
    await pollFor(() => States.nextIP().then(v => v.exponent > 300n));
    await Action.main.claimIP();
  }

  // claim EP four times to bootstrap eternity
  for (const _ of range(0, 4)) {
    await rev.sleep(500);
    await Action.main.claimEP();
  }

  return false;
}


async function bootstrapDilation() {
  states.dilationBootstrapped ??= false;

  // check if bought enough DTP points (5)
  let totalDTP = await States.totalDTP();
  if (totalDTP > 5) {
    if (!states.dilationBootstrapped) {
      states.dilationBootstrapped = true;
      console.log(`Dilation bootstrapped.`);
    }

    return true;
  }

  // toggle dilation twice to raise the score
  await Action.eternity.dilation.toggle();
  await rev.sleep(500);
  await Action.eternity.dilation.toggle();
  await rev.sleep(500);

  // apply the DTP if there are unused points
  totalDTP = Math.min(await States.totalDTP(), 5);
  if (await States.unusedDTP())
    await DilationTree[`DTP${<Range<1, 6>>totalDTP}`].apply();
}


async function finishDTP40Loadout() {
  states.finish40DTP ??= false;

  // finish if current tree is DTP40 or spent point over 40
  if (await DilationTree.DTP40.match() || await States.spentDTP() >= 40) {
    if (!states.finish40DTP) {
      states.finish40DTP = true;
      console.log(`Finished 40 DTP loadout.`);
    }

    return true;
  }

  // get the total DTP, capped at 40
  const totalDTP = Math.min(await States.totalDTP(), 40);
  if (totalDTP === 0) return;

  // prioritize applying the highest stage that is not yet finished
  for (const stage of DT_STAGES.reverse()) {
    if (stage.dtp > totalDTP || await stage.finished()) continue;
    await stage.loadout.apply();
    await pollFor(async () => await stage.finished(), 50, 10000);
    return;
  }

  // apply corresponding loadout
  await DilationTree[`DTP${<Range<5, 41>>totalDTP}`].apply();
  await Action.eternity.dilation.toggle();
  await rev.sleep(4000);
  await Action.eternity.dilation.toggle();
  await rev.sleep(1000);
}


async function finishSpendingDTP() {
  states.completeFullTree ??= false;

  // skip if spent 65 and dilation score is not 0
  if (await States.spentDTP() >= 65 && await States.DilationMaxScore().then(v => !v.isZero)) {
    if (!states.completeFullTree) {
      states.completeFullTree = true;
      console.log(`Completed full tree.`);
    }

    return;
  }

  // get unused dilation points
  const unusedDTP = await States.unusedDTP();

  // raise dilation score if there's no unused DTP
  if (unusedDTP === 0) {
    await Action.eternity.dilation.toggle();
    await rev.sleep(4000);
    await Action.eternity.dilation.toggle();
    return;
  }

  // get current tree
  const currentTree = await DilationTree.current();

  // update the virtual tree according to extra
  for (const _ of range(0, unusedDTP))
    for (const extra of DT_EXTRAS)
      if (currentTree[extra.key] < extra.target) {
        currentTree[extra.key]++;
        break;
      }

  // apply the updated virtual tree
  await currentTree.apply();
  await Action.eternity.dilation.toggle();
  await rev.sleep(4000);
  await Action.eternity.dilation.toggle();
}
