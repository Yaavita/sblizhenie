import type { NarratorId } from "../content/types";

export type AuctionPlayer = 0 | 1;
export type AuctionPhase =
  "preview" | "bidding" | "story" | "event" | "reward" | "done";
export type AuctionBalances = [number, number];
export interface AuctionLogEntry {
  id: number;
  type:
    | "bid"
    | "pass"
    | "timeout"
    | "payment"
    | "story"
    | "event"
    | "swap"
    | "reward"
    | "system";
  text: string;
  player?: AuctionPlayer;
  amount?: number;
}
export interface AuctionEvent {
  type: "swap" | "bonus";
  narrator: NarratorId;
  text: string;
  target: AuctionPlayer;
  evaluator: AuctionPlayer;
  amount: number;
  questionSeed: number;
  remaining: number;
  resolved: boolean;
}
export interface AuctionState {
  version: 1;
  variant: number;
  lotIndex: number;
  narrator: NarratorId;
  phase: AuctionPhase;
  balances: AuctionBalances;
  initialBalances: AuctionBalances;
  priorEvents: number;
  lastEventLot: number | null;
  firstPlayer: AuctionPlayer;
  turn: AuctionPlayer;
  turnRemaining: number;
  highestBid: number;
  highestBidder: AuctionPlayer | null;
  openingPasses: [boolean, boolean];
  winner: AuctionPlayer | null;
  loser: AuctionPlayer | null;
  price: number;
  storyRemaining: number;
  storyPassed: boolean;
  event: AuctionEvent | null;
  log: AuctionLogEntry[];
}
export type AuctionAction =
  | { type: "OPEN" }
  | { type: "BID" }
  | { type: "PASS" }
  | { type: "TICK"; delta: number; paused?: boolean }
  | { type: "STORY_DONE" }
  | { type: "STORY_PASS" }
  | { type: "EVENT_CONTINUE" }
  | { type: "EVENT_PASS" }
  | { type: "BONUS_DONE" }
  | { type: "REWARD"; approved: boolean }
  | { type: "FINISH" };

export const AUCTION_LOT_COUNT = 10;
export const AUCTION_TURN_SECONDS = 30;
export const AUCTION_STORY_SECONDS = 90;
export const AUCTION_INITIAL_BALANCES: AuctionBalances = [100, 100];

export const auctionEventLines = {
  chance: {
    swap: "Случай велел поменять ваши кошельки местами. Ничего личного. Просто деньги сегодня захотели приключений.",
    bonus:
      "У кого меньше монет — тому неожиданный вопрос. Ответите — второй решит, заслуживает ли история награды из банка.",
  },
};
const policies: Record<NarratorId, { reward: number }> = {
  noise: { reward: 15 },
  momo: { reward: 15 },
  archivist: { reward: 15 },
  chance: { reward: 15 },
  noir: { reward: 15 },
};
const other = (player: AuctionPlayer): AuctionPlayer => (player === 0 ? 1 : 0);
const integer = (value: number) =>
  Number.isFinite(value) ? Math.trunc(value) : 0;
const indexOf = (value: number) =>
  ((integer(value) % AUCTION_LOT_COUNT) + AUCTION_LOT_COUNT) %
  AUCTION_LOT_COUNT;
const money = (value: number) =>
  Number.isSafeInteger(value) && value >= 0 ? value : 0;

/** Stable integer mixing makes restored rounds deterministic without touching Math.random. */
function seed(variant: number, lotIndex: number, salt = 0): number {
  let value =
    (integer(variant) ^ Math.imul(integer(lotIndex) + 1, 0x9e3779b9) ^ salt) >>>
    0;
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35);
  return (value ^ (value >>> 16)) >>> 0;
}

export function startingPlayer(
  variant: number,
  lotIndex: number,
): AuctionPlayer {
  return (seed(variant, lotIndex) % 2) as AuctionPlayer;
}

