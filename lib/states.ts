// cspell:ignore eters Mult Mults sacri showable
import { BigNum } from "./utils.ts";


export class States {
  static async unlockedAchievements() {
    // The save uses zero-based IDs; expose the achievement numbers shown in game.
    return new Set((await rev.state<number[]>("gameData.unlockedAch")).map(id => id + 1));
  }

  static async infinities() {
    return new BigNum(await rev.state<string>("gameData.infinity.infs"));
  }

  static async eternities() {
    return new BigNum(await rev.state<string>("gameData.eternity.eters"));
  }

  static async unities() {
    return new BigNum(await rev.state<string>("gameData.unity.unities"));
  }

  static async currentIP() {
    return new BigNum(await rev.state<string>("IP"));
  }

  static async currentEP() {
    return new BigNum(await rev.state<string>("EP"));
  }

  static async currentDP() {
    return new BigNum(await rev.state<string>("gameData.eternity.DP"));
  }

  static async currentGold() {
    return new BigNum(await rev.state<string>("gameData.attacks.gold"));
  }

  static async nextIP() {
    return new BigNum(await rev.state<string>("nextIP"));
  }

  static async nextEP() {
    return new BigNum(await rev.state<string>("nextEP"));
  }

  static async nextGold() {
    return new BigNum(await rev.state<string>("gameData.attacks.goldOnUnity"));
  }

  static async supernovaLevel() {
    return await rev.state<number>("gameData.eternity.supernovaLv");
  }

  static async totalAP() {
    return new BigNum(await rev.state<string>("gameData.eternity.APbought"));
  }

  static async DilationMaxScore() {
    return new BigNum(await rev.state<string>("dilationMaxScore"));
  }

  static async inDilation() {
    return await rev.state<boolean>("gameData.eternity.inDilation");
  }

  static async totalDTP() {
    return await rev.state<number>("DTP");
  }

  static async unusedDTP() {
    return await rev.state<number>("dtpFree");
  }

  static async spentDTP() {
    return await rev.state<number>("dtpSpent");
  }

  static async unityLevel() {
    return new BigNum(await rev.state<string>("unityLevel"));
  }

  static async unityZodiacInventory(): Promise<Record<string, UnityZodiac>> {
    return Object.map(await rev.state<Partial<Record<number, UnityZodiacData>>>("gameData.unity.inventory"),
      (key, value) => value && [key, new UnityZodiac(value)]);
  }

  static async planetZodiacInventory(): Promise<Partial<Record<keyof typeof Planet, UnityZodiac>>> {
    return Object.map(await rev.state<Partial<Record<keyof typeof Planet, UnityZodiacData>>>("gameData.unity.planetsInventory"),
      (key, value) => value && [key, new UnityZodiac(value)]);
  }

  static async attackRelics() {
    return (await rev.state<AttackRelicData[]>("gameData.attacks.relics"))
      .map(relic => new AttackRelic(relic));
  }

  static async attackRelic(n: number) {
    return new AttackRelic((await rev.state<AttackRelicData>(`gameData.attacks.relics.${n}`)));
  }

  static async zodiacInventorySlotCount() {
    return await rev.state<number>("gameController.inventory.SlotZodiac.CurrentValue");
  }

  static async currentAttackDamage() {
    return new BigNum(await rev.state<string>("gameData.attacks.totalAtkMult"));
  }

  static async eternalChallenge(n: number) {
    return new EternalChallenge(await rev.state<EternalChallengeData>(`gameData.eternity.challenges.${n}`));
  }

  static async eternalChallengeCompletedCount() {
    return await rev.state<number>("challengesCompletedCount");
  }

  static async nextUnityZodiacs() {
    return (await rev.state<UnityZodiacData[]>("gameData.unity.NextZodiacs")).map(zodiac => new UnityZodiac(zodiac));
  }

  static async sacrificeState() {
    return Object.values(await rev.state<Partial<Record<keyof typeof ZodiacStatType, SacriStatData>>>("gameData.unity.sacriStats"))
      .map(data => new SacriStat(data));
  }

