import { storyLots, selectStoryLots } from "../src/content/auction";
import { describe, expect, it } from "vitest";
import { auctionLots, buildStages, games } from "../src/content/games";
import { applyHostStages, getHostRules } from "../src/content/hostRules";
import type { NarratorId } from "../src/content/types";

describe("playable scripts", () => {
  it("provides complete sessions in the requested time range with unique stages and lots", () => {
    // Museum uses its own interactive progression, covered in museum.test.ts.
    for (const game of games.filter(
      (g) => !["museum", "pitch", "sync"].includes(g.id),
    ))
      for (let variant = 0; variant < 28; variant++)
        for (const intimacy of [0, 1, 2]) {
          const stages = buildStages(game.id, variant, intimacy, {
            "s-verdict": variant % 2 ? "pavel" : "mara",
          });
          expect(stages.length).toBeGreaterThanOrEqual(8);
          expect(new Set(stages.map((s) => s.id)).size).toBe(stages.length);
          const seconds = stages.reduce((sum, s) => sum + s.seconds, 0);
          expect(seconds).toBeGreaterThanOrEqual(20 * 60);
          expect(seconds).toBeLessThanOrEqual(30 * 60);
          for (const stage of stages) {
            expect(stage.body.length).toBeGreaterThan(30);
            expect(stage.seconds).toBeGreaterThan(0);
            if (stage.kind === "secret") {
              expect(stage.secret?.one.length).toBeGreaterThan(100);
              expect(stage.secret?.two.length).toBeGreaterThan(100);
            }
          }
          const lots = stages.filter((s) => s.lot).map((s) => s.lot!.id);
          expect(new Set(lots).size).toBe(lots.length);
          if (game.id === "auction") expect(lots).toHaveLength(10);
        }
    expect(auctionLots.length).toBeGreaterThanOrEqual(12);
  });

  it("withholds mystery solutions until a verdict and places them directly after it", () => {
    for (const variant of [0, 1]) {
      const hidden = buildStages("secrets", variant, 0, {});
      expect(hidden.some((s) => s.id === "s-solution")).toBe(false);
      const revealed = buildStages("secrets", variant, 0, {
        "s-verdict": "anything",
      });
      const index = revealed.findIndex((s) => s.id === "s-verdict");
      expect(revealed[index + 1].id).toBe("s-solution");
      expect(revealed[index].choices).toHaveLength(3);
      expect(revealed.filter((s) => s.kind === "secret")).toHaveLength(3);
    }
  });

  it("propagates every cult decision into coherent later stages without changing stage positions", () => {
    const original = buildStages("cult", 0, 0, {});
    for (const charter of ["open", "council", "founders"]) {
      for (const heresy of ["listen", "split", "ban"]) {
        for (const famine of ["equal", "need", "faithful"]) {
          for (const treaty of ["accept", "negotiate", "refuse"]) {
            const decisions = {
              "c-charter": charter,
              "c-heresy": heresy,
              "c-famine": famine,
              "c-treaty": treaty,
            };
            const stages = buildStages("cult", 0, 0, decisions);
            expect(stages.map((s) => s.id)).toEqual(original.map((s) => s.id));
            expect(stages.find((s) => s.id === "c-heresy")!.body).not.toBe("");
            expect(stages.find((s) => s.id === "c-famine")!.body).not.toBe("");
            expect(stages.find((s) => s.id === "c-treaty")!.body).not.toBe("");
            expect(stages.find((s) => s.id === "c-after")!.body).not.toBe("");
            expect(stages.at(-1)!.body).not.toContain("undefined");
          }
        }
      }
    }
    const left = buildStages("cult", 0, 0, {
      "c-charter": "open",
      "c-heresy": "listen",
      "c-famine": "equal",
      "c-treaty": "accept",
    });
    const right = buildStages("cult", 0, 0, {
      "c-charter": "founders",
      "c-heresy": "ban",
      "c-famine": "faithful",
      "c-treaty": "refuse",
    });
    for (const id of [
      "c-heresy",
      "c-human",
      "c-famine",
      "c-treaty",
      "c-after",
      "c-finale",
    ]) {
      expect(left.find((s) => s.id === id)!.body).not.toBe(
        right.find((s) => s.id === id)!.body,
      );
    }
  });

  it("varies two mysteries, drawing prompts and auction lots across repeat sessions", () => {
    expect(buildStages("secrets", 0)[0].title).not.toBe(
      buildStages("secrets", 1)[0].title,
    );
    expect(buildStages("universes", 0)[1].body).not.toBe(
      buildStages("universes", 1)[1].body,
    );
    expect(buildStages("auction", 0).map((s) => s.lot?.id)).not.toEqual(
      buildStages("auction", 1).map((s) => s.lot?.id),
    );
  });

  it("explains a gentle temporary default for each skipped cult decision without attributing choices to players", () => {
    const decisions: Record<string, string> = {};
    const stages = buildStages("cult", 0, 0, decisions);
    expect(decisions).toEqual({});
    const choiceIds = [
      "c-charter",
      "c-heresy",
      "c-famine",
      "c-treaty",
      "c-legacy",
    ];
    for (const id of choiceIds) {
      const stage = stages.find((s) => s.id === id)!;
      expect(stage.notes).toContain(
        "Если пропустите этот этап, община временно",
      );
      expect(stage.notes).toContain("автоматический исход");
      expect(stage.choices).toHaveLength(3);
    }
    for (const id of [
      "c-heresy",
      "c-human",
      "c-famine",
      "c-treaty",
      "c-after",
    ]) {
      expect(stages.find((s) => s.id === id)!.body).toMatch(
        /пропущен|без вашего решения/,
      );
    }
    expect(stages.find((s) => s.id === "c-heresy")!.body).toContain(
      "временно разрешила всем",
    );
    expect(stages.find((s) => s.id === "c-human")!.body).toContain(
      "приостановила спорную заповедь",
    );
    expect(stages.find((s) => s.id === "c-treaty")!.body).toContain(
      "помощь по потребности",
    );
    expect(stages.find((s) => s.id === "c-after")!.body).toContain(
      "без политических уступок",
    );
    const finale = stages.at(-1)!.body;
    expect(
      finale.match(/автоматический временный исход после пропуска/g),
    ).toHaveLength(5);
    expect(finale).not.toContain("(ваше решение)");
    expect(finale).toContain("достоинство людей");
    expect(finale).not.toContain("запрет несогласия");
    expect(finale).not.toContain("пайки за верность");
    expect(finale).not.toContain("продажа храма");
  });

  it("reflects the chosen cult legacy in the museum while keeping mixed skips explicit", () => {
    const conclusions = new Set<string>();
    for (const legacy of ["revise", "dignity", "memory"]) {
      const decisions = { "c-charter": "council", "c-legacy": legacy };
      const stages = buildStages("cult", 0, 0, decisions);
      const finale = stages.at(-1)!.body;
      expect(finale).toContain("выборный совет (ваше решение)");
      expect(
        finale.match(/автоматический временный исход после пропуска/g),
      ).toHaveLength(3);
      expect(finale.match(/\(ваше решение\)/g)).toHaveLength(2);
      expect(stages.find((s) => s.id === "c-heresy")!.body).toContain(
        "Выборный совет",
      );
      conclusions.add(finale);
      if (legacy === "revise")
        expect(finale).toContain("мастерская пересмотра");
      if (legacy === "dignity")
        expect(finale).toContain("вправе распустить себя");
      if (legacy === "memory") expect(finale).toContain("свидетельства ошибок");
    }
    expect(conclusions.size).toBe(3);
  });
});

