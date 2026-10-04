import { UnityZodiac, UnityZodiacData, ZodiacElement, ZodiacRarity, ZodiacSeason, ZodiacSign, ZodiacStatType } from "./states_unity.ts";
import { GlobalVar } from "./utils.ts";


const UnityHistories = new GlobalVar<{
  elapsedTime: number;
  goldGained: BigNum;
  attackLevelReached: number;
  zodiacGot: UnityZodiacData,
}[]>("unityHistories");

const HistoryVersion = new GlobalVar<number>("historyVersion");


const MAX_HISTORY: number = 20;


export class UnityHistory {
  static histories: UnityHistory[] | null = null;
  static version: number | null = null;

  constructor(
    public elapsedTime:        number,
    public goldGained:         BigNum,
    public attackLevelReached: number,
    public zodiacGot:          UnityZodiac
  ) {}

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

  private static ensureHistories() {
    if (UnityHistory.histories === null || UnityHistory.version !== HistoryVersion.getUnguarded()) {
      UnityHistory.histories = UnityHistory.fromGlobal();
      UnityHistory.version = HistoryVersion.getUnguarded() ?? 0;
    }
  }

  private static fromGlobal() {
    return (UnityHistories.getUnguarded() ?? [])
      .map(history => new UnityHistory(
        history.elapsedTime,
        history.goldGained,
        history.attackLevelReached,
        new UnityZodiac(history.zodiacGot)));
  }

  pushGlobal() {
    UnityHistory.ensureHistories();
    UnityHistory.histories!.push(this);
    if (UnityHistory.histories!.length > MAX_HISTORY)
      UnityHistory.histories!.shift();

    UnityHistories.setUnguarded(
      UnityHistory.histories
        ?.map(({ elapsedTime, goldGained, attackLevelReached, zodiacGot }) => ({
          elapsedTime,
          goldGained,
          attackLevelReached,
          zodiacGot: {
            Element: ZodiacElement[zodiacGot.Element] as keyof typeof ZodiacElement,
            IsEmpty: zodiacGot.IsEmpty,
            RangeOffset: zodiacGot.RangeOffset,
            Season: ZodiacSeason[zodiacGot.Season] as keyof typeof ZodiacSeason,
            hasPlanet: zodiacGot.hasPlanet,
            level: zodiacGot.level,
            locked: zodiacGot.locked,
            planet: zodiacGot.planet ? { ...zodiacGot.planet } : null,
            quality: zodiacGot.quality,
            rarity: ZodiacRarity[zodiacGot.rarity] as keyof typeof ZodiacRarity,
            rarityPlus: new BigNum(zodiacGot.rarityPlus),
            score: zodiacGot.score,
            sign: ZodiacSign[zodiacGot.sign] as keyof typeof ZodiacSign,
            stats: zodiacGot.stats.map(stat => ({
              type: ZodiacStatType[stat.type] as keyof typeof ZodiacStatType,
              value: stat.value,
            })),
          },
        })) ?? []);

    HistoryVersion.updateUnguarded(v => (v??0) + 1);
  }

  static getHistories(n?: number) {
    UnityHistory.ensureHistories();
    return UnityHistory.histories!.slice(- (n ?? UnityHistory.histories!.length));
  }

  static clearGlobal() {
    UnityHistory.histories = [];
    UnityHistories.setUnguarded([]);
    HistoryVersion.updateUnguarded(v => (v??0) + 1);
  }

  static last10AverageZodiacRarity() {
    const histories = this.getHistories().slice(-10);
    if (!histories.length) return 0;
    return histories.reduce((sum, { zodiacGot }) => sum + zodiacGot.rarity + zodiacGot.rarityPlus, 0) / histories.length;
  }
}
