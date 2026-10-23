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
  const feed = drawingFeed(state, plan);
  const cue = plan[state.cue],
    latest = feed.at(-1);
  const host = getNarrator(config.host),
    theme = drawingTheme(config.host, config.variant);
  const end = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const [unread, setUnread] = useState(false);
  const previous = useRef(latest?.id);
  const complete = state.phase === "complete";

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
            Около часа · Каждый рисует на своём листе
          </span>
          <h1>
            Два мира.
            <br />
            <em>У ведущих свои планы.</em>
          </h1>
          <div className="drawing-preparation">
            <section>
              <strong>01 / Подготовьтесь</strong>
              <p>
                По листу А4 или А3 и ручке каждому. Один рассказывает, второй
                рисует его мир. Потом роли меняются сами. Всего около 58 минут.
              </p>
            </section>
            <section>
              <strong>02 / Оставьте место</strong>
              <p>
                Начните с трети листа. Рисуйте небольшими значками. Свой лист до
                финала не показывайте: в конце будете угадывать, что на нём.
              </p>
            </section>
            <section>
              <strong>03 / Просто рисуйте</strong>
              <p>
                Ведущие вмешаются прямо во время рисования. Поправки — только
                текущему рисующему. Всё идёт само, подтверждать задания не
                нужно.
              </p>
            </section>
          </div>
          <div className="drawing-format">
            <svg
              viewBox="0 0 250 145"
              role="img"
              aria-label="Пример: вид сверху, открытые комнаты с предметами, вокруг свободное место"
            >
              <rect
                x="8"
                y="8"
                width="234"
                height="129"
                rx="3"
                strokeDasharray="5 5"
              />
              <path d="M30 32h112v82H30zM86 32v82M30 75h56" />
              <rect x="43" y="43" width="26" height="17" />
              <circle cx="58" cy="94" r="8" />
              <path d="M106 58h19v30h-19zM151 75h40m-7-7 8 7-8 7" />
              <text x="162" y="111">
                место для нового
              </text>
            </svg>
            <section>
              <h2>Как именно рисовать?</h2>
              <p>{drawingFormat}</p>
              <p>{drawingFallback}</p>
            </section>
          </div>
          <p className="drawing-rule">
            <strong>Все штрихи остаются.</strong> {drawingRules}
          </p>
          <section className="drawing-host-choice">
            <span className="small-label">Кто задаёт тему</span>
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
            <h2>{theme.title}</h2>
            <p>{theme.interest}</p>
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
                : cue.chapter === 3
                  ? "Показ рисунков"
                  : `Этап ${cue.chapter + 1} / 3`}
            </span>
            <h2>{theme.title}</h2>
            <p>
              {cue.chapter === 3
                ? "Автор молча показывает. Второй угадывает детали, затем автор объясняет."
                : `Вы рисуете ${theme.subject}. У каждого свой лист; до финала держите его при себе.`}
            </p>
            {cue.artist !== undefined && !complete ? (
              <div className="drawing-current-roles">
                <strong>Игрок {cue.artist + 1} рисует</strong>
                <span>Игрок {2 - cue.artist} рассказывает</span>
                <p>{cue.story}</p>
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
                    : cue.kind === "quiet"
                      ? "Спокойно дорисовываем"
                      : cue.kind === "gallery"
                        ? "Время поговорить"
                        : "Рисуйте по заданию"}
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
              Не стирайте. Меняйте смысл дорисовкой. Маленький значок, стрелка
              или подпись тоже подходят.
            </p>
            <p className="drawing-sidebar-hint">
              Задания и все поправки — справа. Предыдущие можно прочитать,
              прокрутив страницу вверх.
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
                Новая реплика ↓
              </button>
            ) : null}
          </aside>
          <div className="drawing-feed">
            <p className="drawing-feed-note">
              Один лист на всю игру · Поправки — текущему рисующему · Роли
              меняются сами
            </p>
            <div role="status" className="sr-only">
              {latest
                ? `${getNarrator(latest.narrator).name}: ${latest.title}`
                : ""}
            </div>
            {feed.map((entry, i) => {
              const speaker = getNarrator(entry.narrator),
                first = i === 0 || feed[i - 1].chapter !== entry.chapter;
              return (
                <div key={entry.id}>
                  {first ? (
                    <h2 className="drawing-chapter">
                      {entry.chapter === 3
                        ? "Покажите друг другу, что получилось"
                        : `0${entry.chapter + 1} / Большой этап`}
                    </h2>
                  ) : null}
                  <article
                    className={`drawing-entry ${entry.kind} ${entry.comment ? "drawing-comment" : ""} ${entry.id === latest?.id ? "latest" : ""}`}
                    data-entry={entry.id}
                    style={
                      { "--speaker": speaker.color } as React.CSSProperties
                    }
                  >
                    <div className="drawing-speaker">
                      <Portrait id={speaker.id} />
                      <div>
                        <strong>{speaker.name}</strong>
                        <span>
                          {entry.comment
                            ? `Последнее слово · Рисунок игрока ${(entry.artist ?? 0) + 1}`
                            : entry.kind === "main"
                              ? `Основное задание · Рисует игрок ${(entry.artist ?? 0) + 1}`
                              : entry.kind === "revision"
                                ? `Поправка · Рисунок игрока ${(entry.artist ?? 0) + 1}`
                                : entry.kind === "gallery"
                                  ? "Показ и разговор"
                                  : `Вмешивается · Рисунок игрока ${(entry.artist ?? 0) + 1}`}
                        </span>
                      </div>
                    </div>
                    {!entry.comment ? <h3>{entry.title}</h3> : null}
                    {entry.kind === "gallery" && entry.player !== undefined ? (
                      <PlayerTurn
                        active={entry.player}
                        roles={
                          entry.player === 0
                            ? [
                                "Угадывает детали",
                                "Молча показывает, потом объясняет",
                              ]
                            : [
                                "Молча показывает, потом объясняет",
                                "Угадывает детали",
                              ]
                        }
                      />
                    ) : null}
                    {entry.kind === "main" && entry.artist !== undefined ? (
                      <>
                        <PlayerTurn
                          active={entry.artist}
                          roles={
                            entry.artist === 0
                              ? [
                                  "Рисует, слушая рассказ",
                                  "Рассказывает, не глядя на рисунок",
                                ]
                              : [
                                  "Рассказывает, не глядя на рисунок",
                                  "Рисует, слушая рассказ",
                                ]
                          }
                        />
                        <div className="drawing-story">
                          <strong>Игрок {2 - entry.artist}, расскажи:</strong>
                          <p>{entry.story}</p>
                        </div>
                      </>
                    ) : null}
                    <p>{entry.text}</p>
                    {entry.changed ? (
                      <span className="drawing-amended">
                        Правило изменено следующей репликой. Все штрихи
                        сохраняются.
                      </span>
                    ) : null}
                    {entry.kind === "addition" ||
                    (entry.kind === "revision" && !entry.comment) ? (
                      <span className="drawing-time-note">
                        На эту дорисовку выделено 3 минуты. Рассказчик может
                        подсказать идею, рисующий решает, как её изобразить.
                      </span>
                    ) : null}
                  </article>
                </div>
              );
            })}
            {cue.kind === "quiet" && !complete ? (
              <div className="drawing-quiet">
                <strong>Теперь спокойно дорисовывайте.</strong>
                <p>{cue.text}</p>
              </div>
            ) : null}
            {complete ? (
              <section className="drawing-result">
                <span className="step-label">
                  Результат — два рисунка с общей историей
                </span>
                <h2>Такого в начале никто не планировал.</h2>
                <p>
                  Сравните, какими разными получились ваши миры после рассказов
                  и споров. Выберите по одной любимой переделке.
                </p>
                <label>
                  Название вашей пары рисунков
                  <input
                    value={state.title}
                    maxLength={80}
                    placeholder="Например: «Верёвки всё-таки пригодились»"
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
