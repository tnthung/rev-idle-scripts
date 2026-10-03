// cspell:ignore eters Mult Mults sacri showable infs
import { BigNum } from "./utils.ts";


export type EternalChallengeData = {
  KeyName: string;
  completeDiff: number;
  curDiff: number;
  goal: string; // BigDouble
  inChallenge: boolean;
  Unlocked: boolean;
  num: number;
  penalty: string; // BigDouble
  reward: string; // BigDouble
  rewardPenaltyIT4: string; // BigDouble
  startFrom: keyof typeof StartFromEnum;
}

export class EternalChallenge {
  challengeLevel: number;
  completeDiff: number;
  inChallenge: boolean;
  Unlocked: boolean;

  constructor({ completeDiff, inChallenge, Unlocked, num }: EternalChallengeData) {
    this.challengeLevel = num;
    this.completeDiff = completeDiff;
    this.inChallenge = inChallenge;
    this.Unlocked = Unlocked;
  }
}


export type UnityZodiacData = {
  Element: keyof typeof ZodiacElement;
  IsEmpty: boolean;
  RangeOffset: number;
  Season: keyof typeof ZodiacSeason;
  hasPlanet: boolean;
  level: string; // BigDouble
  locked: boolean;
  planet: UnityPlanetData | null;
  quality: string; // BigDouble
  rarity: keyof typeof ZodiacRarity;
  rarityPlus: string; // BigDouble
  score: string; // BigDouble
  sign: keyof typeof ZodiacSign;
  stats: ZodiacStatData[];
}

export class UnityZodiac {
  Element: ZodiacElement;
  IsEmpty: boolean;
  RangeOffset: number;
  Season: ZodiacSeason;
  hasPlanet: boolean;
  level: BigNum;
  locked: boolean;
  planet: UnityPlanetData | null;
  quality: BigNum;
  rarity: ZodiacRarity;
  rarityPlus: number;
  score: BigNum;
  sign: ZodiacSign;
  stats: ZodiacStat[];
  statMap: Partial<Record<ZodiacStatType, BigNum>>;

  constructor({
    Element,
    IsEmpty,
    RangeOffset,
    Season,
    hasPlanet,
    level,
    locked,
    planet,
    quality,
    rarity,
    rarityPlus,
    score,
    sign,
    stats,
  }: UnityZodiacData) {
    this.Element = ZodiacElement[Element];
    this.IsEmpty = IsEmpty;
    this.RangeOffset = RangeOffset;
    this.Season = ZodiacSeason[Season];
    this.hasPlanet = hasPlanet;
    this.level = new BigNum(level);
    this.locked = locked;
    this.planet = planet;
    this.quality = new BigNum(quality);
    this.rarity = ZodiacRarity[rarity];
    this.rarityPlus = Number(rarityPlus);
    this.score = new BigNum(score);
    this.sign = ZodiacSign[sign];
    this.stats = stats.map(stat => new ZodiacStat(stat));
    this.statMap = Object.fromEntries(this.stats.map(stat => [stat.type, stat.value]));
  }

  get mergeKey() {
    return `${this.Element};${this.rarity};${this.rarityPlus}`;
  }

  hasStat(statType: ZodiacStatType) {
    return this.statMap[statType] !== undefined;
  }
}


export type UnityPlanetData = {
  bonusType: keyof typeof PlanetStatType;
  bonusValue: string; // BigDouble
  type: keyof typeof Planet;
  unlocked: boolean;
}

export class UnityPlanet {
  bonusType: PlanetStatType;
  bonusValue: BigNum;
  type: Planet;
  unlocked: boolean;

  constructor({ bonusType, bonusValue, type, unlocked }: UnityPlanetData) {
    this.bonusType = PlanetStatType[bonusType];
    if (this.bonusType == null) console.log(`planet stat type ${bonusType} is missing from the enum`);
    this.bonusValue = new BigNum(bonusValue);
    this.type = Planet[type];
    this.unlocked = unlocked;
  }
}


export type ZodiacStatData = {
  type: keyof typeof ZodiacStatType;
  value: string; // BigDouble
}

export class ZodiacStat {
  type: ZodiacStatType;
  value: BigNum;