describe("fixed main host rules", () => {
  const hosts: NarratorId[] = ["noise", "momo", "archivist", "chance", "noir"];

  it("changes actual assignments in at least four stages of every game for every host", () => {
    for (const game of games.filter(
      (g) => !["auction", "museum", "pitch", "sync"].includes(g.id),
    )) {
      const base = buildStages(game.id, 3, 2, {});
      const untouched = JSON.stringify(base);
      const signatures = new Set<string>();
      for (const host of hosts) {
        const stages = applyHostStages(base, game.id, host, 3, 2);
        expect(stages.map((s) => [s.id, s.seconds])).toEqual(
          base.map((s) => [s.id, s.seconds]),
        );
        const changed = stages.filter(
          (s, i) =>
            s.body !== base[i].body ||
            s.prompt !== base[i].prompt ||
            s.notes !== base[i].notes,
        );
        expect(changed.length, `${game.id}/${host}`).toBeGreaterThanOrEqual(4);
        expect(stages.map((s) => s.choices)).toEqual(
          base.map((s) => s.choices),
        );
        const conditions = getHostRules(host, game.id, 2);
        expect(conditions.length).toBeGreaterThanOrEqual(2);
        expect(conditions.length).toBeLessThanOrEqual(3);
        expect(new Set(conditions.map((c) => c.id)).size).toBe(
          conditions.length,
        );
        signatures.add(JSON.stringify(stages));
        expect(buildStages(game.id, 3, 2, {}, host)).toEqual(stages);
      }
      expect(signatures.size).toBe(5);
      expect(JSON.stringify(base)).toBe(untouched);
      expect(buildStages(game.id, 3, 2, {})).toEqual(base);
    }
  });

  it("preserves every mystery fact, secret, answer and verdict gate under all hosts", () => {
    for (const variant of [0, 1])
      for (const host of hosts) {
        for (const decisions of [
          {},
          { "s-verdict": variant ? "pavel" : "mara" },
        ] as Record<string, string>[]) {
          const base = buildStages("secrets", variant, 2, decisions);
          const hosted = buildStages("secrets", variant, 2, decisions, host);
          expect(hosted.map((s) => s.body)).toEqual(base.map((s) => s.body));
          expect(hosted.map((s) => s.secret)).toEqual(
            base.map((s) => s.secret),
          );
          expect(hosted.map((s) => s.choices)).toEqual(
            base.map((s) => s.choices),
          );
          expect(hosted.some((s) => s.id === "s-solution")).toBe(
            Boolean(decisions["s-verdict"]),
          );
          for (const stage of hosted.filter((s) => s.kind !== "secret")) {
            for (const role of base.flatMap((s) =>
              s.secret ? [s.secret.one, s.secret.two] : [],
            )) {
              expect(
                `${stage.prompt ?? ""} ${stage.notes ?? ""}`,
              ).not.toContain(role);
            }
          }
        }
      }
  });

  it("changes the drawing worlds through persistent constraints", () => {
    const chance = buildStages("universes", 1, 1, {}, "chance");
    const law =
      "вещи становятся невидимыми, если ими не пользовались семь дней";
    for (const id of [
      "u-home",
      "u-one",
      "u-two",
      "u-cost",
      "u-guest",
      "u-bridge",
    ]) {
      expect(chance.find((s) => s.id === id)!.body).toContain(law);
    }
    const archivist = buildStages("universes", 0, 1, {}, "archivist");
    expect(archivist.find((s) => s.id === "u-home")!.body).toContain("24");
    expect(archivist.find((s) => s.id === "u-bridge")!.body).toContain(
      "не больше двух часов",
    );
  });
});

describe("four auction dealers", () => {
  it("has fifteen distinct personal stories per dealer and no Chance lots", () => {
    expect(storyLots).toHaveLength(60);
    expect(new Set(storyLots.map((l) => l.id)).size).toBe(60);
    for (const n of ["noise", "momo", "archivist", "noir"])
      expect(storyLots.filter((l) => l.narrator === n)).toHaveLength(15);
    expect(storyLots.some((l) => (l.narrator as string) === "chance")).toBe(
      false,
    );
    for (let v = 0; v < 60; v++) {
      const selected = selectStoryLots(v, 0);
      expect(selected).toHaveLength(10);
      expect(new Set(selected.map((l) => l.id)).size).toBe(10);
      expect(new Set(selected.map((l) => l.narrator)).size).toBe(4);
      expect(selected).toEqual(selectStoryLots(v, 0));
      expect(buildStages("auction", v, 0, {}, "momo")).toEqual(
        buildStages("auction", v, 0, {}, "noir"),
      );
    }
  });
});
