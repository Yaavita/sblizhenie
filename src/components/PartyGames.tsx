import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { games } from "../content/games";
import { pitchRounds, syncRounds, syncOptions } from "../content/party";
import { reducer } from "../engine/engine";
import type { Session } from "../engine/engine";
import {
  partyRoundCount,
  partyScores,
  partyTurn,
  pitchPoints,
} from "../engine/party";
import type { PartyAction } from "../engine/party";
import { saveSession } from "../hooks/storage";
import { chime } from "../hooks/sound";
import { Header } from "./Header";
import { PlayerTurn } from "./PlayerTurn";

export function PartyGames({
  initial,
  sound,
  onSound,
  onHome,
}: {
  initial: Session;
  sound: boolean;
  onSound: () => void;
  onHome: () => void;
}) {
  const [session, dispatch] = useReducer(reducer, initial);
  const [privateReady, setPrivateReady] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const state = session.party!;
  const { game, phase, round } = state;
  const meta = games.find((g) => g.id === game)!;
  const sync = useMemo(() => syncRounds(session.variant), [session.variant]);
  const pitches = useMemo(
    () => pitchRounds(session.variant),
    [session.variant],
  );
  const pitch = pitches[round];
  const prompt = sync[round];
  const scores = partyScores(state);
  const seller = round % 2;
  const turn = partyTurn(state);
  const gated =
    game === "sync" &&
    (phase === "handoff" || (phase === "choose" && !privateReady));
  const act = (action: PartyAction) => dispatch({ type: "PARTY", action });
  const previousRemaining = useRef(state.remaining);

  useEffect(() => {
    saveSession(session);
  }, [session]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) {
        setPrivateReady(false);
        dispatch({ type: "PAUSE" });
      }
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  useEffect(() => {
    if (session.paused || !["pitch", "response"].includes(phase)) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      dispatch({
        type: "PARTY",
        action: { type: "TICK", delta: Math.min((now - last) / 1000, 2) },
      });
      last = now;
    }, 250);
    return () => window.clearInterval(timer);
  }, [session.paused, phase]);
  useEffect(() => {
    if (sound && previousRemaining.current > 0 && state.remaining === 0)
      chime("end");
    previousRemaining.current = state.remaining;
  }, [sound, state.remaining]);
  useEffect(() => {
    window.scrollTo(0, 0);
    heading.current?.focus({ preventScroll: true });
  }, [phase, round, state.player, session.paused, privateReady]);

  function leave() {
    saveSession({ ...session, paused: true });
    onHome();
  }
  function start() {
    act({ type: "START" });
  }
  const title = (text: string) => (
    <h1 tabIndex={-1} ref={heading}>
      {text}
    </h1>
  );
  const last = state.history.at(-1);
  const roundLabel = `Раунд ${round + 1} / ${partyRoundCount(game)}`;
  const clock = (
    <div
      className={`party-clock ${state.remaining === 0 ? "time-up" : ""}`}
      role="timer"
      aria-label={`Осталось ${Math.ceil(state.remaining)} секунд`}
    >
      <strong>{Math.ceil(state.remaining).toString().padStart(2, "0")}</strong>
      <span>{state.remaining > 0 ? "секунд" : "Закончи мысль"}</span>
    </div>
  );

  return (
    <div className={`app-shell party-shell party-${game}`}>
      <Header
        sound={sound}
        onSound={onSound}
        onHome={leave}
        middle={<span>{meta.title}</span>}
      />
      <div className="museum-toolbar">
        <span className="small-label">
          {game === "sync"
            ? `Совпадений: ${scores[0]} / 8`
            : `Игрок 1: ${scores[0]} · Игрок 2: ${scores[1]}`}
        </span>
        <div>
          {!session.paused && phase !== "results" ? (
            <button
              className="text-button"
              onClick={() => {
                setPrivateReady(false);
                dispatch({ type: "PAUSE" });
              }}
            >
              Ⅱ Пауза
            </button>
          ) : null}
          <button className="text-button" onClick={leave}>
            Сохранить и выйти ↗
          </button>
        </div>
      </div>
      <main
        className={`party-main entrance ${phase === "results" ? "party-wide" : ""}`}
      >
        {turn && !session.paused && !gated ? <PlayerTurn {...turn} /> : null}
        {session.paused ? (
          <section className="party-centered">
            {title("Пауза")}
            <p className="lead">
              Всё сохранено. Можно продолжить с этого же места.
            </p>
            <button
              className="primary"
              onClick={() => dispatch({ type: "RESUME" })}
            >
              Продолжить →
            </button>
          </section>
        ) : phase === "intro" ? (
          <>
            <span className="step-label">
              {meta.minutes} минут ·{" "}
              {game === "sync" ? "Играете вместе" : "Соревнуетесь"}
            </span>
            {title(meta.title)}
            <p className="lead">{meta.subtitle}</p>
            {game === "sync" ? (
              <ol className="party-rules">
                <li>На экране вопрос и три варианта ответа.</li>
                <li>
                  Каждый выбирает тайно. Попробуйте выбрать одно и то же — без
                  подсказок.
                </li>
                <li>
                  Одинаковый ответ — один общий балл. Всего восемь раундов.
                </li>
              </ol>
            ) : (
              <ol className="party-rules">
                <li>
                  Продавец получает нелепый товар. На рекламу — 45 секунд.
                </li>
                <li>
                  Покупатель задаёт неожиданный вопрос. На ответ — 30 секунд.
                </li>
                <li>
                  Покупатель решает: купил бы или нет. Потом меняетесь ролями.
                </li>
              </ol>
            )}
            <p className="party-note">
              {game === "sync"
                ? "Договориться заранее нельзя. Обсуждать ответы после раскрытия — можно!"
                : "У каждого три продажи: первые две дают по баллу, последняя — два. Смешная, но убедительная реклама тоже считается."}
            </p>
            <button className="primary" onClick={start}>
              Начать игру →
            </button>
          </>
        ) : gated ? (
          <section className="party-centered">
            <span className="step-label">{roundLabel}</span>
            {title(`Игрок ${state.player + 1}, возьми ноутбук`)}
            <p className="lead">Другой пока не смотрит на экран.</p>
            <button
              className="primary"
              onClick={() => {
                setPrivateReady(true);
                if (phase === "handoff") act({ type: "READY" });
              }}
            >
              Экран только у меня →
            </button>
          </section>
        ) : game === "sync" && phase === "choose" ? (
          <>
            <span className="step-label">{roundLabel} · Тайный выбор</span>
            {title(prompt.question)}
            <p className="lead">
              Выбери вариант, который, как тебе кажется, выберет напарник.
            </p>
            <div className="party-options">
              {syncOptions(session.variant, round, state.player).map(
                ({ label: option, choice }, position) => (
                  <button
                    key={option}
                    className="party-option"
                    onClick={() => {
                      setPrivateReady(false);
                      act({ type: "SELECT", choice });
                    }}
                  >
                    <span>0{position + 1}</span>
                    <strong>{option}</strong>
                    <span aria-hidden="true">→</span>
                  </button>
                ),
              )}
            </div>
            <p className="party-note">
              Не говори ответ вслух и не подсказывай.
            </p>
          </>
        ) : game === "pitch" && phase === "pitch" ? (
          <>
            <span className="step-label">
              {roundLabel} · Сделка на {pitchPoints(round)}{" "}
              {pitchPoints(round) === 1 ? "балл" : "балла"}
            </span>
            {title("Продай этот товар")}
            <div className="party-pitch-content">
              <section className="party-product">
                <span className="small-label">Твой товар</span>
                <h2>{pitch.product}</h2>
                <p>
                  <span>Твой покупатель:</span>{" "}
                  {pitch.customer.toLocaleLowerCase("ru")}
                </p>
              </section>
              {clock}
            </div>
            <p className="lead">
              Придумай, зачем это нужно покупателю. Рекламируй вслух.
            </p>
            <button
              className="primary"
              onClick={() => act({ type: "PITCH_DONE" })}
            >
              Реклама закончена →
            </button>
          </>
        ) : phase === "objection" ? (
          <>
            <span className="step-label">{roundLabel} · Вопрос покупателя</span>
            {title("Задай продавцу этот вопрос")}
            <blockquote className="party-question">
              {pitch.objection}
            </blockquote>
            <button
              className="primary"
              onClick={() => act({ type: "OBJECTION_DONE" })}
            >
              Вопрос задан →
            </button>
          </>
        ) : phase === "response" ? (
          <>
            <span className="step-label">{roundLabel} · Ответ продавца</span>
            {title("Выкрутись!")}
            <div className="party-pitch-content">
              <section>
                <span className="small-label">
                  Вопрос о товаре «{pitch.product}»
                </span>
                <blockquote className="party-question">
                  {pitch.objection}
                </blockquote>
              </section>
              {clock}
            </div>
            <p className="lead">
              Ответь так, чтобы товар всё ещё хотелось купить.
            </p>
            <button
              className="primary"
              onClick={() => act({ type: "RESPONSE_DONE" })}
            >
              Ответ готов →
            </button>
          </>
        ) : phase === "judge" ? (
          <>
            <span className="step-label">
              {roundLabel} · Решение покупателя
            </span>
            {title("Купил бы?")}
            <p className="lead">
              Ты — {pitch.customer.toLocaleLowerCase("ru")}. Тебя убедили купить
              товар?
            </p>
            <div className="party-decision">
              <button
                className="primary"
                onClick={() => act({ type: "DEAL", accepted: true })}
              >
                Куплю · +{pitchPoints(round)} продавцу
              </button>
              <button
                className="secondary"
                onClick={() => act({ type: "DEAL", accepted: false })}
              >
                Не убедил · 0 баллов
              </button>
            </div>
          </>
        ) : phase === "reveal" ? (
          <>
            <span className="step-label">{roundLabel} · Результат</span>
            {title(
              game === "sync"
                ? last?.accepted
                  ? "Совпали!"
                  : "Разные мысли"
                : last?.accepted
                  ? "Продано!"
                  : "Клиент ушёл без покупки",
            )}
            {game === "sync" ? (
              <>
                <p className="lead">{prompt.question}</p>
                <div className="party-answer-pair">
                  {state.choices.map((choice, player) => (
                    <section key={player}>
                      <span className="small-label">Игрок {player + 1}</span>
                      <h2>{prompt.options[choice!]}</h2>
                    </section>
                  ))}
                </div>
                <p className="party-note">
                  {last?.accepted
                    ? "+1 к вашему общему счёту."
                    : "Обсудите, почему каждый выбрал свой вариант. В следующем раунде — новая попытка."}
                </p>
              </>
            ) : (
              <>
                <div className="party-round-receipt">
                  <span className="small-label">Товар</span>
                  <h2>{pitch.product}</h2>
                  <p>
                    Игрок {seller + 1} получает {last?.points}{" "}
                    {last?.points === 0
                      ? "баллов"
                      : last?.points === 1
                        ? "балл"
                        : "балла"}
                    .
                  </p>
                </div>
              </>
            )}
            <button className="primary" onClick={() => act({ type: "NEXT" })}>
              {state.history.length === partyRoundCount(game)
                ? "Посмотреть итоги →"
                : game === "pitch"
                  ? `Теперь продаёт игрок ${2 - seller} →`
                  : "Следующий раунд →"}
            </button>
          </>
        ) : (
          <>
            <span className="step-label">{meta.title} · Итоги</span>
            {title(
              game === "sync"
                ? scores[0] >= 6
                  ? "Один мозг. Почти буквально."
                  : scores[0] >= 3
                    ? "Общая волна найдена"
                    : "Две головы. Две вселенные."
                : scores[0] === scores[1]
                  ? "Ничья. Рынок в восторге."
                  : `Продавец вечера — игрок ${scores[0] > scores[1] ? 1 : 2}`,
            )}
            <div className="party-final-score">
              {game === "sync" ? (
                <>
                  <strong>{scores[0]} / 8</strong>
                  <span>совпадений на двоих</span>
                </>
              ) : (
                <>
                  <strong>
                    {scores[0]} : {scores[1]}
                  </strong>
                  <span>Игрок 1 · Игрок 2</span>
                </>
              )}
            </div>
            <div className="party-footer">
              <button className="primary" onClick={leave}>
                На главную →
              </button>
              <span>Итоги сохранены. К ним можно вернуться.</span>
            </div>
            <div className="party-summary">
              {state.history.map((result) => (
                <article key={result.round}>
                  <span className="small-label">
                    Раунд {result.round + 1} ·{" "}
                    {result.points ? `+${result.points}` : "0"}
                  </span>
                  {game === "sync" ? (
                    <>
                      <h2>{sync[result.round].question}</h2>
                      <p>
                        {result
                          .choices!.map((c) => sync[result.round].options[c])
                          .join(" / ")}
                      </p>
                    </>
                  ) : (
                    <>
                      <h2>{pitches[result.round].product}</h2>
                      <p>
                        Игрок {(result.round % 2) + 1} ·{" "}
                        {result.accepted ? "Продано" : "Без сделки"}
                      </p>
                    </>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