  static async attackLevel() {
    return new AttackLevel(await rev.state<AttackLevelData>("gameData.attacks.level"));
  }

  static async attackRevolutions() {
    return (await rev.state<AttacksRevolutionData[]>("gameData.attacks.revolutions"))
      .map(data => new AttacksRevolution(data));
  }

  static async attackRevolution(n: number) {
    return new AttacksRevolution(await rev.state<AttacksRevolutionData>(`gameData.attacks.revolutions.${n}`));
  }

  static async attackRevolutionMults() {
    const indexes = [0, 1, 2, 3, 4];
    const values = await rev.state(...indexes.flatMap(index => [
      `gameData.attacks.revolutions.${index}.IsActive`,
      `gameData.attacks.revolutions.${index}.mult`,
    ])) as Readonly<Record<string, boolean | string>>;
    return indexes.map(index => values[`gameData.attacks.revolutions.${index}.IsActive`]
      ? new BigNum(values[`gameData.attacks.revolutions.${index}.mult`] as string)
      : null);
  }

  static async attackRevolutionProgressions() {
    const indexes = [0, 1, 2, 3, 4];
    const values = await rev.state(...indexes.flatMap(index => [
      `gameData.attacks.revolutions.${index}.IsActive`,
      `gameData.attacks.revolutions.${index}.progress`,
    ])) as Readonly<Record<string, boolean | string>>;
    return indexes.map(index => values[`gameData.attacks.revolutions.${index}.IsActive`]
      ? new BigNum(values[`gameData.attacks.revolutions.${index}.progress`] as string)
      : null);
  }

  static async attackRevolutionCanBuy(n: number) {
    return Boolean(await rev.state<boolean>(`gameData.attacks.revolutions.${n}.CanPurchase`));
  }

  static async maxAttackLevelReached() {
    return Number(await rev.state<string>("gameData.attacks.maxLevelReached"));
  }

  static async currentMineralLevel() {
    return new BigNum(await rev.state<string>("gameData.minerals.curMineralLevel"));
  }

  static async currentMineralCost() {
    return new BigNum(await rev.state<string>("gameData.minerals.curMineralCost"));
  }

  static async minMineralCost() {
    return new BigNum(await rev.state<string>("gameData.minerals.minMineralCost"));
  }

  static async maxMineralLevel() {
    return new BigNum(await rev.state<string>("gameData.minerals.maxMineralLevel"));
  }

  static async commonMinerals() {
    return Object.map(await rev.state<Partial<Record<number, CommonMineralData>>>("gameData.minerals.commonMinerals"),
      (slot, data) => data && [slot, new CommonMineral(data)] as const);
  }

  static async mineralUpgrades(): Promise<Partial<Record<keyof typeof MineralUpgradeType, MineralUpgrade>>> {
    return Object.map(await rev.state<Partial<Record<keyof typeof MineralUpgradeType, MineralsUpgradeData>>>("gameData.minerals.upgrades"),
      (type, data) => [type, new MineralUpgrade(data)] as const);
  }

  static async mineralUpgrade(type: MineralUpgradeType) {
    return new MineralUpgrade(await rev.state<MineralsUpgradeData>(`gameData.minerals.upgrades.${MineralUpgradeType[type]}`));
  }

  static async polishUpgrades(): Promise<Partial<Record<keyof typeof PolishUpgradeType, PolishUpgrade>>> {
    return Object.map(await rev.state<Partial<Record<keyof typeof PolishUpgradeType, PolishUpgradeData>>>(`gameData.minerals.polishUpgrades`),
      (type, data) => [type, new PolishUpgrade(data)] as const);
  }

  static async polishUpgrade(type: PolishUpgradeType) {
    return new PolishUpgrade(await rev.state<PolishUpgradeData>(`gameData.minerals.polishUpgrades.${PolishUpgradeType[type]}`));
  }
}


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
