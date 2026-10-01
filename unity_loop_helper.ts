import { UnityHistory } from "./lib/history.ts";
import { States, ZodiacRarity, ZodiacSign } from "./lib/states.ts";
import { GlobalVar } from "./lib/utils.ts";


export type UnityReportElementState = {
  expanded: boolean;
  zodiacLoadout: "build" | "score" | "collect";
};


const UnityStart    = new GlobalVar<number>("unityStart");
const PauseDuration = new GlobalVar<number>("pauseDuration");


export async function updateUnityResult() {
  const element = rev.ui.unityReport;
  if (!element) return;

  const unityStartTime = await UnityStart.get() ?? Date.now();
  const pauseDuration = await PauseDuration.get() ?? 0;
  const currentElapsed = Date.now() - unityStartTime - pauseDuration;

  if (!element.states.expanded) {
    element.text = `Current Run (${(currentElapsed/1000).toFixed(1)}s)`;
    return;
  }

  const lines = [
    `Current Run (${(currentElapsed/1000).toFixed(1)}s):`,
    `| Dilation Tree:  ${await States.spentDTP()}/${await States.totalDTP()}`,
    `| Unity Level:    ${(await States.unityLevel()).toBigInt()}`,
    `| Attack Level:   ${(await States.attackLevel()).level}`,
    `| Gold On Unite:  ${(await States.nextGold()).toString(4)}`,
    `| Zodiac Loadout: ${element.states.zodiacLoadout}`,
  ];

  const lastHistory = UnityHistory.getHistories(-1).at(-1);
  if (lastHistory) {
    const { elapsedTime, attackLevelReached, goldGained, zodiacGot } = lastHistory;
    const { sign, level, rarity, rarityPlus } = zodiacGot;
    lines.push(
      "",
      `Last Run (${(elapsedTime/1000).toFixed(1)}s):`,
      `| Max Attack Level: ${attackLevelReached}`,
      `| Gold Earned:      ${goldGained.toString(4)}`,
      `| Zodiac Claimed:   ${ZodiacSign[sign]} ${level.toBigInt()}lvl ${ZodiacRarity[rarity]}${rarityPlus ? `+${rarityPlus}` : ""}`);
  }

  element.text = lines.join("\n");
  element.hidden = false;
}