  constructor({ type, value }: ZodiacStatData) {
    this.type = ZodiacStatType[type];
    if (type == null) console.error(`zodiac stat type ${type} is missing from the enum`);
    this.value = new BigNum(value);
  }
}


export type SacriStatData = {
  stat: keyof typeof ZodiacStatType;
  value: string; // BigDouble
  score: string; // BigDouble
  showable: boolean;
}

export class SacriStat {
  type: ZodiacStatType;
  value: BigNum;
  score: BigNum;
  showable: boolean;

  constructor({ stat, value, score, showable }: SacriStatData) {
    this.type = ZodiacStatType[stat];
    if (stat == null) console.error(`sacri stat type ${stat} is missing from the enum`);
    this.value = new BigNum(value);
    this.score = new BigNum(score);
    this.showable = showable;
  }
}


export type AttackLevelData = {
  currentHP: string; // BigDouble
  goldGain: string; // BigDouble
  level: string; // BigDouble
  maxHP: string; // BigDouble
  unlocked: boolean;
}

export class AttackLevel {
  currentHP: BigNum;
  goldGain: BigNum;
  level: number;
  maxHP: BigNum;
  unlocked: boolean;

  constructor({ currentHP, goldGain, level, maxHP, unlocked }: AttackLevelData) {
    this.currentHP = new BigNum(currentHP);
    this.goldGain = new BigNum(goldGain);
    this.level = Number(level);
    this.maxHP = new BigNum(maxHP);
    this.unlocked = unlocked;
  }
}


export type AttackRelicData = {
  ReqLevel: string; // BigDouble
  amount: string; // BigDouble
  baseCost: string; // BigDouble
  buyAmount: string; // BigDouble
  costInc: string; // BigDouble
  effect: string; // BigDouble
  effect_next: string; // BigDouble
  num: number;
  regainedLevelsEst: string; // BigDouble
  sacriEffect: string; // BigDouble
  sacriLevel: string; // BigDouble
  totalCost: string; // BigDouble
  unlocked: boolean;
}

export class AttackRelic {
  ReqLevel: BigNum;
  amount: BigNum;
  baseCost: BigNum;
  buyAmount: BigNum;
  costInc: BigNum;
  effect: BigNum;
  effect_next: BigNum;
  num: number;
  regainedLevelsEst: BigNum;
  sacriEffect: BigNum;
  sacriLevel: BigNum;
  totalCost: BigNum;
  unlocked: boolean;

  constructor({
    ReqLevel,
    amount,
    baseCost,
    buyAmount,
    costInc,
    effect,
    effect_next,
    num,
    regainedLevelsEst,
    sacriEffect,
    sacriLevel,
    totalCost,
    unlocked,
  }: AttackRelicData) {
    this.ReqLevel = new BigNum(ReqLevel);
    this.amount = new BigNum(amount);
    this.baseCost = new BigNum(baseCost);
    this.buyAmount = new BigNum(buyAmount);
    this.costInc = new BigNum(costInc);
    this.effect = new BigNum(effect);
    this.effect_next = new BigNum(effect_next);
    this.num = Number(num);
    this.regainedLevelsEst = new BigNum(regainedLevelsEst);
    this.sacriEffect = new BigNum(sacriEffect);
    this.sacriLevel = new BigNum(sacriLevel);
    this.totalCost = new BigNum(totalCost);
    this.unlocked = unlocked;
  }
}


export type MineralsUpgradeData = {
  buyAmount: string; // BigDouble
  canBuy: boolean;
  cost: string; // BigDouble
  effect: string; // BigDouble
  effectNext: string; // BigDouble
  income: string; // BigDouble
  level: string; // BigDouble
  Maxed: boolean;
  maxLevel: string; // BigDouble
  type: keyof typeof MineralUpgradeType;
  Unlocked: boolean;
}

export class MineralUpgrade {
  buyAmount: BigNum;
  canBuy: boolean;
  cost: BigNum;
  effect: BigNum;
  effectNext: BigNum;
  income: BigNum;
  level: BigNum;
  Maxed: boolean;
  maxLevel: BigNum;
  type: MineralUpgradeType;
  Unlocked: boolean;

