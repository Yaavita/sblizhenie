import type { PartyGameId } from "../content/types";
export type PartyPlayer = 0 | 1;
export type PartyPhase =
  | "intro"
  | "handoff"
  | "choose"
  | "pitch"
  | "objection"
  | "response"
  | "judge"
  | "reveal"
  | "results";
export interface PartyResult {
  round: number;
  choices: [number, number] | null;
  accepted: boolean;
  points: number;
}
export interface PartyState {
  version: 1;
  game: PartyGameId;
  phase: PartyPhase;
  round: number;
  player: PartyPlayer;
  choices: [number | null, number | null];
  history: PartyResult[];
  remaining: number;
}
export type PartyAction =
  | { type: "START" }
  | { type: "READY" }
  | { type: "SELECT"; choice: number }
  | { type: "PITCH_DONE" }
  | { type: "OBJECTION_DONE" }
  | { type: "RESPONSE_DONE" }
  | { type: "DEAL"; accepted: boolean }
  | { type: "NEXT" }
  | { type: "TICK"; delta: number };
export const partyRoundCount = (game: PartyGameId) => (game === "sync" ? 8 : 6);
const validChoice = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) < 3;
export const pitchPoints = (round: number) => (round >= 4 ? 2 : 1);
export function initialParty(game: PartyGameId): PartyState {
  return {
    version: 1,
    game,
    phase: "intro",
    round: 0,
    player: 0,
    choices: [null, null],
    history: [],
    remaining: 0,
  };
}
export function partyScores(s: PartyState): [number, number] {
  if (s.game === "sync")
    return [s.history.reduce((total, r) => total + r.points, 0), 8];
  return s.history.reduce<[number, number]>(
    (scores, r) => {
      scores[r.round % 2] += r.points;
      return scores;
    },
    [0, 0],
  );
}
export function partyTurn(
  s: PartyState,
): { active: PartyPlayer; roles: [string, string] } | null {
  if (s.game === "sync")
    return s.phase === "choose"
      ? {
          active: s.player,
          roles:
            s.player === 0
              ? ["Выбирает тайно", "Не смотрит на экран"]
              : ["Не смотрит на экран", "Выбирает тайно"],
        }
      : null;
  const seller = (s.round % 2) as PartyPlayer;
  const buyer = (1 - seller) as PartyPlayer;
  const task =
    s.phase === "pitch"
      ? ([seller, "Продаёт товар", "Слушает рекламу"] as const)
      : s.phase === "objection"
        ? ([buyer, "Задаёт вопрос", "Слушает вопрос"] as const)
        : s.phase === "response"
          ? ([seller, "Отвечает покупателю", "Слушает ответ"] as const)
          : s.phase === "judge"
            ? ([buyer, "Решает, покупать ли", "Ждёт решения"] as const)
            : null;
  if (!task) return null;
  const roles: [string, string] = [task[2], task[2]];
  roles[task[0]] = task[1];
  return { active: task[0], roles };
}
export function partyReducer(s: PartyState, a: PartyAction): PartyState {
  switch (a.type) {
    case "START":
      return s.phase === "intro"
        ? {
            ...s,
            phase: s.game === "sync" ? "handoff" : "pitch",
            remaining: s.game === "pitch" ? 45 : 0,
          }
        : s;
    case "READY":
      return s.game === "sync" && s.phase === "handoff"
        ? { ...s, phase: "choose" }
        : s;
    case "SELECT": {
      if (s.game !== "sync" || s.phase !== "choose" || !validChoice(a.choice))
        return s;
      const choices: PartyState["choices"] = [...s.choices];
      choices[s.player] = a.choice;
      if (s.player === 0) return { ...s, choices, player: 1, phase: "handoff" };
      const matched = choices[0] === choices[1];
      return {
        ...s,
        choices,
        phase: "reveal",
        history: [
          ...s.history,
          {
            round: s.round,
            choices: choices as [number, number],
            accepted: matched,
            points: matched ? 1 : 0,
          },
        ],
      };
    }
    case "PITCH_DONE":
      return s.game === "pitch" && s.phase === "pitch"
        ? { ...s, phase: "objection", remaining: 0 }
        : s;
    case "OBJECTION_DONE":
      return s.game === "pitch" && s.phase === "objection"
        ? { ...s, phase: "response", remaining: 30 }
        : s;
    case "RESPONSE_DONE":
      return s.game === "pitch" && s.phase === "response"
        ? { ...s, phase: "judge", remaining: 0 }
        : s;
    case "DEAL":
      return s.game === "pitch" &&
        s.phase === "judge" &&
        typeof a.accepted === "boolean"
        ? {
            ...s,
            phase: "reveal",
            history: [
              ...s.history,
              {
                round: s.round,
                choices: null,
                accepted: a.accepted,
                points: a.accepted ? pitchPoints(s.round) : 0,
              },
            ],
          }
        : s;
    case "NEXT": {
      if (s.phase !== "reveal") return s;
      if (s.history.length === partyRoundCount(s.game))
        return { ...s, phase: "results" };
      const round = s.round + 1;
      return {
        ...s,
        round,
        phase: s.game === "sync" ? "handoff" : "pitch",
        player: s.game === "sync" ? 0 : ((round % 2) as PartyPlayer),
        choices: [null, null],
        remaining: s.game === "pitch" ? 45 : 0,
      };
    }
    case "TICK": {
      if (
        s.game !== "pitch" ||
        !["pitch", "response"].includes(s.phase) ||
        !Number.isFinite(a.delta) ||
        a.delta <= 0 ||
        s.remaining === 0
      )
        return s;
      return { ...s, remaining: Math.max(0, s.remaining - a.delta) };
    }
  }
}
/** Enforces both legal turns and score integrity when restoring a session. */
export function isPartyState(value: unknown): value is PartyState {
  if (!value || typeof value !== "object") return false;
  const s = value as PartyState;
  if (
    s.version !== 1 ||
    !["sync", "pitch"].includes(s.game) ||
    !Number.isInteger(s.round) ||
    s.round < 0 ||
    s.round >= partyRoundCount(s.game) ||
    ![0, 1].includes(s.player) ||
    !Array.isArray(s.choices) ||
    s.choices.length !== 2 ||
    !s.choices.every((c) => c === null || validChoice(c)) ||
    !Array.isArray(s.history) ||
    s.history.length > partyRoundCount(s.game) ||
    !Number.isFinite(s.remaining) ||
    s.remaining < 0
  )
    return false;
  const phases =
    s.game === "sync"
      ? ["intro", "handoff", "choose", "reveal", "results"]
      : [
          "intro",
          "pitch",
          "objection",
          "response",
          "judge",
          "reveal",
          "results",
        ];
  if (!phases.includes(s.phase)) return false;
  const maxTime =
    s.game === "pitch"
      ? s.phase === "pitch"
        ? 45
        : s.phase === "response"
          ? 30
          : 0
      : 0;
  if (s.remaining > maxTime) return false;
  if (
    s.phase === "intro" &&
    (s.round !== 0 ||
      s.history.length !== 0 ||
      s.player !== 0 ||
      s.choices.some((c) => c !== null))
  )
    return false;
  if (s.phase === "results" && s.history.length !== partyRoundCount(s.game))
    return false;
  if (
    s.round !==
    s.history.length - (["reveal", "results"].includes(s.phase) ? 1 : 0)
  )
    return false;
  if (
    s.history.some((r, i) => {
      if (!r || r.round !== i || typeof r.accepted !== "boolean") return true;
      if (s.game === "pitch")
        return (
          r.choices !== null || r.points !== (r.accepted ? pitchPoints(i) : 0)
        );
      return (
        !Array.isArray(r.choices) ||
        r.choices.length !== 2 ||
        !r.choices.every(validChoice) ||
        r.accepted !== (r.choices[0] === r.choices[1]) ||
        r.points !== (r.accepted ? 1 : 0)
      );
    })
  )
    return false;
  if (s.game === "pitch")
    return s.player === s.round % 2 && s.choices.every((c) => c === null);
  if (["reveal", "results"].includes(s.phase))
    return (
      s.player === 1 &&
      s.choices.every((c, i) => c === s.history.at(-1)?.choices?.[i])
    );
  return s.player === 0
    ? s.choices.every((c) => c === null)
    : validChoice(s.choices[0]) && s.choices[1] === null;
}
