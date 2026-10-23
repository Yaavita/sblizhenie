import { describe, expect, it } from "vitest";
import { buildStages, buildLegacyDrawingStages } from "../src/content/games";
import {
  drawingPlan,
  drawingScenes,
  drawingTheme,
} from "../src/content/drawing";
import type { DrawingConfig } from "../src/content/drawing";
import type { NarratorId } from "../src/content/types";
import {
  drawingFeed,
  drawingReducer,
  drawingText,
  initialDrawing,
  isDrawingState,
} from "../src/engine/drawing";
import {
  canInterrupt,
  initialSession,
  reducer,
  restoreSession,
} from "../src/engine/engine";

const hosts: NarratorId[] = ["momo", "noir", "archivist", "noise", "chance"];
const config: DrawingConfig = { host: "momo", variant: 0, intimacy: 0 };
const create = (c = config) =>
  initialSession(
    "universes",
    c.host,
    c.variant,
    c.intimacy,
    buildStages("universes", c.variant, c.intimacy, {}, c.host)[0],
  );

describe("shared drawings with independent object choices", () => {
  it("offers twenty empty scene references with different subjects for all five hosts", () => {
    expect(
      new Set(
        hosts.flatMap((h) => [0, 1, 2, 3].map((v) => drawingTheme(h, v).title)),
      ).size,
    ).toBe(20);
    expect(new Set(hosts.map((h) => drawingTheme(h, 0).subject)).size).toBe(5);
    for (const host of hosts) {
      expect(
        new Set([0, 1, 2, 3].map((v) => drawingTheme(host, v).first)).size,
      ).toBe(4);
      for (const variant of [0, 1, 2, 3])
        expect(drawingTheme(host, variant).outline).toBeTruthy();
    }
  });
  it("gives both players independent tasks, every character one appearance and exactly 58 minutes", () => {
    for (const host of hosts)
      for (let variant = 0; variant < 48; variant++) {
        const c = { host, variant, intimacy: variant % 3 },
          plan = drawingPlan(c);
        const stages = buildStages("universes", variant, c.intimacy, {}, host);
        const drawing = plan.filter((cue) => cue.kind !== "gallery");
        expect(stages).toHaveLength(6);
        expect(drawing).toHaveLength(5);
        expect(drawing[0].kind).toBe("main");
        expect(drawing[0].seconds).toBe(480);
        expect(
          drawing
            .slice(1)
            .every((cue) => cue.kind === "addition" && cue.seconds === 660),
        ).toBe(true);
        expect(new Set(drawing.map((cue) => cue.narrator))).toEqual(
          new Set(hosts),
        );
        expect(plan.reduce((sum, cue) => sum + cue.seconds, 0)).toBe(58 * 60);
        expect(stages.reduce((sum, stage) => sum + stage.seconds, 0)).toBe(
          58 * 60,
        );
        expect(new Set(plan.map((cue) => cue.id)).size).toBe(plan.length);
        for (const cue of drawing) {
          expect(cue.assignments).toHaveLength(2);
          expect(cue.assignments![0]).not.toBe(cue.assignments![1]);
          expect(cue.assignments!.every((task) => task.length > 30)).toBe(true);
          expect(stages[cue.chapter].id).toBe(cue.id);
        }
        expect(drawingScenes(host, variant)).toEqual(
          drawingScenes(host, variant),
        );
        expect(
          drawingScenes(host, variant).every(
            (visit) => visit.narrator !== host,
          ),
        ).toBe(true);
      }
  });
  it("asks each guesser to find the objects from the other player's exact original assignments", () => {
    for (const host of hosts)
      for (const variant of [0, 1, 2, 3]) {
        const plan = drawingPlan({ host, variant, intimacy: 0 });
        const drawing = plan.filter((cue) => cue.assignments);
        const gallery = plan.filter((cue) => cue.kind === "gallery");
        expect(gallery.map((cue) => cue.player)).toEqual([0, 1]);
        for (const [player, cue] of gallery.entries()) {
          expect(cue.guesses).toEqual(
            drawing.map((entry) => ({
              narrator: entry.narrator,
              question: entry.assignments![1 - player],
            })),
          );
          expect(cue.text).toContain("молча");
          expect(cue.text).toContain("Сначала догадки");
        }
      }
  });
});

