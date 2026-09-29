import { Action } from "./lib/action.ts";
import { UnityHistory } from "./lib/history.ts";
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
  pollFor,
  range,
  UnityDirection,
  type Range,
} from "./lib/utils.ts";


declare const rev: Readonly<Rev & {
  global: {
    unityStart: number;
    pauseDuration: number;
    pauseStart: number;
  };
}>;


export async function beforePause() {
  rev.global.pauseStart = Date.now();
}


export async function afterResume() {
  rev.global.pauseDuration ??= 0;
  rev.global.pauseDuration += rev.global.pauseStart
    ? Date.now() - rev.global.pauseStart : 0;
}


export async function afterLoad() {
  console.clear();
  Action.dismiss.loopDetached();
  Action.eternity.dilationTree.loadout.confirmLoad.loopDetached();
  await loadConfig();
  UnityHistory.init();

  (async () => {
    while (true) {
      await rev.ensureRunning();
      try { await zodiacMaintenance(); }
      catch (e) { console.error(e); }
      await rev.sleep(1000);
    }
  })().catch(e => console.error("Error in zodiac maintenance loop:", e));

  (async () => {
    while (true) {
      await rev.ensureRunning();
      try { await attackMaintenance(); }
      catch (e) { console.error(e); }
      await rev.sleep(1000);
    }
  })().catch(e => console.error("Error in attack maintenance loop:", e));

  (async () => {
    while (true) {
      await rev.ensureRunning();
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
  planets: Record<keyof typeof Planet, UnityZodiac>;
};

export type Config = {
  shouldUnite?: (elapsed: number) => Promise<boolean>;
  shouldReset?: (elapsed: number) => Promise<boolean>;
  uniteWith?: () => Promise<Exclude<keyof typeof Action.main.unit, keyof Action>>;
  nextZodiacAction?: (state: ZodiacSnapshot) => Promise<ZodiacAction | null>;
  relicsToBuy?: () => Promise<number[]>;
  mineralUpgradesToBuy?: () => Promise<MineralUpgradeType[]>;
  shouldPolishPrestige?: () => Promise<boolean>;
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
  rev.global.unityStart ??= Date.now();
  rev.global.pauseDuration ??= 0;
  const elapsed = (Date.now()
    - rev.global.unityStart
    - rev.global.pauseDuration);

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

    history.updateUI();
    history.print();
    history.pushGlobal();
    rev.global.unityStart = Date.now();
  }

  // reset the game if the config indicates so
  else if (await config.shouldReset?.(elapsed)) {
    await Action.unity.trial.reset();
    await rev.sleep(100);
  }

  // initialize states for new run
  if (await States.currentEP().then(v => v.isZero)) {
    rev.global.pauseDuration = 0;
    rev.global.pauseStart = 0;
    states = {};
  }

  // main loop logic goes here
  try {
    if (!await bootstrapEternity()     .catch(e => console.error(`Errored when bootstrapping eternity:\n${e}`))) return;
    if (!await finishEternalChallenge().catch(e => console.error(`Errored when finishing eternal challenge:\n${e}`))) return;
    if (!await bootstrapDilation()     .catch(e => console.error(`Errored when bootstrapping dilation:\n${e}`))) return;
    if (!await finishDTP40Loadout()    .catch(e => console.error(`Errored when finishing dilation:\n${e}`))) return;
    await finishSpendingDTP();
  } catch (e) {
    console.error(`Errored in main loop:\n${e}`);
  }
}


async function zodiacMaintenance() {
  let so: ScreenOwnership | undefined;

  try {
    while (true) {
      await rev.ensureRunning();
      const action = await config.nextZodiacAction?.({
        inventory: await States.unityZodiacInventory(),
        planets:   await States.planetZodiacInventory(),
      });

      if (!action) break;
      so ??= await rev.screenOwnership();
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
    await rev.ensureRunning();
    await Action.attack.upgradeRings();
    const nextRelic = relicsToBuy.next();
    if (nextRelic.done) break;
    await Action.attack.buyRelics([nextRelic.value]);
  }
}


async function mineralMaintenance() {
  let so: ScreenOwnership | undefined;

  { // Upgrade mineral upgrades
    for (const type of await config.mineralUpgradesToBuy?.() ?? []) {
      await rev.ensureRunning();
      if ((await States.mineralUpgrade(type)).canBuy) {
        so ??= await rev.screenOwnership();
        const key = MineralUpgradeType[type] as keyof typeof MineralUpgradeType;
        await Action.unity.minerals[`upgrade${key}`]();
        await rev.sleep(100);
      }
    }
  }

  { // Delete minerals too weak and update mineral level based on last gained gold and common minerals
    await rev.ensureRunning();
    const lastGainedGold = UnityHistory.getHistories(1).at(0)?.goldGained;
    const commonMinerals = Object.entries(await States.commonMinerals());
    updateLvl: if (lastGainedGold) {
      const curLevel = await States.currentMineralLevel();
      const maxLevel = await States.maxMineralLevel();
      const minOwnedLevel = commonMinerals.length
        ? BigNum.min(...commonMinerals.map(([_, m]) => m.level))
        : maxLevel;
      const rawAffordableLevel = new BigNum(lastGainedGold.exponent - 107n).min(maxLevel);

      // Determine the target mineral level based on affordability and owned minerals
      let level = minOwnedLevel;
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

      if (curLevel.eq(level)) break updateLvl;
      so ??= await rev.screenOwnership();
      await Action.unity.minerals.setMineralLevel(level.toBigInt().toString());
      await rev.sleep(100);
    }
  }

  spawn: { // Try to spawn
    await rev.ensureRunning();

    const [gold, lvl, cur] = await Promise.all([
      States.currentGold(),
      States.currentMineralLevel(),
      States.currentMineralCost(),
      States.minMineralCost(),
    ]);

    if (gold.exponent - cur.exponent < 3n)
      break spawn;

    so ??= await rev.screenOwnership();
    console.log(`Spawning mineral level ${lvl.toInt()} at ${new Date().toISOString()}`);
    await Action.unity.minerals.spawn();
  }

  merge: { // Try to merge minerals
    await rev.ensureRunning();

    let canMerge = false;

    const buckets = {} as Record<string, number[]>;
    for (const [slot, mineral] of Object.entries(await States.commonMinerals()))
      canMerge ||= (buckets[mineral.level.toInt()] ??= []).push(Number(slot)) >= 2;
    if (!canMerge) break merge;

    so ??= await rev.screenOwnership();

    while (canMerge) {
      for (const [level, slots] of Object.entries(buckets))
        if (slots.length >= 2) {
          await Action.unity.minerals.merge(slots[0], slots[1]);
          await rev.sleep(100);
          (buckets[Number(level)+1] ??= []).push(slots[1]);
          buckets[Number(level)] = slots.slice(2);
        }

      canMerge = Object.values(buckets).some(slots => slots.length >= 2);
    }
  }

  { // Prestige minerals when config indicates so
    await rev.ensureRunning();
    if (await config.shouldPolishPrestige?.()) {
      so ??= await rev.screenOwnership();
      await Action.unity.minerals.polish.prestige();
      await Action.unity.minerals.polish.close();
    }
  }

  { // Purchase weapons
    await rev.ensureRunning();

    for (const type of await config.weaponsToBuy?.() ?? []) {
      if ((await States.polishUpgrade(type)).CanBuy) {
        so ??= await rev.screenOwnership();
        const key = PolishUpgradeType[type] as keyof typeof PolishUpgradeType;
        await Action.unity.minerals.polish[key].purchase();
        await rev.sleep(100);
      }
    }

    await Action.unity.minerals.polish.close();
  }

  so?.release();
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
    await rev.ensureRunning();
    await pollFor(() => States.nextIP().then(v => v.exponent > 300n));
    await Action.main.claimIP();
  }

  // claim EP four times to bootstrap eternity
  for (const _ of range(0, 4)) {
    await rev.ensureRunning();
    await rev.sleep(500);
    await Action.main.claimEP();
  }

  return false;
}


async function finishEternalChallenge() {
  states.allECCompleted ??= false;

  // going through challenges
  let allComplete = true;

  for (const level of range(0, 10)) while (true) {
    await rev.ensureRunning();

    // skip challenges that finishes all 5 levels
    const ec = await States.eternalChallenge(level);
    if (ec.completeDiff >= 5) break;

    console.log(`Starting eternal challenge level ${ec.challengeLevel + 1}, tier ${ec.completeDiff+1}`);
    allComplete = false;

    // make sure the selected EC is exited
    await Action.eternity.challenges[`selectEC${<Range<1, 11>>(level+1)}`]();
    if (ec.inChallenge) await Action.eternity.challenges.toggle();

    // for first EC10, need to bootstrap dilation first
    if (level === 9 && ec.completeDiff === 0)
      try {
        for (const _ of range(0, 3)) { // toggle 3 times
          await Action.eternity.dilation.toggle();
          await rev.sleep(500);
          await Action.eternity.dilation.toggle();
        }
      } catch {}

    // enter the challenge
    await Action.eternity.challenges.toggle();

    // wait until either the challenge is finished or timed out (10s MAX)
    await pollFor(async () => !(await States.eternalChallenge(level)).inChallenge, 50, 10000);

    // if timeout, start the next EC
    if ((await States.eternalChallenge(level)).inChallenge) {
      await Action.eternity.challenges.toggle();
      break;
    }
  }

  // if not all challenges are complete, keeps farming EP and dilation score
  if (!allComplete) {
    await rev.sleep(1000);
    await Action.main.claimEP();

    try {
      await Action.eternity.dilation.toggle();
      await rev.sleep(500);
      await Action.eternity.dilation.toggle();
    } catch {}

    return false;
  }

  // print a message when all eternal challenges are completed
  if (!states.allECCompleted) {
    states.allECCompleted = true;
    console.log(`All eternal challenges completed.`);
  }

  return true;
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
    await rev.ensureRunning();
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
