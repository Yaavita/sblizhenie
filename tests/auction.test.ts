import { describe, expect, it } from "vitest";
import {
  auctionReducer,
  chanceProbability,
  isAuctionState,
  plannedAuctionEvent,
  startRound,
  startingPlayer,
  type AuctionAction,
  type AuctionState,
} from "../src/engine/auction";
const act = (s: AuctionState, type: AuctionAction["type"]) =>
  auctionReducer(s, { type } as AuctionAction);
const open = (variant = 8, balances: [number, number] = [100, 100]) =>
  act(startRound(variant, 0, "momo", balances), "OPEN");
const sold = (variant = 8) => act(act(open(variant), "BID"), "PASS");
const variantFor = (
  type: "swap" | "bonus",
  balances: [number, number] = [99, 100],
) =>
  Array.from({ length: 1000 }, (_, v) => v).find(
    (v) => plannedAuctionEvent(v, 0, "noise", balances, null)?.type === type,
  )!;
describe("open story auction", () => {
  it("gives unlimited preparation and starts only on explicit OPEN", () => {
    const s = startRound(8, 0, "noise");
    expect(s.phase).toBe("preview");
    for (const type of ["BID", "PASS"] as const) expect(act(s, type)).toBe(s);
    expect(auctionReducer(s, { type: "TICK", delta: 600 })).toBe(s);
    expect(act(s, "OPEN").phase).toBe("bidding");
  });
  it("has a stable random first player and requires the opening bid", () => {
    expect(
      new Set(Array.from({ length: 100 }, (_, v) => startingPlayer(v, 0))).size,
    ).toBe(2);
    const s = open();
    expect(s.turn).toBe(startingPlayer(8, 0));
    expect(act(s, "PASS")).toBe(s);
    expect(act(s, "BID").highestBid).toBe(1);
  });
  it("raises by one, alternates turns, and charges only the winner once", () => {
    let s = open();
    const first = s.turn;
    s = act(s, "BID");
    expect(s.turn).toBe(1 - first);
    expect(s.balances).toEqual([100, 100]);
    s = act(s, "BID");
    expect(s.highestBid).toBe(2);
    expect(s.turn).toBe(first);
    s = act(s, "PASS");
    expect(s.phase).toBe("story");
    expect(s.winner).toBe(1 - first);
    expect(s.loser).toBe(first);
    expect(s.balances[s.winner!]).toBe(98);
    expect(s.balances[s.loser!]).toBe(100);
    expect(act(s, "BID")).toBe(s);
    expect(act(s, "PASS")).toBe(s);
  });
  it("automatically transfers and pays the opening when the selected player is broke", () => {
    const first = startingPlayer(8, 0);
    const balances: [number, number] = [10, 10];
    balances[first] = 0;
    const s = open(8, balances);
    expect(s.phase).toBe("story");
    expect(s.price).toBe(1);
    expect(s.winner).toBe(1 - first);
    expect(s.balances[1 - first]).toBe(9);
    expect(s.log.some((l) => l.text.includes("Вход переходит"))).toBe(true);
  });
  it("funds a one-coin entrance when both wallets are empty, ensuring a buyer", () => {
    const s = open(8, [0, 0]);
    expect(s.phase).toBe("story");
    expect(s.price).toBe(1);
    expect(s.winner).not.toBeNull();
    expect(s.balances).toEqual([0, 0]);
    expect(s.log.some((l) => l.text.includes("Оба кошелька"))).toBe(true);
  });
  it("auto-concedes when a player cannot raise and never overdraws", () => {
    let s = open(8, [2, 2]);
    for (let i = 0; i < 20 && s.phase === "bidding"; i++) s = act(s, "BID");
    expect(s.phase).toBe("story");
    expect(s.price).toBe(2);
    expect(s.balances.reduce((a, b) => a + b, 0)).toBe(2);
    expect(s.balances.every((n) => n >= 0)).toBe(true);
  });
  it("times out the mandatory opening as a one-coin bid, then later turns as pass", () => {
    let s = open();
    const first = s.turn;
    s = auctionReducer(s, { type: "TICK", delta: 500 });
    expect(s.highestBid).toBe(1);
    expect(s.turn).toBe(1 - first);
    expect(s.turnRemaining).toBe(30);
    s = auctionReducer(s, { type: "TICK", delta: 500 });
    expect(s.phase).toBe("story");
    expect(s.storyRemaining).toBe(90);
  });
  it("pauses and rejects invalid ticks, leaving story completion manual", () => {
    const s = open();
    for (const delta of [NaN, Infinity, -1, 0])
      expect(auctionReducer(s, { type: "TICK", delta })).toBe(s);
    expect(auctionReducer(s, { type: "TICK", delta: 50, paused: true })).toBe(
      s,
    );
    const story = auctionReducer(sold(), { type: "TICK", delta: 500 });
    expect(story.phase).toBe("story");
    expect(story.storyRemaining).toBe(0);
  });
  it("supports voluntary answer skipping after payment without a double charge", () => {
    const s = sold();
    const done = act(s, "STORY_PASS");
    expect(done.storyPassed).toBe(true);
    expect(done.balances).toEqual(s.balances);
  });
});
describe("Chance and money", () => {
  it("increases intervention probability monotonically with wallet inequality", () => {
    expect(chanceProbability([100, 100])).toBe(0.08);
    expect(chanceProbability([0, 100])).toBeCloseTo(0.66);
    for (let n = 0; n < 100; n++)
      expect(chanceProbability([n, 100])).toBeGreaterThanOrEqual(
        chanceProbability([n + 1, 100]),
      );
    let equal = 0,
      unequal = 0;
    for (let v = 0; v < 1000; v++) {
      if (plannedAuctionEvent(v, 0, "noise", [100, 100], null)) equal++;
      if (plannedAuctionEvent(v, 0, "noise", [0, 100], null)) unequal++;
    }
    expect(equal).toBeLessThan(120);
    expect(unequal).toBeGreaterThan(600);
  });
  it("is deterministic, only Chance appears, and the cap/cooldown prevent event spam", () => {
    const v = variantFor("bonus");
    const e = plannedAuctionEvent(v, 0, "momo", [99, 100], null)!;
    expect(e.narrator).toBe("chance");
    expect(e).toEqual(plannedAuctionEvent(v, 0, "noir", [99, 100], null));
    expect(
      plannedAuctionEvent(v, 0, "noise", [0, 100], null, 5, null),
    ).toBeNull();
    expect(
      plannedAuctionEvent(v, 1, "noise", [100, 100], null, 1, 0),
    ).toBeNull();
    expect(plannedAuctionEvent(v, 9, "noise", [0, 100], null)).toBeNull();
  });
  it("changes wallets only after the swap is accepted and only once", () => {
    const v = variantFor("swap");
    let s = act(sold(v), "STORY_DONE");
    // variantFor's asymmetric input may have the other winner; inequality is symmetric.
    expect(s.event?.type).toBe("swap");
    const before = [...s.balances];
    s = act(s, "EVENT_CONTINUE");
    expect(s.balances).toEqual([before[1], before[0]]);
    expect(act(s, "EVENT_CONTINUE")).toBe(s);
  });
  it("pays the poorer player from the bank only after another player's approval", () => {
    const v = variantFor("bonus");
    let s = act(sold(v), "STORY_DONE");
    expect(s.event?.type).toBe("bonus");
    const target = s.event!.target;
    expect(s.balances[target]).toBe(99);
    expect(s.event?.evaluator).toBe(1 - target);
    expect(auctionReducer(s, { type: "REWARD", approved: true })).toBe(s);
    s = act(s, "BONUS_DONE");
    s = auctionReducer(s, { type: "REWARD", approved: true });
    expect(s.balances[target]).toBe(114);
    expect(s.balances[1 - target]).toBe(100);
    expect(auctionReducer(s, { type: "REWARD", approved: true })).toBe(s);
  });
  it("declining or skipping bonus gives nothing", () => {
    const pending = act(sold(variantFor("bonus")), "STORY_DONE");
    for (const input of [pending, act(pending, "BONUS_DONE")])
      expect(act(input, "EVENT_PASS").balances).toEqual(pending.balances);
    const rejected = auctionReducer(act(pending, "BONUS_DONE"), {
      type: "REWARD",
      approved: false,
    });
    expect(rejected.balances).toEqual(pending.balances);
    expect(rejected.phase).toBe("done");
  });
  it("validates persisted phases and balances", () => {
    for (const s of [
      startRound(8, 0, "noise"),
      open(),
      sold(),
      act(sold(variantFor("bonus")), "STORY_DONE"),
    ])
      expect(isAuctionState(JSON.parse(JSON.stringify(s)))).toBe(true);
    expect(isAuctionState({ ...open(), phase: "bad" })).toBe(false);
    expect(isAuctionState({ ...open(), balances: [-1, 100] })).toBe(false);
  });
});
