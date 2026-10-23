import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  drawingFallback,
  drawingFormat,
  drawingPlan,
  drawingRules,
  drawingTheme,
} from "../content/drawing";
import { getNarrator, narrators } from "../content/narrators";
import { reducer, type Session } from "../engine/engine";
import { drawingFeed, drawingText } from "../engine/drawing";
import { saveSession } from "../hooks/storage";
import { chime } from "../hooks/sound";
import { Header } from "./Header";
import { Portrait } from "./Portrait";
import { PlayerTurn } from "./PlayerTurn";
import { DrawingOutline } from "./DrawingOutline";

const clock = (seconds: number) =>
  `${Math.floor(Math.ceil(seconds) / 60)}:${String(Math.ceil(seconds) % 60).padStart(2, "0")}`;
export function Drawing({
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
  const state = session.drawing!;
  const config = useMemo(
    () => ({
      host: session.narrator,
      variant: session.variant,
      intimacy: session.intimacy,
    }),
    [session.narrator, session.variant, session.intimacy],
  );
  const plan = useMemo(() => drawingPlan(config), [config]);
  const feed = drawingFeed(state, plan),
    cue = plan[state.cue],
    latest = feed.at(-1);
  const host = getNarrator(config.host),
    theme = drawingTheme(config.host, config.variant);
  const complete = state.phase === "complete";
  const end = useRef<HTMLDivElement>(null),
    follow = useRef(true);
  const [unread, setUnread] = useState(false);
  const previous = useRef(latest?.id);
  useEffect(() => {
    saveSession(session);
  }, [session]);
  useEffect(() => {
    const onScroll = () => {
      follow.current =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 180;
      if (follow.current) setUnread(false);
    };
    const onHidden = () => {
      if (document.hidden) dispatch({ type: "PAUSE" });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, []);
  useEffect(() => {
    if (session.paused || state.phase !== "running") return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      dispatch({ type: "TICK", delta: Math.min((now - last) / 1000, 2) });
      last = now;
    }, 250);
    return () => window.clearInterval(timer);
  }, [session.paused, state.phase]);
  useEffect(() => {
    if (!latest || previous.current === latest.id) return;
    if (sound) chime("event");
    previous.current = latest.id;
    if (follow.current)
      end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    else setUnread(true);
  }, [latest?.id, sound]);
  useEffect(() => {
    if (initial.drawing?.phase !== "intro")
      end.current?.scrollIntoView({ block: "end" });
  }, [initial]);
  useEffect(() => {
    if (complete && follow.current)
      end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [complete]);
  function leave() {
    saveSession({ ...session, paused: true });
    onHome();
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([drawingText(state, config)], {
        type: "text/plain;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "dva-risunka.txt";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="app-shell drawing-shell">
      <Header
        sound={sound}
        onSound={onSound}
        onHome={leave}
        middle={<span>Параллельные вселенные</span>}
      />
      {state.phase === "intro" ? (
        <main className="drawing-intro entrance">
          <span className="step-label">
            Около часа · Одна тема, два рисунка
          </span>
          <h1>
            Одно место.
            <br />
            <em>Совсем разное наполнение.</em>
          </h1>
          <div className="drawing-preparation">
            <section>
              <strong>01 / Нарисуйте основу</strong>
              <p>
                По листу А4 или А3 и ручке каждому. Ведущий задаст общую сцену,
                а пример покажет, как оставить место для вещей.
              </p>
            </section>
            <section>
              <strong>02 / Добавляйте своё</strong>
              <p>
                Вы оба рисуете всё время. У каждого свои задания: какую вещь
                добавить, решаете самостоятельно. Затем придут ещё четыре
                ведущих.
              </p>
            </section>
            <section>
              <strong>03 / Угадайте предметы</strong>
              <p>
                До финала не показывайте рисунки и не объясняйте свой выбор.
                Потом попробуете найти на чужом рисунке ответы на задания.
              </p>
            </section>
          </div>
          <p className="drawing-rule">
            {drawingRules} Всё идёт автоматически: 8 минут на начало, по 11
            минут на задания каждого нового ведущего и 6 минут на угадывание.
          </p>
          <section className="drawing-host-choice">
            <span className="small-label">Кто задаёт основу</span>
            <div className="drawing-host-buttons">
              {narrators.map((n) => (
                <button
                  key={n.id}
                  className={n.id === host.id ? "selected" : ""}
                  aria-pressed={n.id === host.id}
                  onClick={() =>
                    dispatch({
                      type: "DRAWING_CONFIG",
                      narrator: n.id,
                      variant: config.variant,
                    })
                  }
                >
                  {n.name}
                </button>
              ))}
            </div>
            <div className="drawing-preview">
              <DrawingOutline kind={theme.outline} />
              <section>
                <h2>{theme.title}</h2>
                <p>{theme.first}</p>
                <p className="muted">{theme.interest}</p>
              </section>
            </div>
            <p className="drawing-format-note">
              {drawingFormat} {drawingFallback}
            </p>
            <div className="drawing-intro-actions">
              <button
                className="primary"
                onClick={() => {
                  if (session.paused) dispatch({ type: "RESUME" });
                  dispatch({ type: "DRAWING", action: { type: "START" } });
                }}
              >
                Начать рисовать →
              </button>
              <button
                className="text-button"
                onClick={() =>
                  dispatch({
                    type: "DRAWING_CONFIG",
                    narrator: host.id,
                    variant: config.variant + 1,
                  })
                }
              >
                Другая тема ↻
              </button>
              <span>Новые реплики — текст и короткий звуковой сигнал.</span>
            </div>
          </section>
        </main>
      ) : (
        <main className="drawing-layout">
          <aside className="drawing-sidebar">
            <span className="step-label">
              {complete
                ? "Вечер завершён"
                : cue.kind === "gallery"
                  ? "Угадывание"
                  : cue.chapter === 0
                    ? "Рисуем основу"
                    : `Ведущий ${cue.chapter} / 4`}
            </span>
            <h2>{theme.title}</h2>
            <p>
              {cue.kind === "gallery"
                ? "Автор молча показывает. Второй ищет предметы по заданиям, затем автор объясняет."
                : "Оба рисуете одну тему. У каждого своя картина и свои предметы."}
            </p>
            {!complete && cue.kind !== "gallery" ? (
              <div className="drawing-current-roles">
                <strong>Рисуете оба</strong>
                <span>Задания игрокам — справа</span>
              </div>
            ) : null}
            {!complete ? (
              <div
                className="drawing-timer"
                role="timer"
                aria-label="Время на текущую часть"
              >
                <strong>{clock(cue.seconds - state.elapsed)}</strong>
                <span>
                  {session.paused
                    ? "Пауза"
                    : cue.kind === "gallery"
                      ? "Ищите предметы"
                      : "Спокойно рисуйте"}
                </span>
              </div>
            ) : null}
            <div className="drawing-sidebar-actions">
              {!complete ? (
                <button
                  className="secondary"
                  onClick={() =>
                    dispatch({ type: session.paused ? "RESUME" : "PAUSE" })
                  }
                >
                  {session.paused ? "Продолжить рисовать →" : "Ⅱ Пауза"}
                </button>
              ) : null}
              <button className="text-button" onClick={leave}>
                Сохранить и выйти ↗
              </button>
            </div>
            <p className="drawing-sidebar-rule">
              Одна картина на всю игру. Добавляйте вещи в свободное место. Пока
              не показывайте свой лист друг другу.
            </p>
            <p className="drawing-sidebar-hint">
              Все прошлые задания остаются в ленте. Их можно прочитать,
              прокрутив вверх.
            </p>
            {session.paused && !complete ? (
              <p className="drawing-pause-note" role="status">
                Время остановлено. Ленту можно читать.
              </p>
            ) : null}
            {unread ? (
              <button
                className="primary drawing-unread"
                onClick={() => {
                  follow.current = true;
                  setUnread(false);
                  end.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "end",
                  });
                }}
              >
                Новое задание ↓
              </button>
            ) : null}
          </aside>
          <div className="drawing-feed">
            <p className="drawing-feed-note">
              Игрок 1 всегда слева · Игрок 2 всегда справа · Новые задания
              появляются сами
            </p>
            <div role="status" className="sr-only">
              {latest
                ? `${getNarrator(latest.narrator).name}: ${latest.title}`
                : ""}
            </div>
            {feed.map((entry) => {
              const speaker = getNarrator(entry.narrator);
              return (
                <article
                  key={entry.id}
                  className={`drawing-entry ${entry.kind} ${entry.id === latest?.id ? "latest" : ""}`}
                  data-entry={entry.id}
                  style={{ "--speaker": speaker.color } as React.CSSProperties}
                >
                  <div className="drawing-speaker">
                    <Portrait id={speaker.id} />
                    <div>
                      <strong>{speaker.name}</strong>
                      <span>
                        {entry.kind === "main"
                          ? "Общая основа для двух картин"
                          : entry.kind === "gallery"
                            ? "Покажите, что получилось"
                            : "Добавляет каждому своё задание"}
                      </span>
                    </div>
                  </div>
                  <h3>{entry.title}</h3>
                  {entry.kind === "main" ? (
                    <DrawingOutline kind={theme.outline} />
                  ) : null}
                  {entry.kind === "gallery" && entry.player !== undefined ? (
                    <PlayerTurn
                      active={entry.player}
                      roles={
                        entry.player === 0
                          ? [
                              "Угадывает предметы",
                              "Молча показывает, потом объясняет",
                            ]
                          : [
                              "Молча показывает, потом объясняет",
                              "Угадывает предметы",
                            ]
                      }
                    />
                  ) : null}
                  <p>{entry.text}</p>
                  {entry.assignments ? (
                    <div className="drawing-task-pair">
                      {entry.assignments.map((task, player) => (
                        <section
                          key={player}
                          aria-label={`Задание игрока ${player + 1}`}
                        >
                          <strong>Игрок {player + 1}</strong>
                          <p>{task}</p>
                        </section>
                      ))}
                    </div>
                  ) : null}
                  {entry.guesses ? (
                    <section className="drawing-guesses">
                      <h4>Какие предметы были ответами на эти задания?</h4>
                      <ol>
                        {entry.guesses.map((g) => (
                          <li key={g.narrator}>
                            <span>{getNarrator(g.narrator).name}</span>
                            <p>{g.question}</p>
                          </li>
                        ))}
                      </ol>
                    </section>
                  ) : null}
                </article>
              );
            })}
            {complete ? (
              <section className="drawing-result">
                <span className="step-label">
                  Одна тема — две разные картины
                </span>
                <h2>У каждого оказалось своё.</h2>
                <p>
                  Какая вещь оказалась самой неожиданной? Дайте картинам
                  название и сохраните то, что хочется запомнить.
                </p>
                <label>
                  Название вашей пары рисунков
                  <input
                    value={state.title}
                    maxLength={80}
                    placeholder="Например: «Наш странный отель»"
                    onChange={(e) =>
                      dispatch({
                        type: "DRAWING",
                        action: { type: "TITLE", text: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  Что хочется запомнить
                  <textarea
                    rows={3}
                    value={state.note}
                    maxLength={400}
                    onChange={(e) =>
                      dispatch({
                        type: "DRAWING",
                        action: { type: "NOTE", text: e.target.value },
                      })
                    }
                  />
                </label>
                <div className="drawing-intro-actions">
                  <button className="primary" onClick={download}>
                    Скачать историю · TXT ↓
                  </button>
                  <button className="text-button" onClick={leave}>
                    На главную →
                  </button>
                </div>
              </section>
            ) : null}
            <div ref={end} />
          </div>
        </main>
      )}
    </div>
  );
}
