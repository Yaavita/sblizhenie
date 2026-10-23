import { describe, expect, it } from "vitest";
import { games, buildStages } from "../src/content/games";
import { museumExamples } from "../src/content/museum";
import {
  initialSession,
  reducer,
  restoreSession,
  canInterrupt,
} from "../src/engine/engine";
import {
  initialMuseum,
  museumReducer,
  isMuseumState,
  museumOwner,
  museumText,
} from "../src/engine/museum";
import type { MuseumAction, MuseumState } from "../src/engine/museum";

function prepared() {
  let s = initialMuseum();
  const act = (action: MuseumAction) => {
    s = museumReducer(s, action);
  };
  act({ type: "START" });
  for (const player of [0, 1]) {
    act({ type: "READY" });
    for (let slot = 0; slot < 3; slot++)
      act({
        type: "WRITE",
        slot,
        text: `Игрок ${player}: впечатление ${slot}`,
      });
    act({ type: "SEAL" });
  }
  return s;
}
function complete(s: MuseumState) {
  const slot = s.captions[museumOwner(s)].findIndex(
    (_, index) =>
      !s.exhibits.some((e) => e.owner === museumOwner(s) && e.slot === index),
  );
  for (const action of [
    { type: "PICK", slot },
    { type: "STORY_DONE" },
    { type: "LABEL", text: `Новая подпись ${s.exhibits.length + 1}` },
    { type: "PROPOSE" },
    { type: "APPROVE" },
  ] as MuseumAction[]) {
    s = museumReducer(s, action);
    expect(isMuseumState(s)).toBe(true);
  }
  return s;
}
describe("museum of impressions", () => {
  it("registers a standalone game with level-specific suggestions and no external narrator constraints", () => {
    expect(games.find((g) => g.id === "museum")?.tags).toContain("talk");
    for (const level of [0, 1, 2]) {
      const stages = buildStages("museum", 7, level, {}, "chance");
      expect(stages).toHaveLength(1);
      expect(stages[0].kind).toBe("museum");
      expect(museumExamples(level).length).toBeGreaterThanOrEqual(6);
    }
    expect(museumExamples(0)).not.toEqual(museumExamples(2));
  });
  it("requires private preparation of three distinct nonempty captions from each player", () => {
    let s = museumReducer(initialMuseum(), { type: "START" });
    expect(
      museumReducer(s, { type: "WRITE", slot: 0, text: "Не тот экран" }),
    ).toBe(s);
    s = museumReducer(s, { type: "READY" });
    expect(museumReducer(s, { type: "SEAL" })).toBe(s);
    for (let slot = 0; slot < 3; slot++)
      s = museumReducer(s, { type: "WRITE", slot, text: "Дубликат" });
    expect(museumReducer(s, { type: "SEAL" })).toBe(s);
    for (let slot = 0; slot < 3; slot++)
      s = museumReducer(s, { type: "WRITE", slot, text: `Первое ${slot}` });
    s = museumReducer(s, { type: "SEAL" });
    expect(s.phase).toBe("handoff");
    expect(s.preparationPlayer).toBe(1);
    expect(isMuseumState(s)).toBe(true);
    expect(prepared().phase).toBe("pick");
  });
  it("alternates six stories and requires author approval, allowing a caption to be revised first", () => {
    let s = prepared();
    s = museumReducer(s, { type: "PICK", slot: 2 });
    expect(museumReducer(s, { type: "APPROVE" })).toBe(s);
    s = museumReducer(s, { type: "STORY_DONE" });
    expect(museumReducer(s, { type: "PROPOSE" })).toBe(s);
    s = museumReducer(s, { type: "LABEL", text: "Предварительная подпись" });
    s = museumReducer(s, { type: "PROPOSE" });
    s = museumReducer(s, { type: "REVISE" });
    s = museumReducer(s, { type: "LABEL", text: "Подтверждённая подпись" });
    s = museumReducer(s, { type: "PROPOSE" });
    s = museumReducer(s, { type: "APPROVE" });
    expect(s.exhibits[0].revised).toBe("Подтверждённая подпись");
    expect(museumOwner(s)).toBe(1);
    for (let i = 1; i < 6; i++) s = complete(s);
    expect(s.phase).toBe("gallery");
    expect(s.exhibits.map((e) => e.owner)).toEqual([0, 1, 0, 1, 0, 1]);
    expect(new Set(s.exhibits.map((e) => `${e.owner}:${e.slot}`)).size).toBe(6);
    expect(museumReducer(s, { type: "PICK", slot: 0 })).toBe(s);
    const exported = museumText(s);
    for (const e of s.exhibits) {
      expect(exported).toContain(e.original);
      expect(exported).toContain(e.revised);
    }
  });
  it("does not exhibit the same slot twice", () => {
    let s = complete(complete(prepared()));
    expect(museumOwner(s)).toBe(0);
    expect(museumReducer(s, { type: "PICK", slot: s.exhibits[0].slot })).toBe(
      s,
    );
  });
  it("restores each stage paused and rejects corrupt or inconsistent saved exhibits", () => {
    const initial = initialSession(
      "museum",
      "archivist",
      1,
      0,
      buildStages("museum")[0],
    );
    const states = [initialMuseum(), prepared()];
    let s = prepared();
    for (let i = 0; i < 6; i++) {
      s = complete(s);
      states.push(s);
    }
    for (const museum of states) {
      const restored = restoreSession(
        JSON.parse(JSON.stringify({ ...initial, museum })),
      );
      expect(restored?.museum).toEqual(museum);
      expect(restored?.paused).toBe(true);
      expect(canInterrupt({ ...initial, cooldown: 0 })).toBe(false);
    }
    expect(restoreSession({ ...initial, museum: undefined })).toBeNull();
    expect(
      restoreSession({ ...initial, museum: { ...s, phase: "pick" } }),
    ).toBeNull();
    expect(
      restoreSession({
        ...initial,
        museum: { ...s, exhibits: [s.exhibits[0], s.exhibits[0]] },
      }),
    ).toBeNull();
    expect(
      restoreSession({
        ...initial,
        museum: {
          ...s,
          exhibits: s.exhibits.map((e) => ({ ...e, original: "подменено" })),
        },
      }),
    ).toBeNull();
    const paused = reducer(initial, { type: "PAUSE" });
    expect(reducer(paused, { type: "MUSEUM", action: { type: "START" } })).toBe(
      paused,
    );
  });
});
