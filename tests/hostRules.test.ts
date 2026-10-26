import { describe, expect, it } from "vitest";
import { buildLegacyStages as buildStages } from "./legacy";
import { applyHostStages, getHostRules } from "../src/content/hostRules";
import type { NarratorId } from "../src/content/types";

const hosts: NarratorId[] = ["noise", "momo", "archivist", "chance", "noir"];

describe("host rules and story context", () => {
  it("keeps Chance's physical law compatible with each future's time of day", () => {
    for (const level of [0, 1, 2]) {
      for (const variant of [0, 1, 2]) {
        const base = buildStages("universes", variant, level);
        const hosted = applyHostStages(
          base,
          "universes",
          "chance",
          variant,
          level,
        );
        const originalHome = base.find((stage) => stage.id === "u-home")!;
        const home = hosted.find((stage) => stage.id === "u-home")!;
        expect(home.body.startsWith(originalHome.body)).toBe(true);
        expect(home.body).toContain("Новый закон этой вселенной");
        expect(home.body).toContain("повседневная жизнь");
        expect(home.body).not.toContain("обычное утро");
      }
    }
  });

  it("keeps the law-making stage before Ora's entrance while making the later night-shift grievance possible", () => {
    for (const level of [0, 1, 2]) {
      const stages = buildStages("cult", 0, level, {}, "archivist");
      const creation = stages.find((stage) => stage.id === "c-commandments")!;
      expect(creation.body).not.toMatch(
        /(?:^|[^а-яё])Ора(?:[^а-яё]|$)|прачк/iu,
      );
      expect(creation.body).toContain("мешает ночной смене выспаться");
      expect(
        stages.findIndex((stage) => stage.id === "c-heresy"),
      ).toBeGreaterThan(
        stages.findIndex((stage) => stage.id === "c-commandments"),
      );
    }
  });

  it("allows a consistent detective chronology instead of requiring players to invent a contradiction", () => {
    for (const variant of [0, 1]) {
      for (const level of [0, 1, 2]) {
        const base = buildStages("secrets", variant, level);
        const hosted = buildStages("secrets", variant, level, {}, "momo");
        const check = hosted.find((stage) => stage.id === "s-check")!;
        expect(check.prompt).toContain("есть ли противоречие");
        expect(check.prompt).toContain(
          "или ваша версия уже объясняет все известные события",
        );
        expect(check.prompt).not.toContain("ищите одно противоречие");
        expect(hosted.map((stage) => stage.body)).toEqual(
          base.map((stage) => stage.body),
        );
        expect(hosted.map((stage) => stage.secret)).toEqual(
          base.map((stage) => stage.secret),
        );
        expect(hosted.map((stage) => stage.choices)).toEqual(
          base.map((stage) => stage.choices),
        );
      }
    }
  });

  it("preserves private drawings until the reveal and leaves mystery roles and cult choices intact", () => {
    for (const host of hosts) {
      for (const variant of [0, 1]) {
        for (const level of [0, 1, 2]) {
          const drawing = buildStages("universes", variant, level);
          const hosted = applyHostStages(
            drawing,
            "universes",
            host,
            variant,
            level,
          );
          const reveal = drawing.findIndex(
            (stage) => stage.id === "u-reveal-one",
          );
          for (let i = 0; i < reveal; i++) {
            const added = hosted[i].body.slice(drawing[i].body.length);
            expect(added).not.toMatch(
              /покажите (?:другому |собеседнику |друг другу )?рисун|поменяйтесь рисунками/iu,
            );
          }
          const cult = buildStages("cult", variant, level, {
            "c-heresy": "ban",
            "c-treaty": "refuse",
          });
          const ruledCult = applyHostStages(cult, "cult", host, variant, level);
          expect(ruledCult.map((stage) => stage.choices)).toEqual(
            cult.map((stage) => stage.choices),
          );
          const mystery = buildStages("secrets", variant, level, {
            "s-verdict": variant ? "pavel" : "mara",
          });
          const ruledMystery = applyHostStages(
            mystery,
            "secrets",
            host,
            variant,
            level,
          );
          expect(
            ruledMystery.map((stage) => [
              stage.body,
              stage.secret,
              stage.choices,
            ]),
          ).toEqual(
            mystery.map((stage) => [stage.body, stage.secret, stage.choices]),
          );
        }
      }
      expect(
        getHostRules(host, "cult")
          .map((rule) => rule.text)
          .join(" "),
      ).not.toContain("кнопк");
    }
  });
});
