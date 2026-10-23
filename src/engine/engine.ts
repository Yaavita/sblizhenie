import { intimacyLevel } from "../content/intimacy";
import type { GameId, NarratorId, Stage } from "../content/types";
import { getHostRules } from "../content/hostRules";
import { selectBonusQuestion } from "../content/auction";
import { auctionReducer, startRound, isAuctionState } from "./auction";
import type { AuctionAction, AuctionState } from "./auction";

export interface Condition {
  id: string;
  narrator: NarratorId;
  stageId: string;
  scope: "stage" | "game";
  title: string;
  text: string;
  status: "active" | "completed" | "cancelled" | "replaced";
  changedBy?: string;
  changedInStage?: string;
}
export type ConditionOperation = "add" | "replace" | "cancel" | "comment";
export interface Interruption {
  id: string;
  narrator: NarratorId;
  title: string;
  text: string;
  remaining: number;
  duration: number;
  priority: number;
  cancelsParent?: boolean;
  operation?: ConditionOperation;
  targetConditionId?: string;
  conditionsBefore?: Condition[];
  conditionId?: string;
  /** Completed replies still belong to the suspended root transaction until it ends. */
  completedReplies?: Interruption[];
}
export interface AuctionResult {
  lotId: string;
  title: string;
  narrator: NarratorId;
  winner: 0 | 1 | null;
  respondent: 0 | 1 | null;
  price: number;
  storyPassed: boolean;
  bonusQuestionId?: string;
  bonusQuestion?: string;
  eventText?: string;
  log: string[];
}
export interface LogEntry {
  id: number;
  type: "stage" | "interruption" | "auction" | "choice" | "system";
  text: string;
}
export interface Session {
  version: 1;
  game: GameId;
  narrator: NarratorId;
  variant: number;
  intimacy: number;
  stageIndex: number;
  stageId: string;
  stageKind: Stage["kind"];
  choiceIds: string[];
  currentLotId: string | null;
  currentLotTitle: string;
  remaining: number;
  paused: boolean;
  finished: boolean;
  stack: Interruption[];
  elapsed: number;
  totalInterruptions: number;
  interruptionChain: number;
  cooldown: number;
  decisions: Record<string, string>;
  balances: [number, number];
  auction: AuctionState | null;
  auctionHistory: AuctionResult[];
  log: LogEntry[];
  conditions: Condition[];
}
export type Action =
  | { type: "TICK"; delta: number }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "NEXT"; stage: Stage; narrator?: NarratorId }
  | { type: "FINISH" }
  | { type: "CHOOSE"; stageId: string; choiceId: string }
  | { type: "AUCTION"; action: AuctionAction }
  | { type: "INTERRUPT"; event: Interruption }
  | { type: "END_INTERRUPTION" }
  | { type: "CANCEL_ALL_INTERRUPTION" };
export const INTERRUPTION_LIMITS = {
  cooldown: 90,
  total: 5,
  depth: 2,
  chain: 2,
} as const;
const narrators: NarratorId[] = [
  "noise",
  "momo",
  "archivist",
  "chance",
  "noir",
];
const gameIds: GameId[] = ["universes", "cult", "auction", "secrets"];
const duration = (value: number) =>
  Number.isFinite(value) ? Math.max(0, value) : 0;
