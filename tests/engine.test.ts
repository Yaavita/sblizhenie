import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canInterrupt,
  initialSession,
  reducer,
  restoreSession,
  type Interruption,
  type Session,
} from "../src/engine/engine";
import { buildStages } from "../src/content/games";
import type { Stage } from "../src/content/types";
import { clearSession, readSaved, saveSession } from "../src/hooks/storage";
import { plannedAuctionEvent } from "../src/engine/auction";
const stage: Stage = {
  id: "draw",
  title: "Будущее",
  body: "Рисуйте.",
  seconds: 180,
  kind: "draw",
};
const create = () => initialSession("universes", "noir", 0, 1, stage);
const ready = () => reducer(create(), { type: "TICK", delta: 90 });
const event = (
  id = "chance",
  priority = 1,
  cancelsParent = false,
): Interruption => ({
  id,
  narrator: id === "archive" ? "archivist" : "chance",
  title: "Стоп",
  text: "Гравитация исчезла",
  remaining: 60,
  duration: 60,
  priority,
  cancelsParent,
});
describe("timer and condition stack", () => {
  it("preserves exact base time under nested cancellations and discards overflow", () => {
    let s = reducer(ready(), { type: "INTERRUPT", event: event() });
    s = reducer(s, { type: "TICK", delta: 10 });
    s = reducer(s, {
      type: "INTERRUPT",
      event: { ...event("archive", 2, true), duration: 8 },
    });
    s = reducer(s, { type: "TICK", delta: 99999 });
    expect(s.stack).toEqual([]);
    expect(s.remaining).toBe(90);
    expect(reducer(s, { type: "TICK", delta: 1 }).remaining).toBe(89);
  });
  it("returns to the parent normally and pauses every level", () => {
    let s = reducer(ready(), { type: "INTERRUPT", event: event() });
    s = reducer(s, { type: "TICK", delta: 7.25 });
    s = reducer(s, { type: "INTERRUPT", event: event("archive", 2) });
    s = reducer(s, { type: "PAUSE" });
    expect(reducer(s, { type: "TICK", delta: 500 })).toBe(s);
    s = reducer(s, { type: "END_INTERRUPTION" });
    expect(s.stack[0].remaining).toBe(52.75);
    expect(s.remaining).toBe(90);
  });
  it("enforces cooldown, priority, depth, chain and total interruption limits", () => {
    expect(canInterrupt(create())).toBe(false);
    let s = reducer(ready(), { type: "INTERRUPT", event: event() });
    expect(reducer(s, { type: "INTERRUPT", event: event("equal") })).toBe(s);
    s = reducer(s, { type: "INTERRUPT", event: event("archive", 2) });
    expect(reducer(s, { type: "INTERRUPT", event: event("third", 3) })).toBe(s);
    s = reducer(s, { type: "END_INTERRUPTION" });
    expect(reducer(s, { type: "INTERRUPT", event: event("third", 3) })).toBe(s);
    s = reducer(s, { type: "CANCEL_ALL_INTERRUPTION" });
    expect(canInterrupt(s)).toBe(false);
    s = { ...s, remaining: 1000 };
    for (let i = 0; i < 3; i++) {
      s = reducer(s, { type: "TICK", delta: 90 });
      s = reducer(s, { type: "INTERRUPT", event: event(`event-${i}`) });
      s = reducer(s, { type: "END_INTERRUPTION" });
    }
    s = reducer(s, { type: "TICK", delta: 90 });
    expect(s.totalInterruptions).toBe(5);
    expect(canInterrupt(s)).toBe(false);
  });
  it("rejects invalid deltas, never runs negative, and cannot resume a finished game", () => {
    const s = ready();
    for (const delta of [NaN, Infinity, -1, 0])
      expect(reducer(s, { type: "TICK", delta })).toBe(s);
    expect(reducer(s, { type: "TICK", delta: 10000 }).remaining).toBe(0);
    const done = reducer(s, { type: "FINISH" });
    expect(reducer(done, { type: "RESUME" })).toBe(done);
  });
  it("does not change the main dealer outside auction and refuses NEXT under interruption", () => {
    const s = reducer(ready(), { type: "INTERRUPT", event: event() });
    expect(reducer(s, { type: "NEXT", stage })).toBe(s);
    const next = reducer(reducer(s, { type: "CANCEL_ALL_INTERRUPTION" }), {
      type: "NEXT",
      stage: { ...stage, id: "next" },
      narrator: "noise",
    });
    expect(next.narrator).toBe("noir");
  });
  it("keeps added rules, records replacements, and reverses nested replacements in order", () => {
    const initial = ready(),
      target = initial.conditions[0];
    let s = reducer(initial, {
      type: "INTERRUPT",
      event: { ...event(), operation: "replace", targetConditionId: target.id },
    });
    const parent = s.stack[0].conditionId!;
    s = reducer(s, {
      type: "INTERRUPT",
      event: {
        ...event("archive", 2),
        operation: "replace",
        targetConditionId: parent,
      },
    });
    const child = s.stack[1].conditionId!;
    expect(s.conditions.find((c) => c.id === target.id)?.status).toBe(
      "replaced",
    );
    s = reducer(s, { type: "CANCEL_ALL_INTERRUPTION" });
    expect(s.conditions.find((c) => c.id === target.id)).toEqual(target);
    for (const id of [parent, child])
      expect(s.conditions.find((c) => c.id === id)?.status).toBe("cancelled");
    s = reducer(s, { type: "TICK", delta: 90 });
    s = { ...s, remaining: 200 };
    s = reducer(s, { type: "INTERRUPT", event: event("added") });
    const added = s.stack[0].conditionId;
    s = reducer(s, { type: "END_INTERRUPTION" });
    expect(s.conditions.find((c) => c.id === added)?.status).toBe("active");
    s = reducer(s, { type: "NEXT", stage: { ...stage, id: "next" } });
    expect(s.conditions.find((c) => c.id === added)?.status).toBe("completed");
  });
  it("restores missing conditions and paused suspended timers, rejecting malformed saves", () => {
    const s = reducer(ready(), { type: "INTERRUPT", event: event() });
    expect(restoreSession(JSON.parse(JSON.stringify(s)))).toEqual({
      ...s,
      paused: true,
    });
    expect(restoreSession({ ...s, conditions: [] })?.conditions).toEqual(
      create().conditions,
    );
    for (const input of [
      null,
      { ...s, remaining: -1 },
      { ...s, balances: [NaN, 100] },
      { ...s, stack: [{ ...event(), duration: Infinity }] },
      { ...s, conditions: [{}] },
    ])
      expect(restoreSession(input)).toBeNull();
  });
});
describe("non-auction regression audit", () => {
  it.each(["replace", "add"] as const)(
    "rolls back a completed nested %s when the suspended chain is skipped, even after reload",
    (operation) => {
      const initial = ready(),
        baseline = initial.conditions[0];
      let s = reducer(initial, {
        type: "INTERRUPT",
        event: {
          ...event(),
          operation: "replace",
          targetConditionId: baseline.id,
        },
      });
      const rootId = s.stack[0].conditionId!;
      s = reducer(s, { type: "TICK", delta: 7.25 });
      s = reducer(s, {
        type: "INTERRUPT",
        event: { ...event("archive", 2), operation, targetConditionId: rootId },
      });
      const replyId = s.stack[1].conditionId!;
      s = reducer(s, { type: "END_INTERRUPTION" });
      expect(s.stack[0].remaining).toBe(52.75);
      expect(s.conditions.find((c) => c.id === replyId)?.status).toBe("active");
      expect(s.stack[0].completedReplies?.[0].conditionId).toBe(replyId);
      s = restoreSession(JSON.parse(JSON.stringify(s)))!;
      expect(s.paused).toBe(true);
      const exactBase = s.remaining;
      s = reducer(s, { type: "CANCEL_ALL_INTERRUPTION" });
      expect(s.conditions.find((c) => c.id === baseline.id)).toEqual(baseline);
      for (const id of [rootId, replyId])
        expect(s.conditions.find((c) => c.id === id)?.status).toBe("cancelled");
      expect(s.stack).toEqual([]);
      expect(s.remaining).toBe(exactBase);
      expect(restoreSession(s)).toEqual(s);
    },
  );
  it("normal completion preserves a cancellation until NEXT restores the house rule and records history", () => {
    const initial = ready(),
      baseline = initial.conditions[0];
    let s = reducer(initial, {
      type: "INTERRUPT",
      event: {
        ...event(),
        operation: "cancel",
        targetConditionId: baseline.id,
      },
    });
    s = reducer(s, { type: "TICK", delta: 600 });
    expect(s.remaining).toBe(90);
    expect(s.conditions.find((c) => c.id === baseline.id)?.status).toBe(
      "cancelled",
    );
    s = restoreSession(s)!;
    const next = reducer(s, {
      type: "NEXT",
      stage: { ...stage, id: "another" },
    });
    expect(next.conditions.find((c) => c.id === baseline.id)).toEqual(baseline);
    expect(
      next.conditions.find((c) => c.id === `history-${baseline.id}-0`),
    ).toMatchObject({
      scope: "stage",
      status: "cancelled",
      changedBy: "chance",
    });
    expect(next.paused).toBe(true);
  });
  it("a cancelling reply restores every field of the original condition and does not consume parent or base time", () => {
    const initial = ready(),
      baseline = initial.conditions[0];
    let s = reducer(initial, {
      type: "INTERRUPT",
      event: {
        ...event(),
        operation: "replace",
        targetConditionId: baseline.id,
      },
    });
    const rootId = s.stack[0].conditionId!;
    s = reducer(s, { type: "TICK", delta: 11.125 });
    s = reducer(s, {
      type: "INTERRUPT",
      event: {
        ...event("archive", 2, true),
        operation: "replace",
        targetConditionId: rootId,
      },
    });
    const replyId = s.stack[1].conditionId!;
    s = reducer(s, { type: "PAUSE" });
    expect(reducer(s, { type: "TICK", delta: 999 })).toBe(s);
    s = reducer(s, { type: "RESUME" });
    s = reducer(s, { type: "TICK", delta: 999 });
    expect(s.remaining).toBe(90);
    expect(s.conditions.find((c) => c.id === baseline.id)).toEqual(baseline);
    expect(s.conditions.find((c) => c.id === rootId)?.status).toBe("cancelled");
    expect(s.conditions.find((c) => c.id === replyId)?.status).toBe(
      "cancelled",
    );
    expect(s.elapsed).toBe(90 + 11.125 + 60);
  });
  it("ignores repeated NEXT dispatches to the same destination and cannot mutate a finished nested session", () => {
    const nextAction = {
      type: "NEXT" as const,
      stage: { ...stage, id: "next-stage" },
    };
    const next = reducer(create(), nextAction);
    expect(next.stageIndex).toBe(1);
    expect(reducer(next, nextAction)).toBe(next);
    let s = reducer(ready(), { type: "INTERRUPT", event: event() });
    s = reducer(s, {
      type: "INTERRUPT",
      event: { ...event("archive", 2), operation: "add" },
    });
    const done = reducer(s, { type: "FINISH" });
    expect(done.finished).toBe(true);
    expect(done.paused).toBe(true);
    expect(done.stack).toEqual([]);
    expect(done.conditions.every((c) => c.status !== "active")).toBe(true);
    expect(restoreSession(done)).toEqual(done);
    for (const action of [
      nextAction,
      { type: "TICK", delta: 99 } as const,
      { type: "RESUME" } as const,
      { type: "END_INTERRUPTION" } as const,
      { type: "CANCEL_ALL_INTERRUPTION" } as const,
    ])
      expect(reducer(done, action)).toBe(done);
  });
  it("rejects malformed interruption content before it can poison saved state", () => {
    const s = ready();
    for (const bad of [
      { ...event(), id: 4 },
      { ...event(), title: null },
      { ...event(), text: {} },
      { ...event(), operation: "unknown" },
      { ...event(), cancelsParent: "yes" },
      { ...event(), targetConditionId: {} },
    ])
      expect(
        reducer(s, { type: "INTERRUPT", event: bad as Interruption }),
      ).toBe(s);
    const accepted = reducer(s, {
      type: "INTERRUPT",
      event: {
        ...event(),
        conditionId: "forged",
        conditionsBefore: [{ ...s.conditions[0], status: "cancelled" }],
        completedReplies: [event("forged")],
      },
    });
    expect(accepted.stack[0].conditionId).not.toBe("forged");
    expect(accepted.stack[0].conditionsBefore).toEqual([]);
    expect(accepted.stack[0].completedReplies).toEqual([]);
    expect(restoreSession(accepted)).not.toBeNull();
  });
  it("rejects impossible and corrupt restored stacks and identifiers", () => {
    const s = reducer(ready(), { type: "INTERRUPT", event: event() });
    const nested = reducer(s, {
      type: "INTERRUPT",
      event: event("archive", 2),
    });
    for (const bad of [
      { ...s, finished: true },
      { ...s, stageKind: "secret" },
      { ...s, remaining: 0 },
      { ...s, interruptionChain: 0 },
      { ...s, totalInterruptions: 0 },
      { ...s, stack: [{ ...s.stack[0], conditionId: {} }] },
      { ...s, stack: [{ ...s.stack[0], targetConditionId: 1 }] },
      {
        ...nested,
        stack: [
          nested.stack[0],
          { ...nested.stack[1], id: nested.stack[0].id },
        ],
      },
      {
        ...nested,
        stack: [nested.stack[0], { ...nested.stack[1], priority: 0 }],
      },
      { ...s, conditions: [s.conditions[0], s.conditions[0]] },
      { ...s, log: [{ id: 1, type: "secret", text: "bad" }] },
      {
        ...s,
        log: [
          { id: 1, type: "stage", text: "a" },
          { id: 1, type: "stage", text: "b" },
        ],
      },
      { ...s, currentLotTitle: {} },
      {
        ...s,
        stack: [
          {
            ...s.stack[0],
            completedReplies: [
              { ...event("archive", 2), completedReplies: [event("deep", 3)] },
            ],
          },
        ],
      },
    ])
      expect(restoreSession(bad)).toBeNull();
  });
  it.each(["universes", "cult", "secrets"] as const)(
    "round-trips every authored stage and decision of %s with pauses and nonnegative clocks",
    (game) => {
      let stages = buildStages(game, 14, 2, {}, "noir");
      let s = initialSession(game, "noir", 14, 2, stages[0]);
      const visited = new Set<string>();
      for (let index = 0; index < 30 && !s.finished; index++) {
        const current = stages[s.stageIndex];
        expect(current.id).toBe(s.stageId);
        expect(visited.has(current.id)).toBe(false);
        visited.add(current.id);
        s = reducer(s, { type: "TICK", delta: 7.125 });
        s = reducer(s, { type: "PAUSE" });
        expect(reducer(s, { type: "TICK", delta: 999 })).toBe(s);
        s = restoreSession(JSON.parse(JSON.stringify(s)))!;
        s = reducer(s, { type: "RESUME" });
        if (current.choices?.length)
          s = reducer(s, {
            type: "CHOOSE",
            stageId: current.id,
            choiceId: current.choices[index % current.choices.length].id,
          });
        s = reducer(s, { type: "TICK", delta: 999 });
        expect(s.remaining).toBe(0);
        expect(canInterrupt(s)).toBe(false);
        stages = buildStages(game, 14, 2, s.decisions, "noir");
        s =
          s.stageIndex + 1 < stages.length
            ? reducer(s, { type: "NEXT", stage: stages[s.stageIndex + 1] })
            : reducer(s, { type: "FINISH" });
        expect(restoreSession(s)).not.toBeNull();
      }
      expect(s.finished).toBe(true);
      expect(visited.size).toBe(stages.length);
      expect(s.narrator).toBe("noir");
      expect(s.elapsed).toBeGreaterThan(0);
    },
  );
});

