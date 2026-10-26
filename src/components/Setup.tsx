import { sharedIntimacy, opennessLevels } from "../content/intimacy";
import { useEffect, useState } from "react";
import { games } from "../content/games";
import { narrators } from "../content/narrators";
import type { GameId, NarratorId, PreferenceId } from "../content/types";
import { isPartyGame } from "../content/types";
export interface SetupResult {
  game: GameId;
  narrator: NarratorId;
  variant: number;
  intimacy: number;
}
const preferences: {
  id: PreferenceId;
  title: string;
  detail: string;
  mark: string;
}[] = [
  {
    id: "talk",
    title: "Узнать друг друга",
    detail: "Разговоры, которые обычно откладывают",
    mark: "01",
  },
  {
    id: "debate",
    title: "Поспорить и подумать",
    detail: "Красивые дилеммы без простых ответов",
    mark: "02",
  },
  {
    id: "absurd",
    title: "Немного сойти с ума",
    detail: "Воображение, юмор и здоровый абсурд",
    mark: "03",
  },
  {
    id: "create",
    title: "Создать что-нибудь",
    detail: "Руки заняты. Голова свободна",
    mark: "04",
  },
  {
    id: "romance",
    title: "Стать чуть ближе",
    detail: "Нежность, флирт и хорошие неловкости",
    mark: "05",
  },
  {
    id: "mystery",
    title: "Разгадать тайну",
    detail: "Секреты и приключения на двоих",
    mark: "06",
  },
  {
    id: "random",
    title: "Довериться случаю",
    detail: "Удивите нас. Мы согласны",
    mark: "✳",
  },
];
const levels = opennessLevels.map((level) => level.label);
export function Setup({
  onStart,
  onHome,
}: {
  onStart: (config: SetupResult) => void;
  onHome: () => void;
}) {
  const [screen, setScreen] = useState<
    "handoff1" | "pref1" | "handoff2" | "pref2" | "recommend"
  >("handoff1");
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);
  const [first, setFirst] = useState<PreferenceId[]>([]);
  const [second, setSecond] = useState<PreferenceId[]>([]);
  const [selected, setSelected] = useState<PreferenceId[]>([]);
  const [level, setLevel] = useState(0);
  const [firstLevel, setFirstLevel] = useState(0);
  const [intimacy, setIntimacy] = useState(0);
  const [game, setGame] = useState<GameId>("universes");
  const player = screen.endsWith("2") ? 2 : 1;
  const current = games.find((g) => g.id === game)!;
  function recommend(a: PreferenceId[], b: PreferenceId[], exclude?: GameId) {
    const ranked = games
      .filter((g) => g.id !== exclude)
      .map((g) => ({
        id: g.id,
        score:
          g.tags.filter((t) => a.includes(t)).length * 2 +
          g.tags.filter((t) => b.includes(t)).length * 2 +
          Math.random() * 2.5 +
          (a.some((t) => b.includes(t) && g.tags.includes(t)) ? 2 : 0),
      }));
    ranked.sort((a, b) => b.score - a.score);
    setGame(ranked[0].id);
  }
  if (screen === "handoff1" || screen === "handoff2")
    return (
      <main className="setup-stage centered entrance">
        <span className="step-label">01 / Настроение вечера</span>
        <div className="seal">{player === 1 ? "I" : "II"}</div>
        <h1>
          Теперь слово
          <br />
          игроку {player}.
        </h1>
        <p className="lead">
          Выберите настроение по очереди.
          <br />
          Пока один выбирает — другой отворачивается.
        </p>
        <button
          className="primary"
          onClick={() => setScreen(player === 1 ? "pref1" : "pref2")}
        >
          Экран только у меня →
        </button>
        <button className="text-button" onClick={onHome}>
          На главную
        </button>
      </main>
    );
  if (screen === "pref1" || screen === "pref2")
    return (
      <main className="setup-stage entrance">
        <div className="section-heading">
          <div>
            <span className="step-label">01 / Игрок {player}</span>
            <h1>
              Чего хочется
              <br />
              <em>сегодня?</em>
            </h1>
          </div>
          <p>
            Выберите до трёх настроений.
            <br />
            Ответы второго пока останутся тайной.
          </p>
        </div>
        <div className="preference-list">
          {preferences.map((p) => (
            <button
              key={p.id}
              className={`preference ${selected.includes(p.id) ? "selected" : ""}`}
              aria-pressed={selected.includes(p.id)}
              onClick={() =>
                setSelected((v) =>
                  v.includes(p.id)
                    ? v.filter((t) => t !== p.id)
                    : v.length < 3
                      ? [...v, p.id]
                      : v,
                )
              }
            >
              <span className="preference-index">{p.mark}</span>
              <span>
                <strong>{p.title}</strong>
                <small>{p.detail}</small>
              </span>
              <span className="selection-dot">
                {selected.includes(p.id) ? "✓" : "+"}
              </span>
            </button>
          ))}
        </div>
        <div className="setup-bottom">
          <div>
            <span className="small-label">Степень откровенности</span>
            <div className="level-select">
              {levels.map((l, i) => (
                <button
                  key={l}
                  aria-pressed={level === i}
                  className={level === i ? "active" : ""}
                  onClick={() => setLevel(i)}
                >
                  {l}
                </button>
              ))}
            </div>
            <small className="muted">{opennessLevels[level].detail}</small>
          </div>
          <button
            className="primary"
            disabled={!selected.length}
            onClick={() => {
              if (player === 1) {
                setFirst(selected);
                setFirstLevel(level);
                setSelected([]);
                setLevel(0);
                setScreen("handoff2");
              } else {
                setSecond(selected);
                setIntimacy(sharedIntimacy(firstLevel, level));
                recommend(first, selected);
                setSelected([]);
                setScreen("recommend");
              }
            }}
          >
            Скрыть и {player === 1 ? "передать ход" : "найти игру"} →
          </button>
        </div>
      </main>
    );
  return (
    <main className="recommend-screen entrance">
      <span className="step-label">02 / Совпадение найдено</span>
      <div className="recommend-layout">
        <div className={`game-art art-${game}`} aria-hidden="true">
          <div className="orbit orbit-a" />
          <div className="orbit orbit-b" />
          <span>
            {game === "pitch"
              ? "$"
              : game === "sync"
                ? "="
                : game === "museum"
                  ? "◈"
                  : game === "universes"
                    ? "∞"
                    : game === "cult"
                      ? "✳"
                      : game === "auction"
                        ? "100"
                        : "?"}
          </span>
          <div className="art-caption">
            {game === "pitch"
              ? "Купи абсурд. Продай уверенно."
              : game === "sync"
                ? "Совпадём?"
                : game === "museum"
                  ? "За каждым впечатлением — история."
                  : game === "universes"
                    ? "Два мира. Одна точка встречи."
                    : game === "cult"
                      ? "Вначале было ваше слово."
                      : game === "auction"
                        ? "У всего ли есть цена?"
                        : "Правда между строк."}
          </div>
        </div>
        <div>
          <span className="small-label">На этот вечер</span>
          <h1>{current.title}</h1>
          <p className="lead">{current.description}</p>
          <div className="game-specs">
            <span>{current.minutes} минут</span>
            <span>Два игрока</span>
            <span>
              {isPartyGame(game) ? "Без личных вопросов" : levels[intimacy]}
            </span>
          </div>
          <p className="muted">Приготовьте: {current.materials.join(", ")}.</p>
          <button
            className="primary"
            onClick={() =>
              onStart({
                game,
                narrator:
                  narrators[Math.floor(Math.random() * narrators.length)].id,
                variant: Math.floor(Math.random() * 10000),
                intimacy,
              })
            }
          >
            Начать вечер →
          </button>
          <button
            className="text-button"
            onClick={() => recommend(first, second, game)}
          >
            ↻ Предложить другую игру
          </button>
          <p className="cast-promise">
            {isPartyGame(game)
              ? "Кто сейчас играет и что делать — всегда видно на экране."
              : game === "museum"
                ? "Ведущий откроет музей. Все шесть историй и подписи к ним — ваши."
                : "Рассказчики появятся сами. Кто первым заберёт слово — пока не знает никто."}
          </p>
        </div>
      </div>
      <div className="game-picker" role="group" aria-label="Выбрать игру">
        <span className="small-label">Или выберите сами</span>
        <div>
          {games.map((option) => (
            <button
              key={option.id}
              className={game === option.id ? "active" : ""}
              aria-pressed={game === option.id}
              onClick={() => setGame(option.id)}
            >
              {option.title}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