/** The same draw is compared with a larger threshold when the wallets diverge. */
export function chanceProbability(balances: AuctionBalances): number {
  const total = balances[0] + balances[1];
  const difference = total ? Math.abs(balances[0] - balances[1]) / total : 0;
  return 0.08 + difference * 0.58;
}
export function plannedAuctionEvent(
  variant: number,
  lotIndex: number,
  narrator: NarratorId,
  balances: AuctionBalances,
  winner: AuctionPlayer | null,
  priorEvents = 0,
  lastEventLot: number | null = null,
): AuctionEvent | null {
  const probability = chanceProbability(balances);
  if (
    lotIndex >= 9 ||
    priorEvents >= 5 ||
    (lastEventLot === lotIndex - 1 && probability < 0.45)
  )
    return null;
  if (seed(variant, lotIndex, 307) / 4294967296 >= probability) return null;
  const random = seed(variant, lotIndex, 101);
  const type = random % 2 ? "bonus" : "swap";
  const target: AuctionPlayer =
    balances[0] === balances[1]
      ? ((random % 2) as AuctionPlayer)
      : balances[0] < balances[1]
        ? 0
        : 1;
  return {
    type,
    narrator: "chance",
    text: auctionEventLines.chance[type],
    target,
    evaluator: winner !== null && winner !== target ? winner : other(target),
    amount: policies[narrator].reward,
    questionSeed: (integer(variant) % 100000) * 10 + indexOf(lotIndex),
    remaining: AUCTION_STORY_SECONDS,
    resolved: false,
  };
}

function log(
  state: AuctionState,
  type: AuctionLogEntry["type"],
  text: string,
  player?: AuctionPlayer,
  amount?: number,
): AuctionLogEntry[] {
  return [
    ...state.log,
    {
      id: (state.log.at(-1)?.id ?? 0) + 1,
      type,
      text,
      ...(player === undefined ? {} : { player }),
      ...(amount === undefined ? {} : { amount }),
    },
  ];
}

function betweenRounds(state: AuctionState): AuctionState {
  const event = plannedAuctionEvent(
    state.variant,
    state.lotIndex,
    state.narrator,
    state.balances,
    state.winner,
    state.priorEvents,
    state.lastEventLot,
  );
  return {
    ...state,
    phase: event ? "event" : "done",
    event,
    ...(event
      ? {
          log: log(
            state,
            "event",
            event.type === "swap"
              ? "Между раундами ведущий предлагает поменять кошельки местами."
              : `Игрок ${event.target + 1} может заработать ${event.amount} монет из банка ответом на дополнительный вопрос.`,
            event.target,
          ),
        }
      : {}),
  };
}

function settle(state: AuctionState): AuctionState {
  if (state.highestBidder === null)
    return betweenRounds({
      ...state,
      turnRemaining: 0,
      log: log(
        state,
        "system",
        "Оба игрока пропустили: лот остаётся без покупателя.",
      ),
    });
  const winner = state.highestBidder;
  const balances: AuctionBalances = [...state.balances];
  const price = state.highestBid;
  balances[winner] -= price;
  return {
    ...state,
    phase: "story",
    balances,
    winner,
    loser: other(winner),
    price,
    turnRemaining: 0,
    storyRemaining: AUCTION_STORY_SECONDS,
    log: log(
      state,
      "payment",
      `Игрок ${winner + 1} платит ${price} монет банку за рассказ игрока ${other(winner) + 1}.`,
      winner,
      price,
    ),
  };
}

function pass(
  state: AuctionState,
  reason: "pass" | "timeout" | "funds",
): AuctionState {
  const player = state.turn;
  const next: AuctionState = {
    ...state,
    log: log(
      state,
      reason === "timeout" ? "timeout" : "pass",
      reason === "timeout"
        ? `Время игрока ${player + 1} истекло: пас.`
        : reason === "funds"
          ? `У игрока ${player + 1} недостаточно монет для повышения: автоматический пас.`
          : `Игрок ${player + 1}: пас.`,
      player,
    ),
  };
  if (state.highestBidder !== null) return settle(next);
  return state;
}

export function startRound(
  variant: number,
  lotIndex: number,
  narrator: NarratorId,
  balances: AuctionBalances = [...AUCTION_INITIAL_BALANCES],
  context: { priorEvents: number; lastEventLot: number | null } = {
    priorEvents: 0,
    lastEventLot: null,
  },
): AuctionState {
  const firstPlayer = startingPlayer(variant, indexOf(lotIndex));
  const safeBalances: AuctionBalances = [
    money(balances[0]),
    money(balances[1]),
  ];
  const state: AuctionState = {
    version: 1,
    variant: integer(variant),
    lotIndex: indexOf(lotIndex),
    narrator,
    phase: "preview",
    balances: safeBalances,
    initialBalances: [...safeBalances],
    priorEvents: context.priorEvents,
    lastEventLot: context.lastEventLot,
    firstPlayer,
    turn: firstPlayer,
    turnRemaining: AUCTION_TURN_SECONDS,
    highestBid: 0,
    highestBidder: null,
    openingPasses: [false, false],
    winner: null,
    loser: null,
    price: 0,
    storyRemaining: AUCTION_STORY_SECONDS,
    storyPassed: false,
    event: null,
    log: [],
  };
  return state;
}