describe("auction integration and recovery", () => {
  const stages = buildStages("auction", 8, 0);
  const start = () =>
    reducer(
      reducer(initialSession("auction", "noise", 8, 0, stages[0]), {
        type: "NEXT",
        stage: stages[1],
      }),
      { type: "AUCTION", action: { type: "OPEN" } },
    );
  const act = (
    s: Session,
    type:
      | "BID"
      | "PASS"
      | "STORY_DONE"
      | "BONUS_DONE"
      | "EVENT_CONTINUE"
      | "EVENT_PASS",
  ) => reducer(s, { type: "AUCTION", action: { type } });
  it("uses each actual lot dealer, pays the bank once, and carries wallets to the next lot", () => {
    let s = start();
    expect(s.narrator).toBe(stages[1].lot!.narrator);
    const winner = s.auction!.turn;
    s = act(act(s, "BID"), "PASS");
    expect(s.auction?.phase).toBe("story");
    expect(s.balances[winner]).toBe(99);
    expect(s.balances[1 - winner]).toBe(100);
    expect(s.auctionHistory[0].respondent).toBe(1 - winner);
    expect(act(s, "PASS")).toBe(s);
    const next = reducer(s, { type: "NEXT", stage: stages[2] });
    expect(next.narrator).toBe(stages[2].lot!.narrator);
    expect(next.balances).toEqual(s.balances);
    expect(next.auction?.balances).toEqual(s.balances);
    expect(next.auction?.lotIndex).toBe(1);
  });
  it("pauses a turn, blocks clicks while paused, then times out exactly once", () => {
    let s = start();
    s = reducer(s, { type: "TICK", delta: 6 });
    s = reducer(s, { type: "PAUSE" });
    const before = s;
    expect(act(s, "BID")).toBe(before);
    expect(reducer(s, { type: "TICK", delta: 40 })).toBe(before);
    s = reducer(s, { type: "RESUME" });
    s = reducer(s, { type: "TICK", delta: 100 });
    expect(s.auction?.turnRemaining).toBe(30);
    expect(s.auction?.log.filter((l) => l.type === "timeout")).toHaveLength(1);
  });
  it("restores paid rounds without charging again and rejects mismatched nested money", () => {
    const s = act(act(start(), "BID"), "PASS");
    expect(restoreSession(JSON.parse(JSON.stringify(s)))).toEqual({
      ...s,
      paused: true,
    });
    expect(
      restoreSession({ ...s, auction: { ...s.auction, balances: [0, 0] } }),
    ).toBeNull();
    expect(
      restoreSession({ ...s, auction: { ...s.auction, phase: "unknown" } }),
    ).toBeNull();
    const { auction: _auction, ...old } = s;
    expect(restoreSession(old)).toBeNull();
  });
  it("persists bonus questions, one reward and a complete event journal", () => {
    const v = Array.from({ length: 1000 }, (_, v) => v).find(
      (v) =>
        plannedAuctionEvent(v, 0, "noise", [99, 100], null)?.type === "bonus",
    )!;
    const script = buildStages("auction", v, 0);
    let s = reducer(
      reducer(initialSession("auction", "noise", v, 0, script[0]), {
        type: "NEXT",
        stage: script[1],
      }),
      { type: "AUCTION", action: { type: "OPEN" } },
    );
    s = act(act(act(s, "BID"), "PASS"), "STORY_DONE");
    expect(s.auction?.event?.type).toBe("bonus");
    const target = s.auction!.event!.target,
      question = s.auctionHistory.at(-1)?.bonusQuestion;
    expect(question).toBeTruthy();
    s = reducer(restoreSession(s)!, { type: "RESUME" });
    s = act(s, "BONUS_DONE");
    const amount = s.balances[target];
    s = reducer(s, {
      type: "AUCTION",
      action: { type: "REWARD", approved: true },
    });
    expect(s.balances[target]).toBe(amount + 15);
    expect(
      reducer(s, {
        type: "AUCTION",
        action: { type: "REWARD", approved: true },
      }),
    ).toBe(s);
    expect(s.auctionHistory.at(-1)?.bonusQuestion).toBe(question);
  });
});
describe("choices and persistence", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("only accepts available decisions once", () => {
    const choice: Stage = {
      ...stage,
      choices: [{ id: "yes", label: "Да", effect: "Выбрано" }],
    };
    const s = initialSession("cult", "archivist", 0, 0, choice);
    expect(
      reducer(s, { type: "CHOOSE", stageId: stage.id, choiceId: "bad" }),
    ).toBe(s);
    const chosen = reducer(s, {
      type: "CHOOSE",
      stageId: stage.id,
      choiceId: "yes",
    });
    expect(
      reducer(chosen, { type: "CHOOSE", stageId: stage.id, choiceId: "yes" }),
    ).toBe(chosen);
  });
  it("saves safely and rejects broken JSON", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => values.set(k, v),
      removeItem: (k: string) => values.delete(k),
    });
    const s = create();
    saveSession(s);
    expect(readSaved()).toEqual({ ...s, paused: true });
    clearSession();
    expect(readSaved()).toBeNull();
    values.set("third-wheel-session-v1", "{");
    expect(readSaved()).toBeNull();
  });
  it("continues if browser denies localStorage", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw Error();
      },
      setItem: () => {
        throw Error();
      },
      removeItem: () => {
        throw Error();
      },
    });
    expect(readSaved()).toBeNull();
    expect(() => saveSession(create())).not.toThrow();
    expect(() => clearSession()).not.toThrow();
  });
});
