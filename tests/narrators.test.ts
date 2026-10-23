import { describe, expect, it } from "vitest";
import { buildStages } from "../src/content/games";
import {
  interruptionPool,
  narrators,
  narratorRemarks,
  stageRemark,
} from "../src/content/narrators";
import type { GameId } from "../src/content/types";

const games: GameId[] = ["universes", "cult", "secrets"];

describe("contextual narrator scenes", () => {
  it("only interrupts actual compatible stages, protecting introductions, drawings and endings", () => {
    const prohibited = new Set([
      "u-arrive",
      "u-reveal-one",
      "u-reveal-two",
      "u-return",
      "c-origin",
      "c-legacy",
      "c-finale",
      "s-opening",
      "s-roles",
      "s-public",
      "s-second",
      "s-third",
      "s-verdict",
      "s-solution",
      "s-after",
    ]);
    expect(new Set(interruptionPool.map((e) => e.id)).size).toBe(
      interruptionPool.length,
    );
    for (const event of interruptionPool) {
      expect(event.contextstageIds?.length, event.id).toBeGreaterThan(0);
      expect(event.games).not.toContain("auction");
      for (const id of event.contextstageIds ?? []) {
        expect(prohibited.has(id), `${event.id} / ${id}`).toBe(false);
        const game = games.find(
          (g) =>
            event.games.includes(g) &&
            buildStages(g).some((stage) => stage.id === id),
        );
        expect(
          game,
          `${event.id} has unknown or incompatible stage ${id}`,
        ).toBeDefined();
        for (const variant of [0, 1]) {
          const stage = buildStages(game!, variant).find(
            (stage) => stage.id === id,
          );
          expect(
            stage,
            `${event.id} unavailable in variant ${variant}`,
          ).toBeDefined();
          expect(stage?.kind).not.toBe("secret");
        }
      }
      for (const game of event.games) {
        expect(
          event.contextstageIds?.some((id) =>
            buildStages(game).some((stage) => stage.id === id),
          ),
          `${event.id} has no valid context for ${game}`,
        ).toBe(true);
      }
    }
  });

  it("gives each reply a real operation with enough time to react to its parent", () => {
    for (const event of interruptionPool) {
      if (event.operation === "replace")
        expect(event.target, event.id).toBeDefined();
      if (!event.reply) continue;
      expect(event.reply.narrator, event.id).not.toBe(event.narrator);
      expect(event.reply.after).toBeGreaterThan(0);
      expect(event.reply.after).toBeLessThan(event.duration);
      expect(event.reply.operation, event.id).toBeDefined();
      expect(event.reply.cancelsParent, event.id).toBe(
        event.reply.operation === "cancel",
      );
    }
  });

  it("keeps the museum scene private and detective scenes inside the evidence discussion", () => {
    const museum = interruptionPool.find((e) => e.id === "museum-label")!;
    expect(museum.text).toContain("Не показывая листа");
    expect(museum.text).not.toMatch(/поменяйтесь рисунками/iu);
    for (const event of interruptionPool.filter((e) =>
      e.games.includes("secrets"),
    )) {
      expect(
        event.contextstageIds?.filter((id) => id.startsWith("s-")),
      ).toEqual(
        expect.arrayContaining([expect.stringMatching(/^s-(map|check)$/)]),
      );
      expect(`${event.text} ${event.reply?.text ?? ""}`).not.toMatch(
        /Мара|Павел|farewell|stop-sale|21:17|22:00/iu,
      );
    }
  });
});

describe("stage-aware host remarks", () => {
  it("uses a proper opening and a distinct closing for each host in every non-auction game", () => {
    for (const narrator of narrators) {
      for (const game of games) {
        const stages = buildStages(game);
        expect(stageRemark(narrator.id, game, 0, stages[0].id)).toBe(
          narratorRemarks[narrator.id][0],
        );
        const last = stages.at(-1)!;
        expect(stageRemark(narrator.id, game, stages.length - 1, last.id)).toBe(
          narratorRemarks[narrator.id][6],
        );
      }
    }
    expect(
      new Set(narrators.map((n) => stageRemark(n.id, "cult", 9, "c-finale")))
        .size,
    ).toBe(5);
  });

  it("follows the stage ID after a detective solution is inserted instead of wrapping into an opening", () => {
    for (const narrator of narrators) {
      const result = stageRemark(narrator.id, "secrets", 10, "s-after");
      expect(result).toBe(narratorRemarks[narrator.id][6]);
      expect(stageRemark(narrator.id, "secrets", 0, "s-check")).not.toBe(
        narratorRemarks[narrator.id][0],
      );
    }
  });

  it("never assumes a joke or a changed opinion without that context", () => {
    for (const game of games) {
      for (const narrator of narrators) {
        for (const [index, stage] of buildStages(game).entries()) {
          const remark = stageRemark(narrator.id, game, index, stage.id);
          expect(remark).not.toMatch(/Шутка засчитана|Передумали\?/iu);
          expect(narratorRemarks[narrator.id]).toContain(remark);
        }
      }
    }
  });
});
