import { describe, expect, it } from "vitest";
import { buildStages, buildLegacyDrawingStages } from "../src/content/games";
import {
  selectStoryLots,
  selectBonusQuestion,
  storyLots,
} from "../src/content/auction";
import { auctionQuestionVersions } from "../src/content/auctionIntimacy";
import {
  applyIntimacy,
  intimacyLevel,
  sharedIntimacy,
} from "../src/content/intimacy";
import { initialSession, restoreSession } from "../src/engine/engine";
import type { GameId, NarratorId, Stage } from "../src/content/types";
const hosts: NarratorId[] = ["noise", "momo", "archivist", "chance", "noir"];
const serialize = (s: Stage) =>
  JSON.stringify([
    s.title,
    s.body,
    s.prompt,
    s.notes,
    s.secret,
    s.lot?.question,
  ]);
describe("effective openness", () => {
  it("respects the less open preference and rejects invalid restored levels", () => {
    for (let a = 0; a < 3; a++)
      for (let b = 0; b < 3; b++)
        expect(sharedIntimacy(a, b)).toBe(Math.min(a, b));
    for (const invalid of [NaN, Infinity, -1, 0.5, 3])
      expect(intimacyLevel(invalid)).toBe(0);
    const stage = buildStages("universes")[0];
    const s = initialSession("universes", "momo", 0, 2, stage);
    expect(restoreSession(JSON.parse(JSON.stringify(s)))?.intimacy).toBe(2);
    for (const invalid of [-1, 0.5, 3, Infinity])
      expect(restoreSession({ ...s, intimacy: invalid })).toBeNull();
  });
  it("changes real content between all three levels for each game and every host", () => {
    for (const game of ["universes", "cult", "auction", "secrets"] as GameId[])
      for (const variant of [0, 1])
        for (const host of hosts) {
          const levels = [0, 1, 2].map((level) =>
            buildStages(
              game,
              variant,
              level,
              { "s-verdict": variant ? "pavel" : "mara" },
              host,
            ),
          );
          for (const [a, b] of [
            [0, 1],
            [1, 2],
            [0, 2],
          ]) {
            expect(levels[a].map((s) => s.id)).toEqual(
              levels[b].map((s) => s.id),
            );
            expect(levels[a].map((s) => s.seconds)).toEqual(
              levels[b].map((s) => s.seconds),
            );
            expect(
              levels[a].filter(
                (s, i) => serialize(s) !== serialize(levels[b][i]),
              ).length,
              `${game}/${host}/${a}-${b}`,
            ).toBeGreaterThanOrEqual(
              game === "universes" ? 5 : game === "secrets" ? 5 : 7,
            );
          }
        }
  });
});
describe("openness in the auction", () => {
  it("gives all sixty lots three distinct authored questions without changing dealers or the draw", () => {
    expect(new Set(Object.keys(auctionQuestionVersions))).toEqual(
      new Set(storyLots.map((l) => l.id)),
    );
    const decks = [0, 1, 2].map((level) => selectStoryLots(18, level, 60));
    for (const deck of decks)
      expect(new Set(deck.map((l) => l.id)).size).toBe(60);
    for (let i = 0; i < 60; i++) {
      expect(decks[0][i].id).toBe(decks[1][i].id);
      expect(decks[1][i].id).toBe(decks[2][i].id);
      expect(
        new Set(decks.map((d) => d[i].question)).size,
        decks[0][i].id,
      ).toBe(3);
      for (const deck of decks)
        expect(deck[i].question.length).toBeGreaterThan(65);
    }
    expect(decks[0].find((l) => l.id === "missed-flirt")?.title).toBe(
      "Комплимент с задержкой",
    );
    expect(
      decks[2].find((l) => l.id === "noticed-attraction")?.question,
    ).toContain("влечение");
  });
  it("adapts Chance's question too, keeps used questions out, and remains deterministic", () => {
    for (let variant = 0; variant < 30; variant++) {
      const levels = [0, 1, 2].map((level) =>
        selectBonusQuestion(variant, level)!,
      );
      expect(new Set(levels.map((q) => q.id)).size).toBe(1);
      expect(new Set(levels.map((q) => q.question)).size).toBe(3);
      const used: string[] = [];
      for (let i = 0; i < 7; i++) {
        const next = selectBonusQuestion(variant, 2, used)!;
        expect(used).not.toContain(next.id);
        used.push(next.id);
      }
      expect(selectBonusQuestion(variant, 2, used)).toBeNull();
    }
  });
});
describe("story stakes and logical invariants", () => {
  it("keeps the cult's ritual, reform, grain, treaty and archive in the same decision branch", () => {
    for (const level of [1, 2]) {
      for (const heresy of [undefined, "listen", "split", "ban"]) {
        for (const famine of ["equal", "need", "faithful"]) {
          for (const treaty of ["accept", "negotiate", "refuse"]) {
            for (const legacy of ["memory", "revise", "dignity"]) {
              const decisions: Record<string, string> = {
                "c-famine": famine,
                "c-treaty": treaty,
                "c-legacy": legacy,
                ...(heresy ? { "c-heresy": heresy } : {}),
              };
              const base = buildStages("cult", 0, 0, decisions);
              const before = JSON.stringify(base);
              const stages = applyIntimacy(base, "cult", level, 0, decisions);
              const stage = (id: string) => stages.find((s) => s.id === id)!;
              expect(stages.map((s) => [s.id, s.seconds, s.choices])).toEqual(
                base.map((s) => [s.id, s.seconds, s.choices]),
              );
              expect(JSON.stringify(base)).toBe(before);
              expect(stage("c-commandments").body).toContain(
                level === 2 ? "Книгу признаний" : "Книгу пар",
              );
              expect(stage("c-heresy").body).toContain("Ора");
              if (!heresy)
                expect(stage("c-human").body).toContain(
                  "община приостановила ночные признания",
                );
              if (heresy === "listen") {
                expect(stage("c-human").body).toContain(
                  "признания стали добровольными",
                );
                expect(stage("c-after").body).not.toContain(
                  "признания остались обязательными",
                );
              }
              if (heresy === "split")
                expect(stage("c-human").body).toContain(
                  "В отдельной ветви Оры ночные признания отменены",
                );
              if (heresy === "ban")
                expect(stage("c-human").body).toContain(
                  "признания остались обязательными",
                );
              if (famine === "faithful")
                expect(stage("c-treaty").body).toContain(
                  "рискует остаться без зерна",
                );
              else
                expect(stage("c-treaty").body).toContain(
                  "паёк не зависит от участия в обряде",
                );
              if (treaty === "accept")
                expect(stage("c-after").body).toContain("празднике договора");
              if (treaty === "negotiate")
                expect(stage("c-after").body).toContain(
                  "Перед совместными работами",
                );
              if (treaty === "refuse")
                expect(stage("c-after").body).toContain("Покупатель реликвий");
              const ending = stage("c-finale").body;
              if (legacy === "memory")
                expect(ending).toContain("свидетельством ошибок");
              if (legacy === "revise")
                expect(ending).toContain(
                  "кто вправе потребовать изъять свою страницу",
                );
              if (legacy === "dignity")
                expect(ending).toContain("часть книги останется закрытой");
            }
          }
        }
      }
    }
  });

  it("does not turn personal mystery subplots into new physical evidence or unsupported motives", () => {
    for (const variant of [0, 1]) {
      const base = buildStages("secrets", variant, 0, {});
      const before = JSON.stringify(base);
      for (const level of [1, 2]) {
        const stages = buildStages("secrets", variant, level, {});
        expect(stages.some((s) => s.id === "s-solution")).toBe(false);
        for (const id of ["s-second", "s-third"]) {
          expect(stages.find((s) => s.id === id)?.secret).toEqual(
            base.find((s) => s.id === id)?.secret,
          );
        }
        expect(stages.find((s) => s.id === "s-verdict")?.choices).toEqual(
          base.find((s) => s.id === "s-verdict")?.choices,
        );
        applyIntimacy(base, "secrets", level, variant);
        expect(JSON.stringify(base)).toBe(before);
      }
    }
    const letter = buildStages("secrets", 0, 1, { "s-verdict": "mara" });
    expect(letter.find((s) => s.id === "s-solution")?.body).toContain(
      "в деле нет ответа получательницы",
    );
    const frankLetter = buildStages("secrets", 0, 2, { "s-verdict": "mara" });
    expect(frankLetter.find((s) => s.id === "s-solution")?.body).toContain(
      "роман Саши с Марой — другая история",
    );
    const radio = buildStages("secrets", 1, 1, { "s-verdict": "pavel" });
    expect(radio.find((s) => s.id === "s-solution")?.body).toContain(
      "не доказывает, что он хотел её вернуть",
    );
    const frankRadio = buildStages("secrets", 1, 2, { "s-verdict": "pavel" });
    expect(frankRadio.find((s) => s.id === "s-solution")?.body).toContain(
      "о других записях журнал ничего не рассказывает",
    );
    expect(frankRadio.find((s) => s.id === "s-map")?.prompt).not.toContain(
      "исчезновении",
    );
  });

  it("keeps the legacy drawing circumstance concrete and compatible with host constraints at both romantic levels", () => {
    for (const level of [1, 2]) {
      for (const variant of [0, 1]) {
        const stages = buildLegacyDrawingStages(variant, level);
        expect(stages.find((s) => s.id === "u-cost")?.body).toContain(
          "На восемь часов пропала связь",
        );
        expect(stages.find((s) => s.id === "u-home")?.body).toMatch(
          /Нарисуйте/,
        );
        expect(stages.find((s) => s.id === "u-bridge")?.body).toMatch(
          /два рисунка|между мирами/,
        );
        expect(stages.map((s) => [s.id, s.seconds])).toEqual(
          buildLegacyDrawingStages(variant, 0).map((s) => [s.id, s.seconds]),
        );
      }
    }
  });

  it("changes cult conflict while preserving all decisions and their consequences at every level", () => {
    for (const level of [0, 1, 2]) {
      const base = buildStages("cult", 0, level, {});
      const decisions = {
        "c-charter": "founders",
        "c-heresy": "ban",
        "c-famine": "faithful",
        "c-treaty": "accept",
        "c-legacy": "memory",
      };
      const path = buildStages("cult", 0, level, decisions);
      expect(path.find((s) => s.id === "c-human")?.body).toContain(
        "плохие новости",
      );
      expect(path.find((s) => s.id === "c-after")?.body).toContain(
        "задержал человека",
      );
      expect(path.at(-1)?.body).toContain("свидетельства ошибок");
      expect(path.flatMap((s) => s.choices?.map((c) => c.id) ?? [])).toEqual(
        base.flatMap((s) => s.choices?.map((c) => c.id) ?? []),
      );
    }
    expect(
      buildStages("cult", 0, 1).find((s) => s.id === "c-heresy")?.body,
    ).toContain("публичные признания");
    expect(
      buildStages("cult", 0, 2).find((s) => s.id === "c-heresy")?.body,
    ).toContain("Ора отказывается исповедоваться");
  });
  it("preserves each mystery's proof chain and verdict gate across levels and host methods", () => {
    for (const level of [0, 1, 2])
      for (const variant of [0, 1])
        for (const host of hosts) {
          const hidden = buildStages("secrets", variant, level, {}, host);
          expect(hidden.some((s) => s.id === "s-solution")).toBe(false);
          const stages = buildStages(
            "secrets",
            variant,
            level,
            { "s-verdict": variant ? "pavel" : "mara" },
            host,
          );
          const role = stages.find((s) => s.id === "s-roles")!;
          const second = stages.find((s) => s.id === "s-second")!;
          const third = stages.find((s) => s.id === "s-third")!;
          const solution = stages.find((s) => s.id === "s-solution")!;
          if (!variant) {
            expect(role.secret?.one).toContain("20:30");
            expect(role.secret?.two).toContain("БЕЛЫЙ");
            expect(second.secret?.one).toContain("20:45");
            expect(third.secret?.two).toContain("20:48");
            expect(solution.body).toContain("чёрным корешком");
            expect(solution.body).toContain("зелёная печать");
          } else {
            expect(role.secret?.one).toContain("19:00");
            expect(second.secret?.one).toContain("20:40");
            expect(third.secret?.two).toContain("21:17");
            expect(third.secret?.one).toContain(
              "без письменного согласия авторов",
            );
            expect(solution.body).toContain("22:00");
          }
          expect(
            stages.find((s) => s.id === "s-verdict")?.choices?.map((c) => c.id),
          ).toEqual(
            variant ? ["pavel", "dina", "vera"] : ["mara", "lev", "inga"],
          );
        }
  });
  it("keeps frank material out of gentle gameplay, including every host", () => {
    for (const game of ["universes", "cult", "auction", "secrets"] as GameId[])
      for (const host of hosts)
        for (const variant of [0, 1]) {
          const text = buildStages(
            game,
            variant,
            0,
            { "s-verdict": variant ? "pavel" : "mara" },
            host,
          )
            .map(serialize)
            .join(" ");
          expect(text).not.toMatch(
            /возбужда|поцелов|провели ночь вместе|тайные отношения|сексуал|соблазнить/i,
          );
        }
  });
});