function hostConditions(
  narrator: NarratorId,
  game: GameId,
  intimacy: number,
  stageId: string,
): Condition[] {
  return getHostRules(narrator, game, intimacy).map((rule) => ({
    ...rule,
    id: `host-${rule.id}`,
    narrator,
    stageId,
    scope: "game",
    status: "active",
  }));
}
function addLog(
  state: Session,
  type: LogEntry["type"],
  text: string,
): LogEntry[] {
  return [
    ...state.log,
    { id: (state.log.at(-1)?.id ?? 0) + 1, type, text },
  ].slice(-200);
}
export function auctionSeconds(round: AuctionState): number {
  return round.phase === "bidding"
    ? round.turnRemaining
    : round.phase === "story"
      ? round.storyRemaining
      : round.phase === "event" && round.event?.type === "bonus"
        ? round.event.remaining
        : 0;
}
export function initialSession(
  game: GameId,
  narrator: NarratorId,
  variant: number,
  intimacy: number,
  firstStage: Stage,
): Session {
  const dealer =
    game === "auction" ? (firstStage.lot?.narrator ?? narrator) : narrator;
  const auction = firstStage.lot ? startRound(variant, 0, dealer) : null;
  return {
    version: 1,
    game,
    narrator: dealer,
    variant,
    intimacy: intimacyLevel(intimacy),
    stageIndex: 0,
    stageId: firstStage.id,
    stageKind: firstStage.kind,
    choiceIds: firstStage.choices?.map((c) => c.id) ?? [],
    currentLotId: firstStage.lot?.id ?? null,
    currentLotTitle: firstStage.lot?.title ?? "",
    remaining: auction ? auctionSeconds(auction) : duration(firstStage.seconds),
    paused: false,
    finished: false,
    stack: [],
    elapsed: 0,
    totalInterruptions: 0,
    interruptionChain: 0,
    cooldown: INTERRUPTION_LIMITS.cooldown,
    decisions: {},
    balances: [100, 100],
    auction,
    auctionHistory: [],
    log: [{ id: 1, type: "stage", text: firstStage.title }],
    conditions: hostConditions(
      dealer,
      game,
      intimacyLevel(intimacy),
      firstStage.id,
    ),
  };
}
/** Synchronise the single auction reducer with persisted session balances/history. */
function withAuction(state: Session, round: AuctionState): Session {
  if (round === state.auction) return state;
  const changedLog = round.log.slice(state.auction?.log.length ?? 0);
  const previous = state.auctionHistory.find(
    (l) => l.lotId === state.currentLotId,
  );
  const question =
    round.event?.type === "bonus"
      ? previous?.bonusQuestionId
        ? { id: previous.bonusQuestionId, question: previous.bonusQuestion! }
        : selectBonusQuestion(
            round.event.questionSeed,
            state.intimacy,
            state.auctionHistory.flatMap((l) =>
              l.bonusQuestionId ? [l.bonusQuestionId] : [],
            ),
          )
      : null;
  let history = state.auctionHistory;
  if (
    round.phase !== "bidding" &&
    round.phase !== "preview" &&
    (changedLog.length || !previous)
  ) {
    const record: AuctionResult = {
      lotId: state.currentLotId!,
      title: state.currentLotTitle,
      narrator: round.narrator,
      winner: round.winner,
      respondent: round.loser,
      price: round.price,
      storyPassed: round.storyPassed,
      log: round.log.map((e) => e.text),
      ...(round.event ? { eventText: round.event.text } : {}),
      ...(question
        ? { bonusQuestionId: question.id, bonusQuestion: question.question }
        : {}),
    };
    history = [...history.filter((l) => l.lotId !== record.lotId), record];
  }
  let log = state.log;
  for (const entry of changedLog)
    log = addLog({ ...state, log }, "auction", entry.text);
  return {
    ...state,
    auction: round,
    balances: [...round.balances],
    remaining: auctionSeconds(round),
    auctionHistory: history,
    log,
  };
}
function applyCondition(
  state: Session,
  event: Interruption,
): { conditions: Condition[]; event: Interruption } {
  const requested = event.operation ?? (state.stack.length ? "comment" : "add");
  const target = event.targetConditionId
    ? state.conditions.find(
        (c) => c.id === event.targetConditionId && c.status === "active",
      )
    : [...state.conditions]
        .reverse()
        .find(
          (c) =>
            c.stageId === state.stageId &&
            c.status === "active" &&
            c.narrator !== event.narrator,
        );
  const operation =
    requested === "replace" && !target
      ? "add"
      : requested === "cancel" && !target
        ? "comment"
        : requested;
  const changes = (operation === "replace" || operation === "cancel") && target;
  let conditions = changes
    ? state.conditions.map<Condition>((c) =>
        c.id === target.id
          ? {
              ...c,
              status: operation === "replace" ? "replaced" : "cancelled",
              changedBy: event.narrator,
              changedInStage: state.stageId,
            }
          : c,
      )
    : state.conditions;
  const conditionId =
    operation === "add" || operation === "replace"
      ? `event-${event.id}-${state.totalInterruptions + 1}`
      : undefined;
  if (conditionId)
    conditions = [
      ...conditions,
      {
        id: conditionId,
        narrator: event.narrator,
        stageId: state.stageId,
        scope: "stage",
        title: event.title,
        text: event.text,
        status: "active",
      },
    ];
  return {
    conditions,
    event: {
      ...event,
      operation,
      conditionId,
      conditionsBefore: changes ? [{ ...target }] : [],
      targetConditionId: changes ? target.id : undefined,
      completedReplies: [],
    },
  };
}
function undoCondition(
  conditions: Condition[],
  event: Interruption,
  changedBy: string,
): Condition[] {
  const previousReplies = [...(event.completedReplies ?? [])]
    .reverse()
    .reduce(
      (current, reply) => undoCondition(current, reply, changedBy),
      conditions,
    );
  return previousReplies.map((c) => {
    const previous = event.conditionsBefore?.find((p) => p.id === c.id);
    return previous
      ? { ...previous }
      : c.id === event.conditionId
        ? { ...c, status: "cancelled", changedBy }
        : c;
  });
}
export function canInterrupt(state: Session, priority?: number): boolean {
  if (
    state.finished ||
    state.paused ||
    state.game === "auction" ||
    state.stageKind === "secret" ||
    state.remaining <= 0 ||
    state.totalInterruptions >= INTERRUPTION_LIMITS.total ||
    state.stack.length >= INTERRUPTION_LIMITS.depth
  )
    return false;
  const top = state.stack.at(-1);
  return !top
    ? state.cooldown <= 0
    : state.interruptionChain < INTERRUPTION_LIMITS.chain &&
        priority !== undefined &&
        priority > top.priority;
}
function endInterruption(state: Session): Session {
  const top = state.stack.at(-1);
  if (!top) return state;
  const parent = top.cancelsParent ? state.stack.at(-2) : undefined;
  let stack = state.stack.slice(0, parent ? -2 : -1);
  if (!parent && stack.length) {
    const root = stack[stack.length - 1];
    stack = [
      ...stack.slice(0, -1),
      { ...root, completedReplies: [...(root.completedReplies ?? []), top] },
    ];
  }
  return {
    ...state,
    stack,
    conditions: parent
      ? undoCondition(
          undoCondition(state.conditions, top, top.narrator),
          parent,
          top.narrator,
        )
      : state.conditions,
    cooldown: stack.length ? state.cooldown : INTERRUPTION_LIMITS.cooldown,
    log: addLog(
      state,
      "system",
      parent
        ? "Вмешательство отменено. Возвращаемся к игре."
        : "Вмешательство завершено.",
    ),
  };
}
export function reducer(state: Session, action: Action): Session {
  if (state.finished) return state;
  switch (action.type) {
    case "TICK": {
      if (state.paused || !Number.isFinite(action.delta) || action.delta <= 0)
        return state;
      const top = state.stack.at(-1);
      if (top) {
        const remaining = Math.max(0, top.remaining - action.delta);
        const next = {
          ...state,
          elapsed: state.elapsed + Math.min(action.delta, top.remaining),
          stack: [...state.stack.slice(0, -1), { ...top, remaining }],
        };
        return remaining === 0 ? endInterruption(next) : next;
      }
      if (state.auction) {
        const round = auctionReducer(state.auction, {
          type: "TICK",
          delta: action.delta,
        });
        const next = withAuction(state, round);
        return next === state
          ? state
          : {
              ...next,
              elapsed: state.elapsed + Math.min(action.delta, state.remaining),
            };
      }
      const used = Math.min(action.delta, state.remaining);
      return {
        ...state,
        remaining: Math.max(0, state.remaining - action.delta),
        elapsed: state.elapsed + used,
        cooldown: Math.max(0, state.cooldown - used),
      };
    }
    case "PAUSE":
      return state.paused ? state : { ...state, paused: true };
    case "RESUME":
      return !state.paused ? state : { ...state, paused: false };
    case "AUCTION":
      if (
        !state.auction ||
        state.paused ||
        state.stack.length ||
        action.action.type === "TICK"
      )
        return state;
      return withAuction(state, auctionReducer(state.auction, action.action));
    case "NEXT": {
      if (state.stack.length || action.stage.id === state.stageId) return state;
      const settled = state.auction
        ? withAuction(state, auctionReducer(state.auction, { type: "FINISH" }))
        : state;
      const dealer =
        state.game === "auction"
          ? (action.stage.lot?.narrator ?? state.narrator)
          : state.narrator;
      const events = settled.auctionHistory.filter((l) => l.eventText);
      const lastEvent = events.at(-1);
      const round = action.stage.lot
        ? startRound(
            state.variant,
            state.stageIndex,
            dealer,
            settled.balances,
            {
              priorEvents: events.length,
              lastEventLot: lastEvent
                ? settled.auctionHistory.findIndex(
                    (l) => l.lotId === lastEvent.lotId,
                  )
                : null,
            },
          )
        : null;
      const next: Session = {
        ...settled,
        narrator: dealer,
        stageIndex: state.stageIndex + 1,
        stageId: action.stage.id,
        stageKind: action.stage.kind,
        choiceIds: action.stage.choices?.map((c) => c.id) ?? [],
        currentLotId: action.stage.lot?.id ?? null,
        currentLotTitle: action.stage.lot?.title ?? "",
        remaining: round
          ? auctionSeconds(round)
          : duration(action.stage.seconds),
        auction: null,
        conditions: [
          ...state.conditions.map<Condition>((c) => {
            if (c.scope === "stage" && c.status === "active")
              return { ...c, status: "completed" };
            if (c.scope === "game" && c.changedInStage === state.stageId) {
              const { changedBy: _by, changedInStage: _in, ...baseline } = c;
              return { ...baseline, status: "active" };
            }
            return c;
          }),
          ...state.conditions
            .filter(
              (c) => c.scope === "game" && c.changedInStage === state.stageId,
            )
            .map((c) => ({
              ...c,
              id: `history-${c.id}-${state.stageIndex}`,
              stageId: state.stageId,
              scope: "stage" as const,
            })),
        ],
        log: addLog(settled, "stage", action.stage.title),
      };
      return round ? withAuction(next, round) : next;
    }
    case "FINISH": {
      const settled = state.auction
        ? withAuction(state, auctionReducer(state.auction, { type: "FINISH" }))
        : state;
      return {
        ...settled,
        finished: true,
        paused: true,
        stack: [],
        conditions: settled.conditions.map((c) =>
          c.status === "active" ? { ...c, status: "completed" } : c,
        ),
        log: addLog(settled, "system", "Вечер завершён."),
      };
    }
    case "CHOOSE":
      if (
        state.stack.length ||
        action.stageId !== state.stageId ||
        !state.choiceIds.includes(action.choiceId) ||
        state.decisions[action.stageId]
      )
        return state;
      return {
        ...state,
        decisions: { ...state.decisions, [action.stageId]: action.choiceId },
        log: addLog(state, "choice", `Принято решение: ${action.choiceId}`),
      };
    case "INTERRUPT": {
      const e = action.event;
      if (
        !canInterrupt(state, e.priority) ||
        !narrators.includes(e.narrator) ||
        !Number.isFinite(e.priority) ||
        !Number.isFinite(e.duration) ||
        e.duration <= 0 ||
        typeof e.id !== "string" ||
        !e.id ||
        typeof e.title !== "string" ||
        typeof e.text !== "string" ||
        (e.operation !== undefined &&
          !["add", "replace", "cancel", "comment"].includes(e.operation)) ||
        (e.cancelsParent !== undefined &&
          typeof e.cancelsParent !== "boolean") ||
        (e.targetConditionId !== undefined &&
          typeof e.targetConditionId !== "string") ||
        state.stack.some((v) => v.id === e.id)
      )
        return state;
      const applied = applyCondition(state, e);
      return {
        ...state,
        conditions: applied.conditions,
        stack: [...state.stack, { ...applied.event, remaining: e.duration }],
        totalInterruptions: state.totalInterruptions + 1,
        interruptionChain: state.stack.length ? state.interruptionChain + 1 : 1,
        log: addLog(state, "interruption", e.text),
      };
    }
    case "END_INTERRUPTION":
      return endInterruption(state);
    case "CANCEL_ALL_INTERRUPTION":
      return !state.stack.length
        ? state
        : {
            ...state,
            stack: [],
            conditions: [...state.stack]
              .reverse()
              .reduce(
                (c, e) => undoCondition(c, e, "players"),
                state.conditions,
              ),
            cooldown: INTERRUPTION_LIMITS.cooldown,
            log: addLog(state, "system", "Все вмешательства пропущены."),
          };
  }
}
function isCondition(value: unknown): value is Condition {
  if (!value || typeof value !== "object") return false;
  const c = value as Condition;
  return (
    typeof c.id === "string" &&
    c.id.length > 0 &&
    narrators.includes(c.narrator) &&
    typeof c.stageId === "string" &&
    ["stage", "game"].includes(c.scope) &&
    typeof c.title === "string" &&
    typeof c.text === "string" &&
    ["active", "completed", "cancelled", "replaced"].includes(c.status) &&
    (c.changedBy === undefined || typeof c.changedBy === "string") &&
    (c.changedInStage === undefined || typeof c.changedInStage === "string")
  );
}
function isInterruption(value: unknown, nested = false): value is Interruption {
  if (!value || typeof value !== "object") return false;
  const e = value as Interruption;
  return (
    typeof e.id === "string" &&
    e.id.length > 0 &&
    narrators.includes(e.narrator) &&
    typeof e.title === "string" &&
    typeof e.text === "string" &&
    Number.isFinite(e.remaining) &&
    e.remaining >= 0 &&
    Number.isFinite(e.duration) &&
    e.duration > 0 &&
    e.remaining <= e.duration &&
    Number.isFinite(e.priority) &&
    (e.cancelsParent === undefined || typeof e.cancelsParent === "boolean") &&
    (e.operation === undefined ||
      ["add", "replace", "cancel", "comment"].includes(e.operation)) &&
    (e.targetConditionId === undefined ||
      typeof e.targetConditionId === "string") &&
    (e.conditionId === undefined || typeof e.conditionId === "string") &&
    (e.conditionsBefore === undefined ||
      (Array.isArray(e.conditionsBefore) &&
        e.conditionsBefore.every(isCondition))) &&
    (e.completedReplies === undefined ||
      (Array.isArray(e.completedReplies) &&
        e.completedReplies.length <= (nested ? 0 : 1) &&
        e.completedReplies.every(
          (reply) => isInterruption(reply, true) && reply.priority > e.priority,
        )))
  );
}
const safeMoney = (n: unknown) =>
  typeof n === "number" && Number.isSafeInteger(n) && n >= 0 && n <= 100000;