  constructor({
    buyAmount,
    canBuy,
    cost,
    effect,
    effectNext,
    income,
    level,
    Maxed,
    maxLevel,
    type,
    Unlocked,
  }: MineralsUpgradeData) {
    this.buyAmount = new BigNum(buyAmount);
    this.canBuy = canBuy;
    this.cost = new BigNum(cost);
    this.effect = new BigNum(effect);
    this.effectNext = new BigNum(effectNext);
    this.income = new BigNum(income);
    this.level = new BigNum(level);
    this.Maxed = Maxed;
    this.maxLevel = new BigNum(maxLevel);
    this.type = MineralUpgradeType[type];
    this.Unlocked = Unlocked;
  }
}


export type CommonMineralData = {
  Desc: string;
  Id: number;
  income: string; // BigDouble
  Name: string;
  KeyDesc: string;
  KeyName: string;
  level: string; // BigDouble
}

export class CommonMineral {
  Id: number;
  income: BigNum;
  Name: string;
  KeyDesc: string;
  KeyName: string;
  level: BigNum;

  constructor({
    Id,
    income,
    Name,
    KeyDesc,
    KeyName,
    level,
  }: CommonMineralData) {
    this.Id = Id;
    this.income = new BigNum(income);
    this.Name = Name;
    this.KeyDesc = KeyDesc;
    this.KeyName = KeyName;
    this.level = new BigNum(level);
  }
}


export type PolishUpgradeData = {
  buyAmount: string; // BigDouble
  CanBuy: boolean;
  cost: string; // BigDouble
  effect: string; // BigDouble
  effectNext: string; // BigDouble
  level: string; // BigDouble
  milestones: Array<boolean>;
  type: keyof typeof PolishUpgradeType;
}

export class PolishUpgrade {
  buyAmount: BigNum;
  CanBuy: boolean;
  cost: BigNum;
  effect: BigNum;
  effectNext: BigNum;
  level: BigNum;
  milestones: Array<boolean>;
  type: PolishUpgradeType;

  constructor({
    buyAmount,
    CanBuy,
    cost,
    effect,
    effectNext,
    level,
    milestones,
    type,
  }: PolishUpgradeData) {
    this.buyAmount = new BigNum(buyAmount);
    this.CanBuy = CanBuy;
    this.cost = new BigNum(cost);
    this.effect = new BigNum(effect);
    this.effectNext = new BigNum(effectNext);
    this.level = new BigNum(level);
    this.milestones = milestones;
    this.type = PolishUpgradeType[type];
  }
}


export type RefineNodeData = {
  Bought: boolean;
  CanBuy: boolean;
  Maxed: boolean;
  Next: RefineNodeData[];
  buyAmount: string; // BigDouble
  cost: string; // BigDouble
  effect: string; // BigDouble
  id: number;
  level: string; // BigDouble
  maxLevel: string; // BigDouble
  next: number[];
  prev: number[];
  unlocked: boolean;
}

export class RefineNode {
  Bought: boolean;
  CanBuy: boolean;
  Maxed: boolean;
  Next: RefineNodeData[];
  buyAmount: BigNum;
  cost: BigNum;
  effect: BigNum;
  id: number;
  level: BigNum;
  maxLevel: BigNum;
  next: number[];
  prev: number[];
  unlocked: boolean;

  constructor({
    Bought,
    CanBuy,
    Maxed,
    Next,
    buyAmount,
    cost,
    effect,
    id,
    level,
    maxLevel,
    next,
    prev,
    unlocked,
  }: RefineNodeData) {
    this.Bought = Bought;
    this.CanBuy = CanBuy;
    this.Maxed = Maxed;
    this.Next = Next;
    this.buyAmount = new BigNum(buyAmount);
    this.cost = new BigNum(cost);
    this.effect = new BigNum(effect);
    this.id = id;
    this.level = new BigNum(level);
    this.maxLevel = new BigNum(maxLevel);
    this.next = next;
    this.prev = prev;
    this.unlocked = unlocked;
  }
}


export type AttacksRevolutionBuyableData = {
  allCost: string; // BigDouble
  amount: number;
  baseCost: string; // BigDouble
  buyAmount: number | "NaN" | "Infinity" | "-Infinity";
  costInc: string; // BigDouble
  maxAmount: number;
  num: number;
  spendable: boolean;
  totalCost: string; // BigDouble
};

