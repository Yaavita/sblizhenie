import { useEffect, useState } from "react";
import { Setup } from "./components/Setup";
import type { SetupResult } from "./components/Setup";
import { Header } from "./components/Header";
import { Portrait } from "./components/Portrait";
import { Cast } from "./components/Cast";
import { Game } from "./components/Game";
import { narrators } from "./content/narrators";
import { buildStages } from "./content/games";
import { initialSession } from "./engine/engine";
import type { Session } from "./engine/engine";
import { clearSession, readSaved } from "./hooks/storage";
import { unlockVoice } from "./hooks/voice";
import { chime } from "./hooks/sound";
export default function App() {
  const [screen, setScreen] = useState<"home" | "setup" | "game" | "cast">(
    "home",
  );
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);
  const [saved, setSaved] = useState(readSaved);
  const [session, setSession] = useState<Session | null>(null);
  const [sound, setSound] = useState(() => {
    try {
      return localStorage.getItem("third-wheel-sound") !== "off";
    } catch {
      return true;
    }
  });
  const [rules, setRules] = useState(false);
  function toggleSound() {
    setSound((v) => {
      try {
        localStorage.setItem("third-wheel-sound", v ? "off" : "on");
      } catch {
        /* Optional settings. */
      }
      if (!v) {
        unlockVoice();
        chime();
      }
      return !v;
    });
  }
  function start(config: SetupResult) {
    if (sound) unlockVoice();
    const stages = buildStages(
      config.game,
      config.variant,
      config.intimacy,
      {},
      config.narrator,
    );
    const stage = stages[0];
    const dealer =
      config.game === "auction"
        ? (stages.find((s) => s.lot)?.lot?.narrator ?? config.narrator)
        : config.narrator;
    const next = initialSession(
      config.game,
      dealer,
      config.variant,
      config.intimacy,
      stage,
    );
    setSession(next);
    setScreen("game");
    if (sound) chime("event");
  }
  function home() {
    window.history.replaceState(null, "", window.location.pathname);
    setScreen("home");
    setSaved(readSaved());
  }
  if (screen === "game" && session)
    return (
      <Game
        key={`${session.game}-${session.variant}`}
        initial={session}
        sound={sound}
        onSound={toggleSound}
        onHome={home}
      />
    );
  return (
    <div className="app-shell">
      <Header sound={sound} onSound={toggleSound} onHome={home} />
      {screen === "setup" ? (
        <Setup onStart={start} onHome={home} />
      ) : screen === "cast" ? (
        <Cast onBack={home} />
      ) : (
        <main className="home entrance">
          <div className="home-copy">
            <h1>
              Хороший вечер.
              <br />
              Вы, я и{" "}
              <em>
                кто-то
                <br />
                лишний.
              </em>
            </h1>
            <p className="lead">
              Игры для двоих, которым есть что
              <br className="desktop-break" /> узнать друг о друге.
            </p>
            <div className="home-actions">
              <button className="primary" onClick={() => setScreen("setup")}>
                Устроить вечер <span>↗</span>
              </button>
              {saved && !saved.finished ? (
                <button
                  className="secondary"
                  onClick={() => {
                    if (sound) unlockVoice();
                    setSession(saved);
                    setScreen("game");
                  }}
                >
                  Продолжить вечер →
                </button>
              ) : null}
            </div>
            <button
              className="text-button"
              onClick={() => setRules(!rules)}
              aria-expanded={rules}
            >
              {rules ? "−" : "+"} Как всё устроено
            </button>
            {rules ? (
              <div className="rules">
                <p>
                  Вы по очереди выбираете настроение. Мы подбираем игру, ведущий
                  появляется сам. В аукционе каждый лот выставляет кто-то новый.
                  Остальные могут вмешаться, поспорить и отменить чужую затею.
                </p>
                <p>
                  Приготовьте бумагу и карандаши. Задания рассчитаны на 20–30
                  минут.
                </p>
                <p>
                  Предпочтения скрыты на экране, пока выбирает другой. На личных
                  этапах второй игрок отворачивается.
                </p>

                {saved ? (
                  <button
                    className="text-button"
                    onClick={() => {
                      clearSession();
                      setSaved(null);
                    }}
                  >
                    Удалить сохранённый вечер
                  </button>
                ) : null}
              </div>
            ) : null}
            <div className="home-meta">
              <span>2 человека</span>
              <span>5 игр</span>
              <span>5 характеров</span>
            </div>
          </div>
          <div className="home-ensemble">
            <div className="ensemble-topline">
              <span>Знакомьтесь, ваши ведущие</span>
              <span>01—05</span>
            </div>
            <div className="ensemble-portraits">
              {narrators.map((n, i) => (
                <div className={`ensemble-character ensemble-${i}`} key={n.id}>
                  <Portrait id={n.id} />
                  <span>{n.name}</span>
                </div>
              ))}
            </div>
            <div className="ensemble-note">
              <span className="tiny-star">✳</span>
              <p>
                Они знают, с чего начать.
                <br />
                <em>Но не обещают вести себя прилично.</em>
              </p>
            </div>
            <button className="text-button" onClick={() => setScreen("cast")}>
              Кто эти люди? ↗
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