export function auctionReducer(
  state: AuctionState,
  action: AuctionAction,
): AuctionState {
  if (state.phase === "done") return state;
  switch (action.type) {
    case "OPEN": {
      if (state.phase !== "preview") return state;
      let opened: AuctionState = { ...state, phase: "bidding" };
      if (opened.balances.every((n) => n === 0)) {
        const balances: AuctionBalances = [
          opened.balances[0],
          opened.balances[1],
        ];
        balances[opened.firstPlayer] = 1;
        opened = {
          ...opened,
          balances,
          log: log(
            opened,
            "system",
            `Оба кошелька пусты: банк выдаёт игроку ${opened.firstPlayer + 1} одну монету для обязательного входа.`,
          ),
        };
        return auctionReducer(opened, { type: "BID" });
      }
      if (opened.balances[opened.turn] < 1) {
        const turn = other(opened.turn);
        opened = {
          ...opened,
          turn,
          log: log(
            opened,
            "system",
            `У игрока ${opened.firstPlayer + 1} нет монет. Вход переходит к игроку ${turn + 1}: автоматическая ставка 1 монета.`,
          ),
        };
        return auctionReducer(opened, { type: "BID" });
      }
      return opened;
    }
    case "BID": {
      if (state.phase !== "bidding") return state;
      const amount = state.highestBid + 1;
      if (state.balances[state.turn] < amount) return pass(state, "funds");
      const bidder = state.turn;
      const turn = other(bidder);
      const next: AuctionState = {
        ...state,
        highestBid: amount,
        highestBidder: bidder,
        turn,
        turnRemaining: AUCTION_TURN_SECONDS,
        log: log(
          state,
          "bid",
          `Игрок ${bidder + 1} повышает ставку до ${amount}.`,
          bidder,
          amount,
        ),
      };
      return next.balances[turn] < amount + 1 ? pass(next, "funds") : next;
    }
    case "PASS":
      return state.phase === "bidding" && state.highestBidder !== null
        ? pass(state, "pass")
        : state;
    case "TICK": {
      if (action.paused || !Number.isFinite(action.delta) || action.delta <= 0)
        return state;
      if (state.phase === "bidding") {
        const remaining = Math.max(0, state.turnRemaining - action.delta);
        return remaining === 0
          ? state.highestBidder === null
            ? auctionReducer(
                {
                  ...state,
                  turnRemaining: 0,
                  log: log(
                    state,
                    "timeout",
                    `Время игрока ${state.turn + 1} истекло: обязательная ставка 1 монета.`,
                  ),
                },
                { type: "BID" },
              )
            : pass({ ...state, turnRemaining: 0 }, "timeout")
          : { ...state, turnRemaining: remaining };
      }
      if (state.phase === "story")
        return {
          ...state,
          storyRemaining: Math.max(0, state.storyRemaining - action.delta),
        };
      if (state.phase === "event" && state.event?.type === "bonus")
        return {
          ...state,
          event: {
            ...state.event,
            remaining: Math.max(0, state.event.remaining - action.delta),
          },
        };
      return state;
    }
    case "STORY_DONE":
    case "STORY_PASS":
      return state.phase === "story"
        ? betweenRounds({
            ...state,
            storyPassed: action.type === "STORY_PASS",
            log: log(
              state,
              "story",
              action.type === "STORY_PASS"
                ? "Рассказчик решил пропустить личный ответ без объяснений."
                : "Рассказ завершён.",
              state.loser ?? undefined,
            ),
          })
        : state;
    case "EVENT_CONTINUE":
      return state.phase === "event" &&
        state.event?.type === "swap" &&
        !state.event.resolved
        ? {
            ...state,
            phase: "done",
            balances: [state.balances[1], state.balances[0]],
            event: { ...state.event, resolved: true },
            log: log(
              state,
              "swap",
              "Кошельки поменялись местами. Банк ничего не добавил.",
            ),
          }
        : state;
    case "EVENT_PASS":
      return (state.phase === "event" || state.phase === "reward") &&
        state.event &&
        !state.event.resolved
        ? {
            ...state,
            phase: "done",
            event: { ...state.event, resolved: true },
            log: log(
              state,
              "event",
              "Дополнительное событие пропущено. Монеты не начислены.",
              state.event.target,
            ),
          }
        : state;
    case "BONUS_DONE":
      return state.phase === "event" &&
        state.event?.type === "bonus" &&
        !state.event.resolved
        ? {
            ...state,
            phase: "reward",
            log: log(
              state,
              "story",
              "Дополнительный рассказ завершён. Решение о награде — за другим игроком.",
              state.event.target,
            ),
          }
        : state;
    case "REWARD": {
      if (
        state.phase !== "reward" ||
        state.event?.type !== "bonus" ||
        state.event.resolved
      )
        return state;
      const balances: AuctionBalances = [...state.balances];
      const amount = action.approved ? state.event.amount : 0;
      balances[state.event.target] = Math.min(
        Number.MAX_SAFE_INTEGER,
        balances[state.event.target] + amount,
      );
      return {
        ...state,
        phase: "done",
        balances,
        event: { ...state.event, resolved: true },
        log: log(
          state,
          "reward",
          action.approved
            ? `Игрок ${state.event.evaluator + 1} одобрил ответ: банк выдаёт игроку ${state.event.target + 1} ${amount} монет.`
            : `Игрок ${state.event.evaluator + 1} не одобрил ответ: награда не начислена.`,
          state.event.target,
          amount,
        ),
      };
    }
    case "FINISH":
      return {
        ...state,
        storyPassed: state.phase === "story" ? true : state.storyPassed,
        phase: "done",
        log: log(
          state,
          "system",
          "Раунд завершён досрочно без дополнительных начислений.",
        ),
      };
  }
}