export class AttacksRevolutionBuyable {
  allCost: BigNum;
  amount: number;
  baseCost: BigNum;
  buyAmount: number | "NaN" | "Infinity" | "-Infinity";
  costInc: BigNum;
  maxAmount: number;
  num: number;
  spendable: boolean;
  totalCost: BigNum;

  constructor({
    allCost,
    amount,
    baseCost,
    buyAmount,
    costInc,
    maxAmount,
    num,
    spendable,
    totalCost,
  }: AttacksRevolutionBuyableData) {
    this.allCost = new BigNum(allCost);
    this.amount = amount;
    this.baseCost = new BigNum(baseCost);
    this.buyAmount = buyAmount;
    this.costInc = new BigNum(costInc);
    this.maxAmount = maxAmount;
    this.num = num;
    this.spendable = spendable;
    this.totalCost = new BigNum(totalCost);
  }
}


export type AttacksRevolutionData = {
  amount: number | string;
  ascCooldown: boolean;
  ascendPower: string; // BigDouble
  ascension: number | string;
  baseSpeed: number | "NaN" | "Infinity" | "-Infinity";
  CanAscend: boolean;
  CanPurchase: boolean;
  damage: string; // BigDouble
  dmgBaseMult: string; // BigDouble
  dmgBaseMults: Array<string>; // BigDouble
  dmgInitMult: string; // BigDouble
  got: number | "NaN" | "Infinity" | "-Infinity";
  IsActive: boolean;
  IsUnlocked: boolean;
  mult: string; // BigDouble
  multGain: string; // BigDouble
  num: number;
  progress: string; // BigDouble
  speed: number | "NaN" | "Infinity" | "-Infinity";
  speedNext: number | "NaN" | "Infinity" | "-Infinity";
  thisBuyable: AttacksRevolutionBuyableData;
};

export class AttacksRevolution {
  amount: number | string;
  ascCooldown: boolean;
  ascendPower: BigNum;
  ascension: number | string;
  baseSpeed: number | "NaN" | "Infinity" | "-Infinity";
  CanAscend: boolean;
  CanPurchase: boolean;
  damage: BigNum;
  dmgBaseMult: BigNum;
  dmgBaseMults: Array<BigNum>;
  dmgInitMult: BigNum;
  got: number | "NaN" | "Infinity" | "-Infinity";
  IsActive: boolean;
  IsUnlocked: boolean;
  mult: BigNum;
  multGain: BigNum;
  num: number;
  progress: BigNum;
  speed: number | "NaN" | "Infinity" | "-Infinity";
  speedNext: number | "NaN" | "Infinity" | "-Infinity";
  thisBuyable: AttacksRevolutionBuyable;

  constructor({
    amount,
    ascCooldown,
    ascendPower,
    ascension,
    baseSpeed,
    CanAscend,
    CanPurchase,
    damage,
    dmgBaseMult,
    dmgBaseMults,
    dmgInitMult,
    got,
    IsActive,
    IsUnlocked,
    mult,
    multGain,
    num,
    progress,
    speed,
    speedNext,
    thisBuyable,
  }: AttacksRevolutionData) {
    this.amount = amount;
    this.ascCooldown = ascCooldown;
    this.ascendPower = new BigNum(ascendPower);
    this.ascension = ascension;
    this.baseSpeed = baseSpeed;
    this.CanAscend = CanAscend;
    this.CanPurchase = CanPurchase;
    this.damage = new BigNum(damage);
    this.dmgBaseMult = new BigNum(dmgBaseMult);
    this.dmgBaseMults = dmgBaseMults.map((v) => new BigNum(v));
    this.dmgInitMult = new BigNum(dmgInitMult);
    this.got = got;
    this.IsActive = IsActive;
    this.IsUnlocked = IsUnlocked;
    this.mult = new BigNum(mult);
    this.multGain = new BigNum(multGain);
    this.num = num;
    this.progress = new BigNum(progress);
    this.speed = speed;
    this.speedNext = speedNext;
    this.thisBuyable = new AttacksRevolutionBuyable(thisBuyable);
  }
}


export enum ZodiacElement {
  Undefined = -1,
  Fire = 0,
  Earth = 1,
  Wind = 2,
  Water = 3,
  Light = 4,
}


