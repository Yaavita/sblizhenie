import type { NarratorId } from "../types";
import type { DrawingBaseId, DrawingTask, DrawingTaskSet } from "./types";
import { momoDrawingTasks } from "./momo";
import { noirDrawingTasks } from "./noir";
import { archivistDrawingTasks } from "./archivist";
import { noiseDrawingTasks } from "./noise";
import { chanceDrawingTasks } from "./chance";

export const drawingTaskBank: Record<
  string,
  Record<NarratorId, readonly DrawingTask[]>
> = {
  ...momoDrawingTasks,
  ...noirDrawingTasks,
  ...archivistDrawingTasks,
  ...noiseDrawingTasks,
  ...chanceDrawingTasks,
};
export const drawingVoices: NarratorId[] = [
  "momo",
  "noir",
  "archivist",
  "noise",
  "chance",
];

function hash(text: string): number {
  let seed = 2166136261;
  for (let i = 0; i < text.length; i++)
    seed = Math.imul(seed ^ text.charCodeAt(i), 16777619);
  return seed >>> 0;
}
function shuffled<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  let state = seed || 0x6d2b79f5;
  for (let i = result.length - 1; i > 0; i--) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const j = (state >>> 0) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Full seeds keep every card reachable even though variant % 4 chooses the scene. */
export function selectDrawingTasks(
  base: DrawingBaseId,
  variant: number,
  order: NarratorId[],
  intimacy: number,
): DrawingTaskSet {
  const decks = order.map((voice) =>
    shuffled(drawingTaskBank[base][voice], hash(`${base}:${voice}:${variant}`)),
  );
  const selected = {} as DrawingTaskSet;
  const used = new Set<string>();
  function choose(position: number): boolean {
    if (position === order.length) return true;
    const deck = decks[position];
    for (let a = 0; a < deck.length; a++)
      for (let b = a + 1; b < deck.length; b++) {
        const one = deck[a],
          two = deck[b];
        if (
          one.purpose === two.purpose ||
          used.has(one.purpose) ||
          used.has(two.purpose)
        )
          continue;
        used.add(one.purpose);
        used.add(two.purpose);
        selected[order[position]] = [one, two];
        if (choose(position + 1)) return true;
        used.delete(one.purpose);
        used.delete(two.purpose);
      }
    return false;
  }
  if (!choose(0))
    throw new Error(`Drawing bank ${base} needs ten distinct purposes`);
  const note =
    intimacy === 1
      ? " Личный смысл можно связать с близким человеком."
      : intimacy === 2
        ? " Можно выбрать вещь с более личной историей. В финале ты сам решаешь, что объяснять."
        : "";
  return Object.fromEntries(
    order.map((voice) => [
      voice,
      selected[voice].map((task) => ({ ...task, text: task.text + note })),
    ]),
  ) as DrawingTaskSet;
}

/** Complete text snapshots keep played questions stable when the content bank is edited. */
export function isDrawingTaskSet(value: unknown): value is DrawingTaskSet {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as DrawingTaskSet;
  if (
    Object.keys(record).length !== drawingVoices.length ||
    !drawingVoices.every((voice) => Object.hasOwn(record, voice))
  )
    return false;
  const ids = new Set<string>();
  for (const voice of drawingVoices) {
    const pair = record[voice];
    if (!Array.isArray(pair) || pair.length !== 2) return false;
    for (const task of pair) {
      if (
        !task ||
        typeof task !== "object" ||
        typeof task.id !== "string" ||
        !task.id ||
        task.id.length > 200 ||
        typeof task.purpose !== "string" ||
        !task.purpose ||
        task.purpose.length > 150 ||
        typeof task.text !== "string" ||
        !task.text.trim() ||
        task.text.length > 1200 ||
        ids.has(task.id)
      )
        return false;
      ids.add(task.id);
    }
  }
  return true;
}
