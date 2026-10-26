import { getNarrator } from "../content/narrators";
import {
  drawingPlan,
  drawingTaskSet,
  legacyDrawingTaskSet,
} from "../content/drawing";
import { isDrawingTaskSet } from "../content/drawingTasks";
import type { DrawingTaskSet } from "../content/drawingTasks/types";
import type { DrawingConfig, DrawingCue } from "../content/drawing";
export interface DrawingState {
  version: 2;
  taskSet?: DrawingTaskSet;
  phase: "intro" | "running" | "complete";
  cue: number;
  elapsed: number;
  title: string;
  note: string;
}
export type DrawingAction =
  | { type: "START" }
  | { type: "TICK"; delta: number }
  | { type: "ADVANCE"; cue: number }
  | { type: "TITLE"; text: string }
  | { type: "NOTE"; text: string };
export const initialDrawing = (config?: DrawingConfig): DrawingState => ({
  ...(config ? { taskSet: drawingTaskSet(config) } : {}),
  version: 2,
  phase: "intro",
  cue: 0,
  elapsed: 0,
  title: "",
  note: "",
});
export function drawingReducer(
  state: DrawingState,
  action: DrawingAction,
  config: DrawingConfig,
): DrawingState {
  switch (action.type) {
    case "START":
      return state.phase === "intro"
        ? {
            ...state,
            phase: "running",
            taskSet: state.taskSet ?? drawingTaskSet(config),
          }
        : state;
    case "ADVANCE": {
      if (state.phase !== "running" || action.cue !== state.cue) return state;
      const plan = drawingPlan(config, state.taskSet);
      return state.cue === plan.length - 1
        ? { ...state, elapsed: plan[state.cue].seconds, phase: "complete" }
        : { ...state, cue: state.cue + 1, elapsed: 0 };
    }
    case "TICK": {
      if (
        state.phase !== "running" ||
        !Number.isFinite(action.delta) ||
        action.delta <= 0
      )
        return state;
      const plan = drawingPlan(config, state.taskSet),
        cue = plan[state.cue];
      const elapsed = Math.min(cue.seconds, state.elapsed + action.delta);
      if (elapsed < cue.seconds) return { ...state, elapsed };
      // A delayed tick never eats a new assignment's drawing time.
      return state.cue === plan.length - 1
        ? { ...state, elapsed, phase: "complete" }
        : { ...state, cue: state.cue + 1, elapsed: 0 };
    }
    case "TITLE":
      return state.phase === "complete" && typeof action.text === "string"
        ? { ...state, title: action.text.slice(0, 80) }
        : state;
    case "NOTE":
      return state.phase === "complete" && typeof action.text === "string"
        ? { ...state, note: action.text.slice(0, 400) }
        : state;
  }
}
export function isDrawingState(
  value: unknown,
  config: DrawingConfig,
): value is DrawingState {
  if (!value || typeof value !== "object") return false;
  const s = value as DrawingState;
  if (s.taskSet !== undefined && !isDrawingTaskSet(s.taskSet)) return false;
  const plan = drawingPlan(config, s.taskSet);
  if (
    s.version !== 2 ||
    !["intro", "running", "complete"].includes(s.phase) ||
    !Number.isInteger(s.cue) ||
    s.cue < 0 ||
    s.cue >= plan.length ||
    !Number.isFinite(s.elapsed) ||
    s.elapsed < 0 ||
    s.elapsed > plan[s.cue].seconds ||
    typeof s.title !== "string" ||
    s.title.length > 80 ||
    typeof s.note !== "string" ||
    s.note.length > 400
  )
    return false;
  if (s.phase === "intro")
    return s.cue === 0 && s.elapsed === 0 && s.title === "" && s.note === "";
  if (s.phase === "complete")
    return s.cue === plan.length - 1 && s.elapsed === plan[s.cue].seconds;
  return s.elapsed < plan[s.cue].seconds && s.title === "" && s.note === "";
}
/** Old v2 saves keep their original questions; unstarted games get the new content. */
export function restoreDrawing(
  value: unknown,
  config: DrawingConfig,
): DrawingState | null {
  if (!isDrawingState(value, config)) return null;
  return value.taskSet
    ? value
    : {
        ...value,
        taskSet:
          value.phase === "intro"
            ? drawingTaskSet(config)
            : legacyDrawingTaskSet(config),
      };
}
export type DrawingEntry = Omit<DrawingCue, "seconds">;
export function drawingFeed(
  state: DrawingState,
  plan: DrawingCue[],
): DrawingEntry[] {
  return state.phase === "intro"
    ? []
    : plan
        .slice(0, state.cue + 1)
        .map(({ seconds: _seconds, ...entry }) => entry);
}
export function drawingText(
  state: DrawingState,
  config: DrawingConfig,
): string {
  return [
    state.title.trim() || "Две картины об одном месте",
    "",
    ...drawingFeed(state, drawingPlan(config, state.taskSet)).flatMap(
      (entry) => [
        `${getNarrator(entry.narrator).name} · ${entry.title}`,
        entry.text,
        ...(entry.assignments?.map(
          (task, player) => `Игрок ${player + 1}: ${task}`,
        ) ?? []),
        ...(entry.guesses?.map(
          (g) => `Задание ${getNarrator(g.narrator).name}: ${g.question}`,
        ) ?? []),
        "",
      ],
    ),
    state.note ? `Что запомнилось: ${state.note}` : "",
  ].join("\n");
}
