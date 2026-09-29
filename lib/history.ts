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

let expanded: boolean = true;
let histories: UnityHistory[] | null = null;

export class UnityHistory {
  constructor(
    public elapsedTime:        number,
    public goldGained:         BigNum,
    public attackLevelReached: number,
    public zodiacGot:          UnityZodiac
  ) {}

  static init() {
    UnityHistory.ensureHistories();

    rev.ui.lastHistory = {
      text: "Last Run: Loading...",
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
      onClick: () => {
        expanded = !expanded;
        histories?.at(-1)?.updateUI();
      },
    };

    histories?.at(-1)?.updateUI();
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

  updateUI() {
    const { sign, level, rarity, rarityPlus } = this.zodiacGot;

    if (expanded) {
      rev.ui.lastHistory!.text = [
        `Last Run (${(this.elapsedTime/1000).toFixed(1)}s):`,
        `| Max Attack Level: ${this.attackLevelReached}`,
        `| Gold Earned:      ${this.goldGained.toString(4)}`,
        `| Zodiac Claimed:   ${ZodiacSign[sign]} ${level.toBigInt()}lvl ${ZodiacRarity[rarity]}${rarityPlus ? `+${rarityPlus}` : ""}`,
      ].join("\n");
      return;
    }

    rev.ui.lastHistory!.text = `Last Run (${(this.elapsedTime/1000).toFixed(1)}s)`;
  }

  static getHistories(n?: number) {
    this.ensureHistories();
    return histories!.slice(- (n ?? histories!.length));
  }

  private static ensureHistories() {
    if (histories !== null) return true;
    histories = this.fromGlobal();
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
    histories!.push(this);
    if (histories!.length > MAX_HISTORY)
      histories!.shift();

    rev.global.unityHistories = histories?.map(({ elapsedTime, goldGained, attackLevelReached, zodiacGot }) => ({
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
    histories = [];
    rev.global.unityHistories = [];
  }

  static last10AverageZodiacRarity() {
    const histories = this.getHistories().slice(-10);
    if (!histories.length) return 0;
    return histories.reduce((sum, { zodiacGot }) => sum + zodiacGot.rarity + zodiacGot.rarityPlus, 0) / histories.length;
  }
}