export enum ZodiacSeason {
  Spring = 0,
  Summer = 1,
  Autumn = 2,
  Winter = 3,
  Weather = 4,
}


export enum ZodiacSign {
  Undefined = -1,
  Aries = 0,
  Taurus = 1,
  Gemini = 2,
  Cancer = 3,
  Leo = 4,
  Virgo = 5,
  Libra = 6,
  Scorpio = 7,
  Sagittarius = 8,
  Capricorn = 9,
  Aquarius = 10,
  Pisces = 11,
  Multisign = 12,
}


export enum ZodiacRarity {
  Temperate = -1,
  Garbage = 0,
  Common = 1,
  Uncommon = 2,
  Rare = 3,
  Epic = 4,
  Legendary = 5,
  Mythic = 6,
  Godly = 7,
  Divine = 8,
  Immortal = 9,
  Ethereal = 10,
  Amazing = 11,
  Prime = 12,
  Rainbow = 13,
  Galactic = 14,
  Ultima = 15,
}


export enum ZodiacStatType {
  Undefined = -1,
  MultsGain = 0,
  PromPower = 1,
  CommonExponent = 2,
  AscensionPower = 3,
  LapsSpeed = 4,
  SlowdownPower = 5,
  IPGain = 6,
  InfinityGain = 7,
  GenExponent = 8,
  MultPerBoughtGen = 9,
  StarBase = 10,
  StardustExponent = 11,
  EternityGain = 12,
  EPGain = 13,
  LabMultPower = 14,
  SupernovaReq = 15,
  DPGain = 16,
  FreeLabLevels = 17,
  DTPCost = 18,
  CenterDTUEff = 19,
  Ach29Reward = 20,
  GameSpeed = 21,
  LuckAdd = 22,
  ZodiacQualityMult = 23,
}


export enum PlanetStatType {
  Undefined = -1,
  ZodiacQualityMult,
  LuckMult,
  UnityRewards,
  EternityRewards,
  EternityGain,
  InfinityGain,
  DPMult,
  StarCost,
  GameSpeed,
  LapSpeed,
  SupernovaRewards ,
  DilationUpgradesPower,
}


export enum Planet {
  Sun,
  Mercury,
  Venus,
  Moon,
  Mars,
  Jupiter,
  Saturn,
  Uranus,
  Neptune,
  Pluto,
  Chiron,
  Fortune,
}

export enum PlanetUpper {
  SUN,
  MERCURY,
  VENUS,
  MOON,
  MARS,
  JUPITER,
  SATURN,
  URANUS,
  NEPTUNE,
  PLUTO,
  CHIRON,
  FORTUNE,
}

export enum MineralUpgradeType {
  MaxLevel = 0,
  GridHeight = 1,
  GridWidth = 2,
  FallSpeed = 3,
  LuckBonus = 4,
  QualityBonus = 5,
  GoldGain = 6,
  CommonExponentMult = 7,
  MagnetChance = 8,
  ChanceX2Magnets = 9,
  VPGain = 10,
  PPGain = 11,
  SpawnPlusOne = 12,
  MergePlusTwo = 13,
  MoreMagnets = 14,
}

export enum PolishUpgradeType {
  Sword = 0,
  Axe = 1,
  Spear = 2,
  Bow = 3,
  Knuckles = 4,
}


export enum StartFromEnum {
  Manual = 0,
  Automation = 1,
  Macro = 2,
}


interface StatePoint<D, T, A extends any[] = []> {
  (...args: A): Promise<T>;
}

class StatePoint<D, T, A extends any[] = []> extends Function {
  constructor(
    readonly srcKey: A["length"] extends 0 ? string : ((...args: A) => string),
    readonly mapper: (data: D) => T | Promise<T>
  ) {
    super();
    return new Proxy(this, {
      apply: async (target, _, argumentsList: A) => await target.mapper(await rev.state<D>(
        typeof this.srcKey === "function" ? this.srcKey(...argumentsList) : this.srcKey))
    });
  }

  with(...args: A) {
    return new StatePoint<D, T, []>(
      typeof this.srcKey === "function" ? this.srcKey(...args) : this.srcKey,
      this.mapper);
  }
}


type BulkStateResult<T extends StatePoint<any, any, []>[]> =
  T extends [infer S, ...infer R extends StatePoint<any, any, []>[]]
    ? S extends StatePoint<any, infer V, []> ? [V, ...BulkStateResult<R>] : never : [];

