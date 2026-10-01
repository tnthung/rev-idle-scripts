import { UnityZodiac, UnityZodiacData, ZodiacElement, ZodiacRarity, ZodiacSeason, ZodiacSign, ZodiacStatType } from "./states.ts";
import { BigNum, GlobalVar } from "./utils.ts";


const UnityHistories = new GlobalVar<{
  elapsedTime: number;
  goldGained: string;
  attackLevelReached: number;
  zodiacGot: UnityZodiacData,
}[]>("unityHistories");


const MAX_HISTORY: number = 20;

let histories: UnityHistory[] | null = null;

export class UnityHistory {
  constructor(
    public elapsedTime:        number,
    public goldGained:         BigNum,
    public attackLevelReached: number,
    public zodiacGot:          UnityZodiac
  ) {}

  static async init() {
    histories = await this.fromGlobal();
  }

  print() {
      const { sign, Element, Season, level, rarity, rarityPlus, score, quality, stats } = this.zodiacGot;
      const maxTypeLen = Math.max(...stats.map(stat => ZodiacStatType[stat.type].length)) + 1;
      const last10AvgRarity = UnityHistory.last10AverageZodiacRarity();
      const minZodiacRarity = Math.ceil(last10AvgRarity - ZodiacRarity.Immortal);

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
        `| Last 10 average zodiac rarity: ${last10AvgRarity.toFixed(2)} (+${minZodiacRarity})`,
        "+-------------------------------------------------"
      ].join("\n"));
  }

  static getHistories(n?: number) {
    return histories!.slice(- (n ?? histories!.length));
  }

  private static async fromGlobal() {
    return (await UnityHistories.getOrSet([]))
      .map(history => new UnityHistory(
        history.elapsedTime,
        new BigNum(history.goldGained),
        history.attackLevelReached,
        new UnityZodiac(history.zodiacGot)));
  }

  async pushGlobal() {
    histories!.push(this);
    if (histories!.length > MAX_HISTORY)
      histories!.shift();

    UnityHistories.set(histories?.map(({ elapsedTime, goldGained, attackLevelReached, zodiacGot }) => ({
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
    })) ?? []);
  }

  static async clearGlobal() {
    histories = [];
    await UnityHistories.set([]);
  }

  static last10AverageZodiacRarity() {
    const histories = this.getHistories().slice(-10);
    if (!histories.length) return 0;
    return histories.reduce((sum, { zodiacGot }) => sum + zodiacGot.rarity + zodiacGot.rarityPlus, 0) / histories.length;
  }
}
