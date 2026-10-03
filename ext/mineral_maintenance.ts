import { Action } from "../lib/action.ts";
import {
  BigNum,
  GlobalVar,
  screenScope,
  ScreenScopeGuard,
  Timer,
} from "../lib/utils.ts";
import {
  States,
  PolishUpgradeType,
} from "../lib/states.ts";


declare const rev: Readonly<RevWithUi<{
  mineralElapsedClock: {
    prestigeElapsed: number | null;
    lastCommonSpawnPassed: number | null;
  };
  mineralMaintenanceToggle: {
    enabled: boolean | null;
  };
}>>;


export const MINERAL_SLOT_VIEW = "scene:-684/CANVAS[0]/safe_area[0]/views[1]/unity[3]/content[0]/panel[1]/views[0]/minerals[3]/content[0]/views[0]/main[0]/ctn_left[1]/ctn_minerals[1]/views[0]/scrollview_common[0]/viewport[0]";

export const mineralMaintenanceEnabled = new GlobalVar<boolean>("mineralMaintenanceEnabled");
export const refineNode22Bought        = new GlobalVar<boolean>("refineNode22Bought");

const mineralLoopTimer        = new Timer(true);
const commonMineralSpawnTimer = new Timer(true);

export async function onLoad() {
  await Action.unity.minerals.ensureCanSkip();

  rev.ui("mineralElapsedClock", {
    basedOn: MINERAL_SLOT_VIEW,
    posX: 0,
    posY: -15,
    font: "Consolas",
    states: {
      prestigeElapsed: null,
      lastCommonSpawnPassed: null,
    },
  }).setOnStateUpdate(function () {
    const prestigeElapsed = typeof this.states.prestigeElapsed === "number"
      ? (this.states.prestigeElapsed / 1000).toFixed(2) : "-";

    const lastCommonSpawnPassed = typeof this.states.lastCommonSpawnPassed === "number"
      ? (this.states.lastCommonSpawnPassed / 1000).toFixed(2) : "-";

    this.text = [
      `Last Common Spawn Passed: ${lastCommonSpawnPassed}s`,
      `Current Prestige Elapsed: ${prestigeElapsed}s`,
    ].join("\n");
  });

  (async () => {
    while (true) {
      rev.ui("mineralElapsedClock", {
        states: {
          prestigeElapsed: mineralLoopTimer.getElapsed(),
          lastCommonSpawnPassed: commonMineralSpawnTimer.getElapsed(),
        },
      });

      await rev.sleep(100);
    }
  })();

  rev.ui("mineralMaintenanceToggle", {
    basedOn: MINERAL_SLOT_VIEW,
    posX: 0,
    posY: -50,
    corner: { radius: 5 },
    font: "Consolas",
    padding: { thickness: 5 },
    states: { enabled: null },
  }).setOnStateUpdate(function() {
    this.color = this.states.enabled ? [31, 138, 74] : [199, 69, 57];
    this.text = this.states.enabled ? "Enabled" : "Disabled";
  }).setOnClick(async function() {
    this.states.enabled = !this.states.enabled;
    await mineralMaintenanceEnabled.set(this.states.enabled);
  });

  rev.ui.mineralMaintenanceToggle!.states.enabled = await mineralMaintenanceEnabled.getOrSet(false);
}


export async function onUnload() {
  rev.daemon("mineralElapsedClock", null);
  rev.ui("mineralElapsedClock", null);
}

export async function onPoll() {
  if (!await mineralMaintenanceEnabled.get()) {
    mineralLoopTimer.stop();
    commonMineralSpawnTimer.stop();
    return;
  }

  if (mineralLoopTimer.stopped()) mineralLoopTimer.restart();
  if (commonMineralSpawnTimer.stopped()) commonMineralSpawnTimer.restart();

  const refineNode22 = await States.refineNode(21);
  await refineNode22Bought.set(refineNode22.Bought);

  await screenScope("Mineral Maintenance", async so => {
    await adjustCommonMineralSpawnLevel(so);
    await mergeCommonMinerals(so);
    await refinePrestige(so);
    await polishPrestige(so);
  });
}


// -------------------- Steps --------------------
const MAX_COMMON_MINERAL_LEVEL_LAG = 5;

async function adjustCommonMineralSpawnLevel(so: ScreenScopeGuard) {
  const [gold, raw, cur, max] = await States.getAll(
    States.currentGold,
    States.commonMinerals,
    States.currentMineralLevel,
    States.maxMineralLevel);

  const commonMinerals = Object.entries(raw);
  const affordableLevel = new BigNum(gold.exponent - 107n).min(max);

  for (const [slot, mineral] of commonMinerals)
    if (affordableLevel.sub(mineral.level).gt(MAX_COMMON_MINERAL_LEVEL_LAG)) {
      if (!await mineralMaintenanceEnabled.get()) return;
      await so("Delete weak common minerals");
      await Action.unity.minerals.delete(Number(slot)).catch(() => {});
    }

  const minOwnedLevel = await minCommonMineralLevel();
  const targetLevel = affordableLevel.min(minOwnedLevel);
  if (cur.eq(targetLevel)) return;

  if (!await mineralMaintenanceEnabled.get()) return;
  await so("Adjusting common mineral spawn level");
  await Action.unity.minerals.setMineralLevel(targetLevel.toBigInt().toString());
}