export class States {
  static async getAll<T extends StatePoint<any, any, []>[]>(...sps: T): Promise<BulkStateResult<T>> {
    if (sps.length === 0) return [] as BulkStateResult<T>;
    if (sps.length === 1) return [await sps[0]()] as BulkStateResult<T>;

    const keys = [...new Set<string>(sps.map(p => p.srcKey))];
    const rawResult = (keys.length === 1 ? { [keys[0]]: await rev.state(keys[0]) } : await rev.state(...keys)) as { [key: string]: RevJsonValue };
    return await Promise.all(sps.map(p => p.mapper(rawResult[p.srcKey]))) as BulkStateResult<T>;
  }

  static unlockedAchievements = new StatePoint<number[], Set<number>>("gameData.unlockedAch", v => new Set(v.map(id => id + 1)));

  static infinities = new StatePoint<string, BigNum>("gameData.infinity.infs", v => new BigNum(v));
  static eternities = new StatePoint<string, BigNum>("gameData.eternity.eters", v => new BigNum(v));
  static unities = new StatePoint<string, BigNum>("gameData.unity.unities", v => new BigNum(v));

  static currentIP = new StatePoint<string, BigNum>("IP", v => new BigNum(v));
  static currentEP = new StatePoint<string, BigNum>("EP", v => new BigNum(v));
  static currentDP = new StatePoint<string, BigNum>("gameData.eternity.DP", v => new BigNum(v));
  static currentGold = new StatePoint<string, BigNum>("gameData.attacks.gold", v => new BigNum(v));

  static nextIP = new StatePoint<string, BigNum>("nextIP", v => new BigNum(v));
  static nextEP = new StatePoint<string, BigNum>("nextEP", v => new BigNum(v));
  static nextGold = new StatePoint<string, BigNum>("gameData.attacks.goldOnUnity", v => new BigNum(v));
  static nextUnityZodiacs = new StatePoint<UnityZodiacData[], UnityZodiac[]>("gameData.unity.NextZodiacs", ArrayMapper(UnityZodiac));

  static eternalChallenge = new StatePoint<EternalChallengeData, EternalChallenge, [number]>(n => `gameData.eternity.challenges.${n}`, v => new EternalChallenge(v));
  static eternalChallengeCompletedCount = new StatePoint<number, number>("challengesCompletedCount", v => v);

  static supernovaLevel = new StatePoint<number, number>("gameData.eternity.supernovaLv", v => v);
  static totalAP = new StatePoint<string, BigNum>("gameData.eternity.APbought", v => new BigNum(v));
  static totalDTP = new StatePoint<number, number>("DTP", v => v);
  static unusedDTP = new StatePoint<number, number>("dtpFree", v => v);
  static spentDTP = new StatePoint<number, number>("dtpSpent", v => v);
  static dilationMaxScore = new StatePoint<string, BigNum>("dilationMaxScore", v => new BigNum(v));
  static inDilation = new StatePoint<boolean, boolean>("gameData.eternity.inDilation", v => v);

  static unityLevel = new StatePoint<string, BigNum>("unityLevel", v => new BigNum(v));
  static zodiacInventorySlotCount = new StatePoint<number, number>("gameController.inventory.SlotZodiac.CurrentValue", v => v);
  static unityZodiacInventory = new StatePoint<Partial<Record<number, UnityZodiacData>>, Record<string, UnityZodiac>>("gameData.unity.inventory", ObjectMapper(UnityZodiac));
  static planetZodiacInventory = new StatePoint<Partial<Record<keyof typeof Planet, UnityZodiacData>>, Partial<Record<keyof typeof Planet, UnityZodiac>>>("gameData.unity.planetsInventory", ObjectMapper(UnityZodiac));
  static sacrificeState = new StatePoint<Partial<Record<keyof typeof ZodiacStatType, SacriStatData>>, SacriStat[]>("gameData.unity.sacriStats", ValuesMapper(SacriStat));