/** Old auctions used a different economy and cannot be resumed under the new rules. Other games migrate. */
export function restoreSession(value: unknown): Session | null {
  if (!value || typeof value !== "object") return null;
  const s = value as Session;
  if (
    s.version !== 1 ||
    !gameIds.includes(s.game) ||
    !narrators.includes(s.narrator) ||
    !Number.isInteger(s.stageIndex) ||
    s.stageIndex < 0 ||
    typeof s.stageId !== "string" ||
    (s.stageKind !== undefined &&
      ![
        "discussion",
        "draw",
        "choice",
        "secret",
        "auction",
        "verdict",
      ].includes(s.stageKind)) ||
    (s.currentLotId !== null && typeof s.currentLotId !== "string") ||
    (s.currentLotTitle !== undefined &&
      typeof s.currentLotTitle !== "string") ||
    !Number.isFinite(s.remaining) ||
    s.remaining < 0 ||
    !Number.isFinite(s.elapsed) ||
    s.elapsed < 0 ||
    !Number.isFinite(s.cooldown) ||
    s.cooldown < 0 ||
    !Number.isInteger(s.totalInterruptions) ||
    s.totalInterruptions < 0 ||
    s.totalInterruptions > INTERRUPTION_LIMITS.total ||
    !Number.isInteger(s.interruptionChain) ||
    s.interruptionChain < 0 ||
    s.interruptionChain > INTERRUPTION_LIMITS.chain ||
    !Number.isFinite(s.variant) ||
    !Number.isInteger(s.intimacy) ||
    s.intimacy < 0 ||
    s.intimacy > 2 ||
    typeof s.paused !== "boolean" ||
    typeof s.finished !== "boolean" ||
    !Array.isArray(s.stack) ||
    s.stack.length > INTERRUPTION_LIMITS.depth ||
    !Array.isArray(s.choiceIds) ||
    !s.choiceIds.every((id) => typeof id === "string") ||
    !Array.isArray(s.balances) ||
    s.balances.length !== 2 ||
    !s.balances.every(safeMoney) ||
    !s.decisions ||
    typeof s.decisions !== "object" ||
    Array.isArray(s.decisions) ||
    !Object.values(s.decisions).every((c) => typeof c === "string") ||
    !Array.isArray(s.auctionHistory) ||
    !Array.isArray(s.log) ||
    (s.conditions !== undefined &&
      (!Array.isArray(s.conditions) ||
        !s.conditions.every(isCondition) ||
        new Set(s.conditions.map((c) => c.id)).size !== s.conditions.length))
  )
    return null;
  if (s.game === "auction" && s.auction === undefined) return null;
  if (
    s.game !== "auction" &&
    (s.auction || s.stageKind === "auction" || s.currentLotId !== null)
  )
    return null;
  if (
    s.auction &&
    (!isAuctionState(s.auction) ||
      s.stageKind !== "auction" ||
      s.auction.balances.some((n, i) => n !== s.balances[i]) ||
      s.auction.narrator !== s.narrator)
  )
    return null;
  if (s.stageKind === "auction" && !s.auction) return null;
  if (
    s.stack.some((e) => !isInterruption(e)) ||
    new Set(s.stack.map((e) => e.id)).size !== s.stack.length ||
    s.stack.length > s.interruptionChain ||
    s.interruptionChain > s.totalInterruptions ||
    s.stack.some(
      (e, index) => index > 0 && e.priority <= s.stack[index - 1].priority,
    ) ||
    s.stack.some(
      (e) =>
        (e.completedReplies?.length ?? 0) + s.stack.length >
        s.interruptionChain,
    ) ||
    (s.stack.length > 0 &&
      (s.finished ||
        s.game === "auction" ||
        s.stageKind === "secret" ||
        s.remaining <= 0))
  )
    return null;
  if (
    s.log.some(
      (l) =>
        !l ||
        !Number.isSafeInteger(l.id) ||
        l.id < 1 ||
        typeof l.text !== "string" ||
        !["stage", "interruption", "auction", "choice", "system"].includes(
          l.type,
        ),
    )
  )
    return null;
  if (
    s.log.some((entry, index) => index > 0 && entry.id <= s.log[index - 1].id)
  )
    return null;
  if (
    s.auctionHistory.some(
      (l) =>
        !l ||
        typeof l.lotId !== "string" ||
        typeof l.title !== "string" ||
        !narrators.includes(l.narrator) ||
        ![null, 0, 1].includes(l.winner) ||
        ![null, 0, 1].includes(l.respondent) ||
        !safeMoney(l.price) ||
        typeof l.storyPassed !== "boolean" ||
        (l.eventText !== undefined && typeof l.eventText !== "string") ||
        !Array.isArray(l.log) ||
        !l.log.every((x) => typeof x === "string") ||
        (l.bonusQuestionId !== undefined &&
          (typeof l.bonusQuestionId !== "string" ||
            typeof l.bonusQuestion !== "string")),
    )
  )
    return null;
  return {
    ...s,
    auction: s.auction ?? null,
    currentLotTitle: s.currentLotTitle ?? "",
    conditions: s.conditions?.length
      ? s.conditions
      : hostConditions(s.narrator, s.game, s.intimacy, s.stageId),
    paused: true,
  };
}