/** Defensive validation of a persisted in-progress open auction. */
export function isAuctionState(value: unknown): value is AuctionState {
  if (!value || typeof value !== "object") return false;
  const s = value as AuctionState;
  const number = (n: unknown) =>
    typeof n === "number" && Number.isFinite(n) && n >= 0;
  const coins = (n: unknown) =>
    number(n) && Number.isSafeInteger(n) && (n as number) <= 100000;
  const player = (n: unknown) => n === 0 || n === 1;
  const pair = (v: unknown) =>
    Array.isArray(v) && v.length === 2 && v.every(coins);
  if (
    s.version !== 1 ||
    !Number.isInteger(s.variant) ||
    !Number.isInteger(s.lotIndex) ||
    s.lotIndex < 0 ||
    s.lotIndex >= 10 ||
    !["noise", "momo", "archivist", "chance", "noir"].includes(s.narrator) ||
    !["preview", "bidding", "story", "event", "reward", "done"].includes(
      s.phase,
    ) ||
    !pair(s.balances) ||
    !pair(s.initialBalances) ||
    !Number.isInteger(s.priorEvents) ||
    s.priorEvents < 0 ||
    s.priorEvents > 5 ||
    (s.lastEventLot !== null &&
      (!Number.isInteger(s.lastEventLot) || s.lastEventLot >= s.lotIndex)) ||
    !player(s.turn) ||
    !player(s.firstPlayer) ||
    !number(s.turnRemaining) ||
    s.turnRemaining > 30 ||
    !coins(s.highestBid) ||
    (s.highestBidder !== null && !player(s.highestBidder)) ||
    !Array.isArray(s.openingPasses) ||
    s.openingPasses.length !== 2 ||
    !s.openingPasses.every((x) => typeof x === "boolean") ||
    (s.winner !== null && !player(s.winner)) ||
    (s.loser !== null && !player(s.loser)) ||
    !coins(s.price) ||
    !number(s.storyRemaining) ||
    s.storyRemaining > 90 ||
    typeof s.storyPassed !== "boolean" ||
    !Array.isArray(s.log)
  )
    return false;
  if (
    s.log.some(
      (l) =>
        !l ||
        !Number.isInteger(l.id) ||
        typeof l.text !== "string" ||
        typeof l.type !== "string",
    )
  )
    return false;
  if (
    s.phase === "bidding" &&
    (s.winner !== null ||
      s.loser !== null ||
      s.price !== 0 ||
      (s.highestBidder !== null &&
        (s.highestBidder === s.turn ||
          s.highestBid > s.balances[s.highestBidder])))
  )
    return false;
  if (
    s.winner !== null &&
    (s.loser !== other(s.winner) || s.price !== s.highestBid)
  )
    return false;
  if ((s.phase === "event" || s.phase === "reward") && !s.event) return false;
  if (
    s.event &&
    (!["swap", "bonus"].includes(s.event.type) ||
      s.event.narrator !== "chance" ||
      typeof s.event.text !== "string" ||
      !player(s.event.target) ||
      !player(s.event.evaluator) ||
      s.event.target === s.event.evaluator ||
      !coins(s.event.amount) ||
      !Number.isSafeInteger(s.event.questionSeed) ||
      !number(s.event.remaining) ||
      s.event.remaining > 90 ||
      typeof s.event.resolved !== "boolean")
  )
    return false;
  if (s.phase === "reward" && s.event?.type !== "bonus") return false;
  return true;
}