  static currentAttackDamage = new StatePoint<string, BigNum>("gameData.attacks.totalAtkMult", v => new BigNum(v));
  static attackRelics = new StatePoint<AttackRelicData[], AttackRelic[]>("gameData.attacks.relics", ArrayMapper(AttackRelic));
  static attackRelic = new StatePoint<AttackRelicData, AttackRelic, [number]>(n => `gameData.attacks.relics.${n}`, v => new AttackRelic(v));
  static attackLevel = new StatePoint<AttackLevelData, AttackLevel>("gameData.attacks.level", v => new AttackLevel(v));
  static maxAttackLevelReached = new StatePoint<string, number>("gameData.attacks.maxLevelReached", Number);
  static attackRevolutions = new StatePoint<AttacksRevolutionData[], AttacksRevolution[]>("gameData.attacks.revolutions", ArrayMapper(AttacksRevolution));
  static attackRevolution = new StatePoint<AttacksRevolutionData, AttacksRevolution, [number]>(n => `gameData.attacks.revolutions.${n}`, v => new AttacksRevolution(v));
  static attackRevolutionMults = new StatePoint<AttacksRevolutionData[], (BigNum | null)[], []>("gameData.attacks.revolutions", v => v.map(x => x.IsActive ? new BigNum(x.mult) : null));
  static attackRevolutionProgressions = new StatePoint<AttacksRevolutionData[], (BigNum | null)[], []>("gameData.attacks.revolutions", v => v.map(x => x.IsActive ? new BigNum(x.progress) : null));
  static attackRevolutionCanBuy = new StatePoint<AttacksRevolutionData, boolean, [number]>(n => `gameData.attacks.revolutions.${n}`, v => v.CanPurchase);

  static currentMineralLevel = new StatePoint<string, BigNum>("gameData.minerals.curMineralLevel", v => new BigNum(v));
  static currentMineralCost = new StatePoint<string, BigNum>("gameData.minerals.curMineralCost", v => new BigNum(v));
  static minMineralCost = new StatePoint<string, BigNum>("gameData.minerals.minMineralCost", v => new BigNum(v));
  static maxMineralLevel = new StatePoint<string, BigNum>("gameData.minerals.maxMineralLevel", v => new BigNum(v));
  static commonMinerals = new StatePoint<Partial<Record<number, CommonMineralData>>, Record<string, CommonMineral>>("gameData.minerals.commonMinerals", ObjectMapper(CommonMineral));
  static mineralUpgrades = new StatePoint<Partial<Record<keyof typeof MineralUpgradeType, MineralsUpgradeData>>, Partial<Record<keyof typeof MineralUpgradeType, MineralUpgrade>>>("gameData.minerals.upgrades", ObjectMapper(MineralUpgrade));
  static mineralUpgrade = new StatePoint<MineralsUpgradeData, MineralUpgrade, [MineralUpgradeType]>(n => `gameData.minerals.upgrades.${MineralUpgradeType[n]}`, v => new MineralUpgrade(v));
  static polishUpgrades = new StatePoint<Partial<Record<keyof typeof PolishUpgradeType, PolishUpgradeData>>, Partial<Record<keyof typeof PolishUpgradeType, PolishUpgrade>>>("gameData.minerals.polishUpgrades", ObjectMapper(PolishUpgrade));
  static polishUpgrade = new StatePoint<PolishUpgradeData, PolishUpgrade, [PolishUpgradeType]>(n => `gameData.minerals.polishUpgrades.${PolishUpgradeType[n]}`, v => new PolishUpgrade(v));
  static refineNodes = new StatePoint<Partial<Record<number, RefineNodeData>>, Record<string, RefineNode>>("gameData.minerals.refineNodes", ObjectMapper(RefineNode));
  static refineNode = new StatePoint<RefineNodeData, RefineNode, [number]>(n => `gameData.minerals.refineNodes.${n}`, v => new RefineNode(v));
}


function ArrayMapper<D, T>(cls: new (data: D) => T) {
  return (arr: D[]) => arr.map(data => new cls(data));
}

function ObjectMapper<K extends string | number, D, T>(cls: new (data: D) => T) {
  return (obj: Partial<Record<K, D>>) => Object.map(obj,
    (key, data: D | undefined) => data && [key, new cls(data)]);
}

function ValuesMapper<D, T>(cls: new (data: D) => T) {
  return (obj: Record<any, D>) => Object.values(obj).map(data => new cls(data));
}
