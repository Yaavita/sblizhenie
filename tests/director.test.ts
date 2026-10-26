import { describe, expect, it } from "vitest";
import { buildLegacyStages as buildStages } from "./legacy";
import { narrators } from "../src/content/narrators";
import { availableInterruptions } from "../src/engine/director";
import { initialSession } from "../src/engine/engine";
import type { GameId } from "../src/content/types";

describe("intervention director", () => {
  it("keeps secret handoffs, reveals, introductions and endings uninterrupted", () => {
    for (const game of [
      "universes",
      "cult",
      "secrets",
      "auction",
    ] as GameId[]) {
      for (const variant of [0, 1]) {
        const stages = buildStages(game, variant, 2);
        for (const stage of stages) {
          if (
            stage.kind !== "secret" &&
            ![
              stages[0].id,
              stages.at(-1)!.id,
              "u-reveal-one",
              "u-reveal-two",
              "s-verdict",
              "s-solution",
            ].includes(stage.id) &&
            game !== "auction"
          )
            continue;
          for (const host of narrators) {
            const state = initialSession(game, host.id, variant, 2, stage);
            expect(
              availableInterruptions(state),
              `${game}/${stage.id}/${host.id}`,
            ).toEqual([]);
          }
        }
      }
    }
  });

  it("filters by host, openness and previous appearances without emptying every playable scene", () => {
    for (const game of ["universes", "cult", "secrets"] as GameId[]) {
      for (const host of narrators) {
        let eligible = 0;
        for (const stage of buildStages(game, 0, 0)) {
          const state = initialSession(game, host.id, 0, 0, stage);
          const events = availableInterruptions(state);
          eligible += events.length;
          for (const event of events) {
            expect(event.narrator).not.toBe(host.id);
            expect(event.minIntimacy).toBe(0);
            expect(event.contextstageIds).toContain(stage.id);
            state.log.push({
              id: state.log.length + 1,
              type: "interruption",
              text: event.text,
            });
          }
          expect(availableInterruptions(state)).toEqual([]);
        }
        expect(eligible, `${game}/${host.id}`).toBeGreaterThan(0);
      }
    }
  });
});
