import { UnityZodiac, ZodiacElement, ZodiacRarity, ZodiacSeason, ZodiacSign, ZodiacStatType } from "./states.ts";
import { BigNum } from "./utils.ts";


declare const rev: Readonly<Rev & {
  global: {
    unityHistories?: {
      elapsedTime: number;
      goldGained: string;
      attackLevelReached: number;
      zodiacGot: ConstructorParameters<typeof UnityZodiac>[0];
    }[];
  };
}>;


const MAX_HISTORY: number = 20;

let HISTORIES: UnityHistory[] | null = null;

export class UnityHistory {
  constructor(
    public elapsedTime:        number,
    public goldGained:         BigNum,
    public attackLevelReached: number,
    public zodiacGot:          UnityZodiac
  ) {}

  print() {
      const { sign, Element, Season, level, rarity, rarityPlus, score, quality, stats } = this.zodiacGot;
      const maxTypeLen = Math.max(...stats.map(stat => ZodiacStatType[stat.type].length)) + 1;

      console.log([
        "+-------------------------------------------------",
        `| Last unity elapsed: ${this.elapsedTime/1000}s`,
        `| United with attack: ${this.attackLevelReached}`,
        `| United with gold:   ${this.goldGained.toString(4)}`,
        `| United with zodiac: ${ZodiacSign[sign]} / ${ZodiacElement[Element]} / ${ZodiacSeason[Season]}`,
        `|     level:   ${Math.round(level.toNumber())}`,
        `|     rarity:  ${ZodiacRarity[rarity]}${rarityPlus ? `+${rarityPlus}` : ""}`,
        `|     score:   ${score.toString(4)}`,
        `|     quality: ${quality.toString(4)}`,
        "|     stats:",
        ...stats.map(stat =>
          `|         ${(ZodiacStatType[stat.type] + ":").padEnd(maxTypeLen)} ${stat.value.toString(4)}`),
        "| Last 10 average zodiac rarity: " + UnityHistory.last10AverageZodiacRarity().toFixed(2),
        "+-------------------------------------------------"
      ].join("\n"));
  }

  static getHistories() {
    this.ensureHistories();
    return HISTORIES!;
  }

  private static ensureHistories() {
    if (HISTORIES !== null) return true;
    HISTORIES = this.fromGlobal();
    return true;
  }

  private static fromGlobal() {
    return (rev.global.unityHistories ?? []).map(history => new UnityHistory(
      history.elapsedTime,
      new BigNum(history.goldGained),
      history.attackLevelReached,
      new UnityZodiac(history.zodiacGot)));
  }

  pushGlobal() {
    UnityHistory.ensureHistories();
    HISTORIES!.push(this);
    if (HISTORIES!.length > MAX_HISTORY)
      HISTORIES!.shift();

    rev.global.unityHistories = HISTORIES?.map(({ elapsedTime, goldGained, attackLevelReached, zodiacGot }) => ({
      elapsedTime,
      goldGained: goldGained.toString(),
      attackLevelReached,
      zodiacGot: {
        Element: ZodiacElement[zodiacGot.Element] as keyof typeof ZodiacElement,
        IsEmpty: zodiacGot.IsEmpty,
        RangeOffset: zodiacGot.RangeOffset,
        Season: ZodiacSeason[zodiacGot.Season] as keyof typeof ZodiacSeason,
        hasPlanet: zodiacGot.hasPlanet,
        level: zodiacGot.level.toString(),
        locked: zodiacGot.locked,
        planet: zodiacGot.planet ? { ...zodiacGot.planet } : null,
        quality: zodiacGot.quality.toString(),
        rarity: ZodiacRarity[zodiacGot.rarity] as keyof typeof ZodiacRarity,
        rarityPlus: zodiacGot.rarityPlus,
        score: zodiacGot.score.toString(),
        sign: ZodiacSign[zodiacGot.sign] as keyof typeof ZodiacSign,
        stats: zodiacGot.stats.map(stat => ({
          type: ZodiacStatType[stat.type] as keyof typeof ZodiacStatType,
          value: stat.value.toString(),
        })),
      },
    })) ?? [];
  }

  static clearGlobal() {
    HISTORIES = [];
    rev.global.unityHistories = [];
  }

  static last10AverageZodiacRarity() {
    const histories = this.getHistories().slice(-10);
    if (!histories.length) return 0;
    return histories.reduce((sum, { zodiacGot }) => sum + zodiacGot.rarity + zodiacGot.rarityPlus, 0) / histories.length;
  }
}
