import { useEffect, useReducer, useRef, useState } from "react";
import { museumExamples, museumQuestions } from "../content/museum";
import { getNarrator, narratorRemarks } from "../content/narrators";
import { reducer } from "../engine/engine";
import type { Session } from "../engine/engine";
import {
  captionsReady,
  museumOwner,
  museumText,
  museumTurn,
} from "../engine/museum";
import type { MuseumAction } from "../engine/museum";
import { saveSession } from "../hooks/storage";
import { useNarratorVoice } from "../hooks/voice";
import { Header } from "./Header";
import { Portrait } from "./Portrait";
import { PlayerTurn } from "./PlayerTurn";

export function Museum({
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
  const museum = session.museum!;
  const { phase } = museum;
  const owner = museumOwner(museum);
  const act = (action: MuseumAction) => dispatch({ type: "MUSEUM", action });
  const host = getNarrator(session.narrator);
  const hostLine = narratorRemarks[host.id][phase === "gallery" ? 6 : 0];
  const voice = useNarratorVoice(
    host.id,
    hostLine,
    `museum:${phase}`,
    sound && (phase === "intro" || phase === "gallery"),
    session.paused,
  );
  useEffect(() => {
    saveSession(session);
  }, [session]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) dispatch({ type: "PAUSE" });
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
    heading.current?.focus({ preventScroll: true });
  }, [
    phase,
    museum.exhibits.length,
    museum.preparationPlayer,
    session.paused,
    privateReady,
  ]);

  function leave() {
    saveSession({ ...session, paused: true });
    onHome();
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([museumText(museum)], { type: "text/plain;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "museum-impressions.txt";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const title = (text: string) => (
    <h1 ref={heading} tabIndex={-1}>
      {text}
    </h1>
  );
  const selectedCaption =
    museum.selected === null ? "" : museum.captions[owner][museum.selected];
  const handoff = phase === "handoff" || (phase === "write" && !privateReady);
  const turn = !session.paused && !handoff ? museumTurn(museum) : null;
  const roundSteps: Record<string, string> = {
    pick: "1 / 5 · Выбор фразы",
    story: "2 / 5 · Рассказ",
    question: "3 / 5 · Вопрос",
    label: "4 / 5 · Новая подпись",
    approve: "5 / 5 · Проверка",
  };

  return (
    <div className="app-shell museum-shell">
      <Header
        sound={sound}
        onSound={onSound}
        onHome={leave}
        middle={<span>Музей неверных впечатлений</span>}
      />
      <div className="museum-toolbar">
        <span className="small-label">
          {phase === "gallery"
            ? "Выставка открыта"
            : `В коллекции ${museum.exhibits.length} / 6`}
        </span>
        <div>
          {!session.paused && phase !== "gallery" ? (
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
        className={`museum-main entrance ${session.paused ? "" : phase === "gallery" ? "museum-wide" : phase === "intro" ? "museum-intro" : phase === "approve" ? "museum-review" : phase === "write" && !handoff ? "museum-preparation" : ""}`}
      >
        {turn ? <PlayerTurn {...turn} /> : null}
        {session.paused ? (
          <section className="museum-center">
            <div className="museum-emblem" aria-hidden="true">
              Ⅱ
            </div>
            {title("Музей подождёт.")}
            <p className="lead">Ваши подписи и место в игре сохранены.</p>
            <button
              className="primary"
              onClick={() => dispatch({ type: "RESUME" })}
            >
              Продолжить вечер →
            </button>
          </section>
        ) : phase === "intro" ? (
          <>
            <div className="museum-intro-copy">
              <span className="step-label">Новая выставка · 20–30 минут</span>
              {title("Какой ты на самом деле?")}
              <p className="lead">
                Шесть коротких историй — по три от каждого.
              </p>
              <ol className="museum-instructions">
                <li>
                  <strong>Напиши три фразы о себе.</strong>
                  <span>Например: «Кажется, я никогда не сомневаюсь».</span>
                </li>
                <li>
                  <strong>Другой выберет фразу. Ты расскажешь историю.</strong>
                  <span>
                    Объясни на одном примере из жизни, так это или нет.
                  </span>
                </li>
                <li>
                  <strong>После истории появится новая подпись.</strong>
                  <span>
                    Другой напишет, что понял о тебе. Ты проверишь, верно ли
                    это.
                  </span>
                </li>
              </ol>
              <button
                className="primary"
                onClick={() => act({ type: "START" })}
              >
                Начать →
              </button>
            </div>
            <aside className="museum-intro-aside">
              <p className="museum-note">
                Уже давно знакомы? Выберите впечатления, которые когда-то были
                верны, но успели измениться. Истории рассказывайте вслух —
                записать нужно только подписи.
              </p>
              <div className="museum-host">
                <Portrait id={host.id} />
                <div>
                  <span className="small-label">
                    {host.name} открывает вечер
                  </span>
                  <p>«{hostLine}»</p>
                  {voice.available ? (
                    <button
                      className="text-button"
                      onClick={voice.replay}
                      disabled={!sound}
                    >
                      ↻ Реплика
                    </button>
                  ) : null}
                </div>
              </div>
            </aside>
          </>
        ) : handoff ? (
          <section className="museum-center">
            <span className="step-label">Личная подготовка</span>
            <div className="museum-emblem" aria-hidden="true">
              {museum.preparationPlayer + 1}
            </div>
            {title(`Игрок ${museum.preparationPlayer + 1}, возьми ноутбук.`)}
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
        ) : phase === "write" ? (
          <>
            {title("Напиши три фразы о себе")}
            <p className="lead">
              Например: «Кажется, я всегда уверен в себе». Выбирай фразы, о
              которых можешь рассказать случай из жизни.
            </p>
            <form
              className="museum-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (captionsReady(museum.captions[museum.preparationPlayer])) {
                  setPrivateReady(false);
                  act({ type: "SEAL" });
                }
              }}
            >
              {museum.captions[museum.preparationPlayer].map(
                (caption, slot) => (
                  <label key={slot} className="museum-field">
                    <span>Фраза {slot + 1}</span>
                    <input
                      autoComplete="off"
                      maxLength={180}
                      value={caption}
                      placeholder="Кажется, я…"
                      onChange={(event) =>
                        act({ type: "WRITE", slot, text: event.target.value })
                      }
                    />
                  </label>
                ),
              )}
              <details className="museum-suggestions">
                <summary>Не знаешь, с чего начать?</summary>
                <p>
                  Выбери пример — он появится в первой свободной строке. Его
                  можно переписать.
                </p>
                <div>
                  {museumExamples(session.intimacy).map((text) => (
                    <button
                      type="button"
                      key={text}
                      disabled={
                        museum.captions[museum.preparationPlayer].every((c) =>
                          c.trim(),
                        ) ||
                        museum.captions[museum.preparationPlayer].includes(text)
                      }
                      onClick={() =>
                        act({
                          type: "WRITE",
                          slot: museum.captions[
                            museum.preparationPlayer
                          ].findIndex((c) => !c.trim()),
                          text,
                        })
                      }
                    >
                      {text} +
                    </button>
                  ))}
                </div>
              </details>
              <p className="museum-note">
                Для выставки нужны три разные подписи. Личные истории останутся
                для разговора.
              </p>
              <button
                className="primary"
                disabled={
                  !captionsReady(museum.captions[museum.preparationPlayer])
                }
              >
                Сохранить и скрыть фразы →
              </button>
            </form>
          </>
        ) : phase === "pick" ? (
          <>
            <span className="step-label">
              История {museum.exhibits.length + 1} / 6 · {roundSteps[phase]}
            </span>
            {title("Выбери одну фразу")}
            <p className="lead">
              Какую фразу об игроке {owner + 1} хочется обсудить?
            </p>
            <div className="museum-picks">
              {museum.captions[owner].map((caption, slot) => {
                const exhibited = museum.exhibits.some(
                  (item) => item.owner === owner && item.slot === slot,
                );
                return (
                  <button
                    className={`museum-pick ${exhibited ? "exhibited" : ""}`}
                    key={slot}
                    disabled={exhibited}
                    onClick={() => act({ type: "PICK", slot })}
                  >
                    <span className="small-label">
                      {exhibited ? "Уже обсудили" : `Фраза ${slot + 1}`}
                    </span>
                    <strong>{caption}</strong>
                    <span aria-hidden="true">{exhibited ? "✓" : "↗"}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : phase === "story" ? (
          <>
            <span className="step-label">
              История {museum.exhibits.length + 1} / 6 · {roundSteps[phase]}
            </span>
            {title("Расскажи один случай из жизни")}
            <blockquote className="museum-caption">
              {selectedCaption}
            </blockquote>
            <p className="lead">
              Эта фраза про тебя? Объясни на одном примере.
            </p>
            <p className="museum-note">
              Время свободное. Записывать рассказ не нужно.
            </p>
            <button
              className="primary"
              onClick={() => act({ type: "STORY_DONE" })}
            >
              Рассказ закончен →
            </button>
          </>
        ) : phase === "question" ? (
          <>
            <span className="step-label">
              История {museum.exhibits.length + 1} / 6 · {roundSteps[phase]}
            </span>
            {title("Задай один вопрос об истории")}
            <blockquote className="museum-caption">
              {museumQuestions[Math.floor(museum.exhibits.length / 2)]}
            </blockquote>
            <p className="lead">
              Спроси это или задай свой вопрос. Дождись ответа.
            </p>
            <button
              className="primary"
              onClick={() => act({ type: "QUESTION_DONE" })}
            >
              Вопрос обсудили →
            </button>
          </>
        ) : phase === "label" ? (
          <>
            <span className="step-label">
              История {museum.exhibits.length + 1} / 6 · {roundSteps[phase]}
            </span>
            {title("Напиши новую подпись")}
            <blockquote className="museum-caption">
              {selectedCaption}
            </blockquote>
            <p className="lead">
              Что ты теперь понял об игроке {owner + 1}? Одно предложение.
            </p>
            <form
              className="museum-form"
              onSubmit={(event) => {
                event.preventDefault();
                act({ type: "PROPOSE" });
              }}
            >
              <label className="museum-field">
                <span>Новая подпись экспоната</span>
                <textarea
                  rows={3}
                  maxLength={280}
                  value={museum.label}
                  placeholder="Например: Ты любишь планировать, чтобы потом позволить себе спонтанность."
                  onChange={(event) =>
                    act({ type: "LABEL", text: event.target.value })
                  }
                />
              </label>
              <button
                className="primary"
                disabled={museum.label.trim().length < 3}
              >
                Показать подпись →
              </button>
            </form>
          </>
        ) : phase === "approve" ? (
          <>
            <span className="step-label">
              История {museum.exhibits.length + 1} / 6 · {roundSteps[phase]}
            </span>
            {title("Эта подпись про тебя?")}
            <div className="museum-comparison">
              <div>
                <span className="small-label">Первое впечатление</span>
                <p>{selectedCaption}</p>
              </div>
              <div>
                <span className="small-label">Новая подпись</span>
                <p>{museum.label}</p>
              </div>
            </div>
            <p className="lead">
              Если верно — сохрани. Если нет — скажи, что поправить.
            </p>
            <div className="museum-actions">
              <button
                className="primary"
                onClick={() => act({ type: "APPROVE" })}
              >
                Да, сохранить →
              </button>
              <button
                className="secondary"
                onClick={() => act({ type: "REVISE" })}
              >
                Поправить подпись
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="step-label">
              Шесть историй · Два автора · Одна выставка
            </span>
            {title("Музей открыт.")}
            <p className="lead">
              Вот что теперь стоит за вашими первыми впечатлениями.
            </p>
            <label className="museum-field museum-title-field">
              <span>Название вашей выставки</span>
              <input
                value={museum.title}
                maxLength={80}
                placeholder="Музей неверных впечатлений"
                onChange={(event) =>
                  act({ type: "TITLE", text: event.target.value })
                }
              />
            </label>
            <div className="museum-actions">
              <button className="primary" onClick={download}>
                Сохранить выставку ↓
              </button>
              <button className="secondary" onClick={leave}>
                На главную →
              </button>
            </div>
            <div className="museum-gallery">
              {museum.exhibits.map((item, i) => (
                <article
                  className="museum-exhibit"
                  key={`${item.owner}:${item.slot}`}
                >
                  <div className="museum-exhibit-number" aria-hidden="true">
                    0{i + 1}
                  </div>
                  <span className="small-label">
                    Игрок {item.owner + 1} · Экспонат 0{i + 1}
                  </span>
                  <div className="museum-before">
                    <span>Первое впечатление</span>
                    <p>{item.original}</p>
                  </div>
                  <div className="museum-after">
                    <span>Теперь видим точнее</span>
                    <h2>{item.revised}</h2>
                  </div>
                </article>
              ))}
            </div>
            <div className="museum-closing">
              <h2>Перед закрытием</h2>
              <p>
                Каждый выберите подпись, которая удивила сильнее всего. Что
                теперь хочется спросить у человека напротив?
              </p>
            </div>
            <div className="museum-host">
              <Portrait id={host.id} />
              <div>
                <span className="small-label">{host.name} закрывает вечер</span>
                <p>«{hostLine}»</p>
                {voice.available ? (
                  <button
                    className="text-button"
                    onClick={voice.replay}
                    disabled={!sound}
                  >
                    ↻ Реплика
                  </button>
                ) : null}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
