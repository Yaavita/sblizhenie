import { describe, expect, it } from "vitest";
import {
  drawingTaskBank,
  drawingVoices,
  isDrawingTaskSet,
} from "../src/content/drawingTasks";
import { drawingBaseIds } from "../src/content/drawingTasks/types";
import {
  drawingPlan,
  drawingTaskSet,
  drawingTheme,
  legacyDrawingTaskSet,
} from "../src/content/drawing";
import type { DrawingConfig } from "../src/content/drawing";
import { buildStages } from "../src/content/games";
import { initialSession, reducer, restoreSession } from "../src/engine/engine";
import { drawingText, restoreDrawing } from "../src/engine/drawing";

const config: DrawingConfig = { host: "archivist", variant: 0, intimacy: 0 };
const create = () =>
  initialSession(
    "universes",
    config.host,
    config.variant,
    config.intimacy,
    buildStages("universes", 0, 0, {}, config.host)[0],
  );

describe("scene-specific drawing decks", () => {
  it("contains eight distinct tasks for every voice on every one of the twenty bases", () => {
    expect(Object.keys(drawingTaskBank).sort()).toEqual(
      [...drawingBaseIds].sort(),
    );
    const ids = new Set<string>();
    for (const base of drawingBaseIds) {
      expect(Object.keys(drawingTaskBank[base]).sort()).toEqual(
        [...drawingVoices].sort(),
      );
      for (const voice of drawingVoices) {
        const deck = drawingTaskBank[base][voice];
        expect(deck, `${base}/${voice}`).toHaveLength(8);
        expect(
          new Set(deck.map((task) => task.purpose)).size,
          `${base}/${voice}`,
        ).toBe(8);
        expect(new Set(deck.map((task) => task.text)).size).toBe(8);
        for (const task of deck) {
          expect(ids.has(task.id), task.id).toBe(false);
          ids.add(task.id);
          expect(
            task.id.startsWith(`${base}-${voice}-`) ||
              task.id.startsWith(`${base}/${voice}/`),
            task.id,
          ).toBe(true);
          expect(task.text.length).toBeGreaterThan(40);
          expect(task.purpose.length).toBeGreaterThan(2);
        }
      }
    }
    expect(ids.size).toBe(800);
  });

  it("chooses ten different purposes and reaches all eight cards despite the variant modulo used by the base", () => {
    for (const host of drawingVoices)
      for (let choice = 0; choice < 4; choice++) {
        const base = drawingTheme(host, choice).id;
        const seen = Object.fromEntries(
          drawingVoices.map((voice) => [voice, new Set<string>()]),
        ) as Record<typeof host, Set<string>>;
        const pairs = Object.fromEntries(
          drawingVoices.map((voice) => [voice, new Set<string>()]),
        ) as Record<typeof host, Set<string>>;
        for (let repeat = 0; repeat < 128; repeat++) {
          const c = { host, variant: choice + repeat * 4, intimacy: 0 };
          const set = drawingTaskSet(c);
          expect(isDrawingTaskSet(set)).toBe(true);
          expect(
            new Set(
              Object.values(set)
                .flat()
                .map((task) => task.purpose),
            ).size,
            `${base}/${repeat}`,
          ).toBe(10);
          for (const voice of drawingVoices) {
            expect(set[voice][0].id).not.toBe(set[voice][1].id);
            for (const task of set[voice]) {
              expect(
                drawingTaskBank[base][voice].some(
                  (original) => original.id === task.id,
                ),
              ).toBe(true);
              seen[voice].add(task.id);
            }
            pairs[voice].add(set[voice].map((task) => task.id).join("|"));
          }
        }
        for (const voice of drawingVoices) {
          expect(seen[voice].size, `${base}/${voice}`).toBe(8);
          expect(pairs[voice].size, `${base}/${voice}`).toBeGreaterThan(20);
        }
      }
  });
});

describe("frozen questions in a saved drawing", () => {
  it("keeps the exact text, gallery questions and export after the source bank changes", () => {
    let s = reducer(create(), { type: "DRAWING", action: { type: "START" } });
    const frozen = JSON.parse(JSON.stringify(s.drawing!.taskSet));
    const originalPlan = drawingPlan(config, frozen);
    const source = drawingTaskBank["archivist-machine"].momo.find(
      (task) => task.id === frozen.momo[0].id,
    )!;
    const oldText = source.text;
    try {
      source.text = "Будущая редакция этого вопроса";
      s = restoreSession(JSON.parse(JSON.stringify(s)))!;
      expect(s.drawing!.taskSet).toEqual(frozen);
      expect(drawingPlan(config, s.drawing!.taskSet)).toEqual(originalPlan);
      for (let cue = 0; cue < originalPlan.length; cue++) {
        s = reducer(s, { type: "RESUME" });
        s = reducer(s, { type: "DRAWING", action: { type: "ADVANCE", cue } });
      }
      const result = drawingPlan(config, s.drawing!.taskSet);
      expect(
        result
          .filter((cue) => cue.kind === "gallery")
          .map((cue) => cue.guesses),
      ).toEqual(
        originalPlan
          .filter((cue) => cue.kind === "gallery")
          .map((cue) => cue.guesses),
      );
      expect(drawingText(s.drawing!, config)).toContain(oldText);
      expect(drawingText(s.drawing!, config)).not.toContain(source.text);
    } finally {
      source.text = oldText;
    }
  });

  it("migrates already-started v2 saves with their original questions, while old intro saves get the new bank", () => {
    const started = reducer(create(), {
      type: "DRAWING",
      action: { type: "START" },
    });
    const { taskSet: _set, ...oldState } = started.drawing!;
    const restored = restoreSession({ ...started, drawing: oldState })!;
    expect(restored.drawing!.taskSet).toEqual(legacyDrawingTaskSet(config));
    expect(restored.drawing!.taskSet!.archivist[0].text).toContain("хозяйстве");
    expect(
      restoreSession(JSON.parse(JSON.stringify(restored)))!.drawing!.taskSet,
    ).toEqual(restored.drawing!.taskSet);
    const intro = { ...oldState, phase: "intro" as const };
    expect(restoreDrawing(intro, config)!.taskSet).toEqual(
      drawingTaskSet(config),
    );
  });

  it("rejects malformed task snapshots instead of replacing questions during a game", () => {
    const state = create();
    const set = state.drawing!.taskSet!;
    for (const bad of [
      {},
      { ...set, momo: [set.momo[0]] },
      { ...set, momo: [set.momo[0], set.momo[0]] },
      { ...set, momo: [{ ...set.momo[0], text: 123 }, set.momo[1]] },
      { ...set, extra: set.momo },
    ]) {
      expect(isDrawingTaskSet(bad)).toBe(false);
      expect(
        restoreSession({
          ...state,
          drawing: { ...state.drawing, taskSet: bad },
        }),
      ).toBeNull();
    }
  });
});
