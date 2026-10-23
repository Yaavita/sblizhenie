import { describe, expect, it } from "vitest";
import { buildStages, buildLegacyDrawingStages } from "../src/content/games";
import {
  drawingPlan,
  drawingScenes,
  drawingTheme,
  drawingScenePool,
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

describe("drawing timetable and authored disputes", () => {
  it("offers twenty starting themes and different subjects for all five hosts", () => {
    expect(
      new Set(
        hosts.flatMap((h) => [0, 1, 2, 3].map((v) => drawingTheme(h, v).title)),
      ).size,
    ).toBe(20);
    expect(new Set(hosts.map((h) => drawingTheme(h, 0).subject)).size).toBe(5);
    for (const host of hosts) {
      const starts = [0, 1, 2, 3].map(
        (v) => buildStages("universes", v, 0, {}, host)[0].body,
      );
      expect(new Set(starts).size).toBe(4);
    }
  });

  it("keeps three nine-minute core chapters, balanced turns, and a 58-minute total in every variant", () => {
    for (const host of hosts)
      for (let variant = 0; variant < 48; variant++) {
        const plan = drawingPlan({ host, variant, intimacy: variant % 3 });
        const stages = buildStages("universes", variant, variant % 3, {}, host);
        expect(stages).toHaveLength(4);
        expect(plan.reduce((sum, c) => sum + c.seconds, 0)).toBe(58 * 60);
        expect(stages.reduce((sum, s) => sum + s.seconds, 0)).toBe(58 * 60);
        expect(new Set(plan.map((c) => c.id)).size).toBe(plan.length);
        const drawingTime = [0, 0];
        for (let chapter = 0; chapter < 3; chapter++) {
          const cues = plan.filter((c) => c.chapter === chapter);
          expect(
            cues
              .filter((c) => c.kind === "main")
              .map((c) => c.artist)
              .sort(),
          ).toEqual([0, 1]);
          expect(
            cues
              .filter((c) => c.kind === "main" || c.kind === "quiet")
              .reduce((s, c) => s + c.seconds, 0),
          ).toBe(540);
          expect(cues.reduce((s, c) => s + c.seconds, 0)).toBe(
            stages[chapter].seconds,
          );
          for (const cue of cues) {
            expect(cue.story!.length).toBeGreaterThan(50);
            drawingTime[cue.artist!] += cue.seconds;
          }
        }
        expect(drawingTime).toEqual([25.5 * 60, 25.5 * 60]);
        expect(
          plan
            .filter((c) => c.kind === "gallery")
            .reduce((s, c) => s + c.seconds, 0),
        ).toBe(420);
      }
  });

  it("uses paired amendments with three full minutes to draw before a cancellation and ninety seconds before a retort", () => {
    const entrances = new Set<number>();
    for (const host of hosts)
      for (let variant = 0; variant < 24; variant++) {
        const plan = drawingPlan({ host, variant, intimacy: 0 });
        for (const [i, cue] of plan.entries()) {
          if (cue.kind !== "addition") continue;
          const before = plan[i - 1],
            amendment = plan[i + 1],
            quiet = plan[i + 2];
          entrances.add(before.seconds);
          expect(before.kind).toBe("main");
          expect(before.seconds).toBeGreaterThanOrEqual(75);
          expect(cue.seconds).toBe(180);
          expect(amendment.supersedes).toBe(cue.id);
          expect(amendment.artist).toBe(cue.artist);
          expect(amendment.chapter).toBe(cue.chapter);
          expect(amendment.narrator).not.toBe(cue.narrator);
          expect(amendment.seconds).toBe(180);
          expect(amendment.retort?.after).toBe(90);
          expect(quiet.kind).toBe("quiet");
          expect(quiet.seconds).toBeGreaterThanOrEqual(60);
        }
      }
    expect(entrances.size).toBe(3);
  });

  it("varies all twenty authored disputes without repeating a visitor or choosing unrelated replies", () => {
    const seen = new Set<string>();
    let gravity = 0;
    for (const host of hosts)
      for (let variant = 0; variant < 80; variant++) {
        const selected = drawingScenes(host, variant).slice(0, 4);
        expect(new Set(selected.map((s) => s.id)).size).toBe(4);
        expect(new Set(selected.map((s) => s.narrator)).size).toBe(4);
        expect(selected.every((s) => s.narrator !== host)).toBe(true);
        expect(drawingScenes(host, variant)).toEqual(
          drawingScenes(host, variant),
        );
        for (const s of selected) {
          seen.add(s.id);
          if (s.id === "gravity") gravity++;
          expect(drawingScenePool.find((entry) => entry.id === s.id)).toEqual(
            s,
          );
        }
      }
    expect(seen.size).toBe(20);
    expect(gravity).toBeGreaterThan(0);
    expect(gravity).toBeLessThan(150);
  });

  it("shows each artist's own completed drawing only in the guessing finale, before its author explains", () => {
    for (const host of hosts) {
      const plan = drawingPlan({ ...config, host });
      expect(
        plan.filter((c) => c.chapter < 3).every((c) => c.player === undefined),
      ).toBe(true);
      const gallery = plan.filter((c) => c.kind === "gallery");
      expect(gallery.map((c) => c.player)).toEqual([0, 1, undefined]);
      expect(gallery[0].text).toContain("молча");
      expect(gallery[0].text).toContain("Сначала все три догадки");
      expect(gallery[1].text).toContain("Сначала догадки, потом");
    }
  });
});

describe("automatic drawing progression and persistence", () => {
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
    expect(drawingFeed(state, plan).some((e) => e.changed)).toBe(false);
    for (const delta of [NaN, Infinity, -1, 0])
      expect(drawingReducer(state, { type: "TICK", delta }, config)).toBe(
        state,
      );
  });

  it("retains the original instruction and amendment and reconstructs delayed replies exactly once after reload", () => {
    const plan = drawingPlan(config),
      cue = plan.findIndex((c) => c.kind === "revision");
    const state = {
      ...initialDrawing(),
      phase: "running" as const,
      cue,
      elapsed: 89,
    };
    let feed = drawingFeed(state, plan);
    expect(feed.at(-1)?.comment).toBeUndefined();
    expect(feed.find((e) => e.id === plan[cue].supersedes)?.changed).toBe(true);
    expect(feed.find((e) => e.id === plan[cue].supersedes)?.text).toBe(
      plan[cue - 1].text,
    );
    feed = drawingFeed({ ...state, elapsed: 90 }, plan);
    expect(feed.at(-1)?.comment).toBe(true);
    expect(feed.at(-1)?.text).toBe(plan[cue].retort!.text);
    const restored = JSON.parse(JSON.stringify({ ...state, elapsed: 91 }));
    expect(drawingFeed(restored, plan)).toEqual(feed);
    expect(drawingText(restored, config)).toContain(plan[cue - 1].text);
    expect(drawingText(restored, config)).toContain(plan[cue].text);
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