async function spawnCommonMinerals(so: ScreenScopeGuard) {
  const [gold, cur] = await States.getAll(
    States.currentGold,
    States.currentMineralCost);

  // Skip spawning when gold is less than the current mineral cost.
  // Only apply this check if refineNode22 has been bought, because
  // RN22 making spawning common minerals not costing gold.
  if (await refineNode22Bought.get()) {
    if (gold.lt(cur)) return;
  }

  // Skip spawning when cost too much relative to owned gold.
  else if (gold.exponent - cur.exponent < 2n) return;

  if (!await mineralMaintenanceEnabled.get()) return;
  await so("Spawning common minerals");
  await Action.unity.minerals.spawnCommon();
  commonMineralSpawnTimer.restart();
}


async function mergeCommonMinerals(so: ScreenScopeGuard) {
  while (true) {
    await spawnCommonMinerals(so);

    const buckets = {} as Record<string, number[]>;
    for (const [slot, mineral] of Object.entries(await States.commonMinerals()))
      (buckets[mineral.level.toInt()] ??= []).push(Number(slot));

    const groups = Object.entries(buckets).filter(([_, s]) => s.length >= 2);
    if (groups.length === 0) break;

    for (const [_, slots] of groups) {
      if (!await mineralMaintenanceEnabled.get()) return;
      await so("Merging common minerals");
      const [slot1, slot2] = slots.splice(0, 2).map(Number);
      await Action.unity.minerals.merge(slot1, slot2).catch(() => {});
      await rev.sleep(100);
    }
  }
}


const REFINE_POLISH_THRESHOLD = 100;
const REFINE_PRESTIGE_SPAWN_TIMEOUT = 1000 * 1.5;

async function refinePrestige(so: ScreenScopeGuard) {
  if (commonMineralSpawnTimer.getElapsed() < REFINE_PRESTIGE_SPAWN_TIMEOUT) return;
  if ((await maxCommonMineralLevel()).lt(REFINE_POLISH_THRESHOLD)) return;

  if (!await mineralMaintenanceEnabled.get()) return;
  await so("Refining prestige minerals");
  await Action.unity.minerals.refine.prestige();
  await Action.unity.minerals.refine.close().catch(() => {});
  await rev.sleep(100);
  resetMineralTimers();
}


const POLISH_PRESTIGE_SPAWN_TIMEOUT = 1000 * 1.5;

const WEAPON_UPGRADES_TO_BUY = [
  PolishUpgradeType.Sword,
  PolishUpgradeType.Knuckles,
  PolishUpgradeType.Bow,
  PolishUpgradeType.Spear,
  PolishUpgradeType.Axe,
];

async function polishPrestige(so: ScreenScopeGuard) {
  if (commonMineralSpawnTimer.getElapsed() < POLISH_PRESTIGE_SPAWN_TIMEOUT) return;
  if ((await maxCommonMineralLevel()).gte(REFINE_POLISH_THRESHOLD)) return;

  if (!await mineralMaintenanceEnabled.get()) return;
  await so("Polishing prestige minerals");
  await Action.unity.minerals.polish.prestige();

  for (const upgradeType of WEAPON_UPGRADES_TO_BUY)
    if ((await States.polishUpgrade(upgradeType)).CanBuy) {
      if (!await mineralMaintenanceEnabled.get()) return;

      const weapon = PolishUpgradeType[upgradeType] as keyof typeof PolishUpgradeType;
      await so(`Purchasing ${weapon} upgrade`);
      await Action.unity.minerals.polish[weapon].purchase().catch(() => {});
      await rev.sleep(100);
    }

  await Action.unity.minerals.polish.close().catch(() => {});
  await rev.sleep(100);
  resetMineralTimers();
}


// -------------------- Helpers --------------------
function resetMineralTimers() {
  mineralLoopTimer.restart();
  if (rev.ui.mineralElapsedClock)
    rev.ui.mineralElapsedClock.states.prestigeElapsed = 0;
}

async function maxCommonMineralLevel() {
  const commonMinerals = await States.commonMinerals();
  return BigNum.max(...Object.values(commonMinerals).map(m => m.level), BigNum.ZERO);
}

async function minCommonMineralLevel() {
  const commonMinerals = await States.commonMinerals();
  return BigNum.min(...Object.values(commonMinerals).map(m => m.level), new BigNum("1e100"));
}