describe("automatic drawing progression and persistence", () => {
  it("can finish every part early without losing tasks or breaking the saved result", () => {
    let s = reducer(create(), { type: "DRAWING", action: { type: "START" } });
    const plan = drawingPlan(config);
    for (let cue = 0; cue < plan.length; cue++) {
      s = reducer(s, { type: "TICK", delta: 5 });
      const advance = {
        type: "DRAWING" as const,
        action: { type: "ADVANCE" as const, cue },
      };
      const paused = reducer(s, { type: "PAUSE" });
      expect(reducer(paused, advance)).toBe(paused);
      s = reducer(s, advance);
      expect(reducer(s, advance)).toBe(s);
      expect(restoreSession(JSON.parse(JSON.stringify(s)))).not.toBeNull();
      if (cue < plan.length - 1) {
        expect(s.drawing?.cue).toBe(cue + 1);
        expect(s.remaining).toBe(plan[cue + 1].seconds);
      }
    }
    expect(s.drawing?.phase).toBe("complete");
    expect(drawingFeed(s.drawing!, plan)).toHaveLength(plan.length);
  });

  it("ignores an advance intended for a cue that already ended automatically", () => {
    const initial = create();
    expect(
      reducer(initial, {
        type: "DRAWING",
        action: { type: "ADVANCE", cue: 0 },
      }),
    ).toBe(initial);
    let s = reducer(initial, { type: "DRAWING", action: { type: "START" } });
    s = reducer(s, { type: "TICK", delta: 480 });
    expect(s.drawing?.cue).toBe(1);
    expect(
      reducer(s, { type: "DRAWING", action: { type: "ADVANCE", cue: 0 } }),
    ).toBe(s);
  });

  it("completes the entire evening without a next or confirmation action, preserving pauses at every cue", () => {
    let s = create();
    expect(s.drawing?.phase).toBe("intro");
    expect(reducer(s, { type: "TICK", delta: 900 })).toBe(s);
    s = reducer(s, { type: "DRAWING", action: { type: "START" } });
    const plan = drawingPlan(config);
    for (let cue = 0; cue < plan.length; cue++) {
      expect(s.drawing?.cue).toBe(cue);
      expect(s.remaining).toBe(plan[cue].seconds);
      expect(canInterrupt({ ...s, cooldown: 0 })).toBe(false);
      s = reducer(s, { type: "PAUSE" });
      expect(reducer(s, { type: "TICK", delta: 9999 })).toBe(s);
      s = restoreSession(JSON.parse(JSON.stringify(s)))!;
      expect(s).not.toBeNull();
      s = reducer(s, { type: "RESUME" });
      s = reducer(s, { type: "TICK", delta: plan[cue].seconds });
    }
    expect(s.drawing?.phase).toBe("complete");
    expect(s.elapsed).toBe(58 * 60);
    expect(s.remaining).toBe(0);
    expect(s.finished).toBe(false); // Keep the finished gallery resumable.
    expect(restoreSession(JSON.parse(JSON.stringify(s)))?.drawing).toEqual(
      s.drawing,
    );
    expect(reducer(s, { type: "TICK", delta: 500 })).toBe(s);
  });

  it("never uses tick overflow to eat into a freshly appeared task", () => {
    const plan = drawingPlan(config);
    let state = drawingReducer(initialDrawing(), { type: "START" }, config);
    state = drawingReducer(state, { type: "TICK", delta: 10000 }, config);
    expect(state.cue).toBe(1);
    expect(state.elapsed).toBe(0);
    expect(plan[state.cue].kind).toBe("addition");
    state = drawingReducer(state, { type: "TICK", delta: 10 }, config);
    expect(state.cue).toBe(1);
    expect(drawingFeed(state, plan)).toHaveLength(2);
    expect(state.elapsed).toBe(10);
    for (const delta of [NaN, Infinity, -1, 0])
      expect(drawingReducer(state, { type: "TICK", delta }, config)).toBe(
        state,
      );
  });

  it("keeps every personal task readable exactly once after reload and exports it with its owner", () => {
    const plan = drawingPlan(config);
    const state = {
      ...initialDrawing(),
      phase: "running" as const,
      cue: 4,
      elapsed: 30,
    };
    const feed = drawingFeed(state, plan);
    expect(feed).toHaveLength(5);
    expect(drawingFeed(JSON.parse(JSON.stringify(state)), plan)).toEqual(feed);
    for (const entry of feed)
      for (const [player, task] of entry.assignments!.entries()) {
        expect(drawingText(state, config)).toContain(
          `Игрок ${player + 1}: ${task}`,
        );
      }
  });

  it("allows host and theme selection only before drawing starts", () => {
    let s = create();
    s = reducer(s, {
      type: "DRAWING_CONFIG",
      narrator: "archivist",
      variant: 17,
    });
    expect(s.narrator).toBe("archivist");
    expect(s.variant).toBe(17);
    expect(restoreSession(s)).not.toBeNull();
    s = reducer(s, { type: "DRAWING", action: { type: "START" } });
    expect(
      reducer(s, { type: "DRAWING_CONFIG", narrator: "chance", variant: 4 }),
    ).toBe(s);
    expect(
      reducer(s, { type: "NEXT", stage: buildStages("universes")[1] }),
    ).toBe(s);
  });

  it("keeps the final title and note editable after reopening the saved result", () => {
    let s = reducer(create(), { type: "DRAWING", action: { type: "START" } });
    for (const cue of drawingPlan(config))
      s = reducer(s, { type: "TICK", delta: cue.seconds });
    s = restoreSession(s)!;
    expect(s.paused).toBe(true);
    s = reducer(s, {
      type: "DRAWING",
      action: { type: "TITLE", text: "Наши миры" },
    });
    s = reducer(s, {
      type: "DRAWING",
      action: { type: "NOTE", text: "Верёвки стали мостом" },
    });
    expect(restoreSession(s)?.drawing?.title).toBe("Наши миры");
    expect(drawingText(s.drawing!, config)).toContain("Верёвки стали мостом");
  });

  it("rejects inconsistent saves without affecting legacy drawings and other games", () => {
    const s = create();
    expect(restoreSession(s)).not.toBeNull();
    for (const patch of [
      { game: "cult" },
      { stageKind: "draw" },
      { stageIndex: 1 },
      { stageId: "d-guest" },
      { remaining: s.remaining + 1 },
      { elapsed: 300 },
      { drawing: undefined },
      { drawing: { ...s.drawing, cue: -1 } },
      { drawing: { ...s.drawing, version: 1 } },
      { drawing: { ...s.drawing, elapsed: 10 } },
      { drawing: { ...s.drawing, phase: "complete" } },
    ])
      expect(restoreSession({ ...s, ...patch })).toBeNull();
    const legacy = initialSession(
      "universes",
      "noir",
      4,
      1,
      buildLegacyDrawingStages(4, 1, "noir")[0],
    );
    expect(legacy.drawing).toBeUndefined();
    expect(restoreSession(legacy)).not.toBeNull();
    for (const value of [
      null,
      {},
      { ...initialDrawing(), elapsed: Infinity },
      { ...initialDrawing(), phase: "running", cue: 999 },
    ])
      expect(isDrawingState(value, config)).toBe(false);
  });
});
