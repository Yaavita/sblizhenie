import { describe, expect, it } from "vitest";
import { buildStages } from "../src/content/games";
import { pitchRounds, syncRounds, syncOptions } from "../src/content/party";
import { initialSession, reducer, restoreSession } from "../src/engine/engine";
import {
  initialParty,
  isPartyState,
  partyReducer,
  partyScores,
  partyTurn,
} from "../src/engine/party";
import type { PartyAction, PartyState } from "../src/engine/party";

function apply(s: PartyState, actions: PartyAction[]): PartyState {
  for (const action of actions) {
    s = partyReducer(s, action);
    expect(isPartyState(s), `${s.game}/${s.phase}`).toBe(true);
  }
  return s;
}
describe("short party games", () => {
  it("deals repeatable, varied rounds without repeated questions, products or customers", () => {
    for (let variant = 0; variant < 30; variant++) {
      const sync = syncRounds(variant),
        pitch = pitchRounds(variant);
      expect(sync).toEqual(syncRounds(variant));
      expect(pitch).toEqual(pitchRounds(variant));
      expect(sync).toHaveLength(8);
      expect(pitch).toHaveLength(6);
      expect(new Set(sync.map((r) => r.question)).size).toBe(8);
      expect(new Set(pitch.map((r) => r.product)).size).toBe(6);
      expect(new Set(pitch.map((r) => r.customer)).size).toBe(6);
      for (const r of sync) expect(new Set(r.options).size).toBe(3);
      for (let round = 0; round < 8; round++) {
        const one = syncOptions(variant, round, 0),
          two = syncOptions(variant, round, 1);
        expect(new Set(one.map((o) => o.label))).toEqual(
          new Set(two.map((o) => o.label)),
        );
        expect(one.every((o, index) => o.choice !== two[index].choice)).toBe(
          true,
        );
      }
    }
    expect(syncRounds(0)).not.toEqual(syncRounds(1));
    expect(pitchRounds(0)).not.toEqual(pitchRounds(1));
  });
  it("keeps the first answer sealed until both players choose and totals eight shared rounds", () => {
    let s = initialParty("sync");
    s = apply(s, [{ type: "START" }]);
    for (let round = 0; round < 8; round++) {
      expect(s.phase).toBe("handoff");
      expect(s.player).toBe(0);
      s = apply(s, [{ type: "READY" }, { type: "SELECT", choice: 0 }]);
      expect(s.phase).toBe("handoff");
      expect(s.player).toBe(1);
      expect(s.history).toHaveLength(round);
      expect(s.choices).toEqual([0, null]);
      expect(partyReducer(s, { type: "SELECT", choice: 1 })).toBe(s);
      s = apply(s, [{ type: "READY" }]);
      expect(partyTurn(s)?.active).toBe(1);
      s = apply(s, [{ type: "SELECT", choice: round % 2 }]);
      expect(s.phase).toBe("reveal");
      expect(s.history).toHaveLength(round + 1);
      s = apply(s, [{ type: "NEXT" }]);
    }
    expect(s.phase).toBe("results");
    expect(partyScores(s)).toEqual([4, 8]);
    expect(partyReducer(s, { type: "NEXT" })).toBe(s);
  });
  it("alternates seller and buyer, preserves the objection step and scores the last sale twice for each", () => {
    let s = apply(initialParty("pitch"), [{ type: "START" }]);
    for (let round = 0; round < 6; round++) {
      expect(partyTurn(s)?.active).toBe(round % 2);
      expect(s.remaining).toBe(45);
      expect(partyReducer(s, { type: "DEAL", accepted: true })).toBe(s);
      s = apply(s, [{ type: "PITCH_DONE" }]);
      expect(partyTurn(s)?.active).toBe(1 - (round % 2));
      s = apply(s, [{ type: "OBJECTION_DONE" }]);
      expect(partyTurn(s)?.active).toBe(round % 2);
      expect(s.remaining).toBe(30);
      s = apply(s, [{ type: "RESPONSE_DONE" }]);
      expect(partyTurn(s)?.active).toBe(1 - (round % 2));
      s = apply(s, [{ type: "DEAL", accepted: true }, { type: "NEXT" }]);
    }
    expect(s.phase).toBe("results");
    expect(partyScores(s)).toEqual([4, 4]);
    expect(s.history.map((r) => r.points)).toEqual([1, 1, 1, 1, 2, 2]);
  });
  it("runs a soft clock without advancing the task, and pauses both clock and actions", () => {
    let s = apply(initialParty("pitch"), [
      { type: "START" },
      { type: "TICK", delta: 46 },
    ]);
    expect(s.phase).toBe("pitch");
    expect(s.remaining).toBe(0);
    expect(partyReducer(s, { type: "TICK", delta: NaN })).toBe(s);
    expect(partyReducer(s, { type: "TICK", delta: -2 })).toBe(s);
    const initial = initialSession(
      "pitch",
      "noise",
      3,
      0,
      buildStages("pitch")[0],
    );
    let session = reducer(initial, {
      type: "PARTY",
      action: { type: "START" },
    });
    session = reducer(session, { type: "PAUSE" });
    expect(
      reducer(session, { type: "PARTY", action: { type: "TICK", delta: 5 } }),
    ).toBe(session);
    expect(
      reducer(session, { type: "PARTY", action: { type: "PITCH_DONE" } }),
    ).toBe(session);
    const resumed = reducer(session, { type: "RESUME" });
    expect(
      reducer(resumed, { type: "PARTY", action: { type: "TICK", delta: 5 } })
        .party?.remaining,
    ).toBe(40);
    s = apply(s, [
      { type: "PITCH_DONE" },
      { type: "OBJECTION_DONE" },
      { type: "RESPONSE_DONE" },
      { type: "DEAL", accepted: false },
    ]);
    expect(s.history[0].points).toBe(0);
  });
  it("restores private turns and results while rejecting inconsistent rounds, answers and scores", () => {
    for (const game of ["sync", "pitch"] as const) {
      const base = initialSession(game, "momo", 7, 0, buildStages(game)[0]);
      let s = initialParty(game);
      const actions: PartyAction[] =
        game === "sync"
          ? [
              { type: "START" },
              { type: "READY" },
              { type: "SELECT", choice: 2 },
              { type: "READY" },
              { type: "SELECT", choice: 2 },
            ]
          : [
              { type: "START" },
              { type: "PITCH_DONE" },
              { type: "OBJECTION_DONE" },
              { type: "RESPONSE_DONE" },
              { type: "DEAL", accepted: true },
            ];
      for (const action of actions) {
        s = apply(s, [action]);
        const restored = restoreSession(
          JSON.parse(JSON.stringify({ ...base, party: s })),
        );
        expect(restored?.paused).toBe(true);
        expect(restored?.party).toEqual(s);
      }
      expect(restoreSession({ ...base, party: { ...s, round: 4 } })).toBeNull();
      expect(
        restoreSession({
          ...base,
          party: {
            ...s,
            history: s.history.map((r) => ({ ...r, points: 99 })),
          },
        }),
      ).toBeNull();
      expect(
        restoreSession({ ...base, party: { ...s, phase: "results" } }),
      ).toBeNull();
      expect(
        restoreSession({ ...base, party: { ...s, choices: [5, 2] } }),
      ).toBeNull();
      expect(restoreSession({ ...base, party: undefined })).toBeNull();
    }
  });
});
