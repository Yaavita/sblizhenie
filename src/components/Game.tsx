import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { Dispatch } from "react";
import { Drawing } from "./Drawing";
import { buildLegacyDrawingStages, buildStages, games } from "../content/games";
import {
  getNarrator,
  interruptionPool,
  stageRemark,
} from "../content/narrators";
import type { InterruptionContent } from "../content/narrators";
import { availableInterruptions } from "../engine/director";
import { canInterrupt, reducer } from "../engine/engine";
import type { Action, Session } from "../engine/engine";
import type { Stage } from "../content/types";
import { saveSession, clearSession } from "../hooks/storage";
import { useNarratorVoice } from "../hooks/voice";
import { chime } from "../hooks/sound";
import { useDialogFocus } from "../hooks/useDialogFocus";
import { Header } from "./Header";
import { Portrait } from "./Portrait";
import { PrivateReveal } from "./PrivateReveal";
import { Auction } from "./Auction";
import { Conditions } from "./Conditions";
import { Museum } from "./Museum";
import { PartyGames } from "./PartyGames";
import { isPartyGame } from "../content/types";
export const clockText = (seconds: number) => {
  const rounded = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(rounded / 60)
    .toString()
    .padStart(2, "0")}:${(rounded % 60).toString().padStart(2, "0")}`;
};

function StageBody({
  stage,
  state,
  dispatch,
  onGate,
}: {
  stage: Stage;
  state: Session;
  dispatch: Dispatch<Action>;
  onGate: (g: boolean) => void;
}) {
  const [secretRead, setSecretRead] = useState(false);
  const [secretAgain, setSecretAgain] = useState(false);
  const isSecret = stage.kind === "secret" && !!stage.secret;
  const gated = isSecret && (!secretRead || secretAgain);
  useEffect(() => {
    if (isSecret) onGate(gated);
  }, [isSecret, gated, onGate]);
  const decision = state.decisions[stage.id];
  return (
    <>
      {gated ? (
        <PrivateReveal
          key={secretAgain ? "again" : "first"}
          one={stage.secret!.one}
          two={stage.secret!.two}
          onDone={() => {
            setSecretRead(true);
            setSecretAgain(false);
            onGate(false);
          }}
        />
      ) : (
        <>
          {!stage.lot ? <p className="stage-body">{stage.body}</p> : null}
          {stage.prompt ? (
            <div className="prompt">
              <p>{stage.prompt}</p>
            </div>
          ) : null}
          {stage.choices ? (
            <div
              className="choices"
              role="group"
              aria-label="Совместное решение"
            >
              {stage.choices.map((c, i) => (
                <button
                  key={c.id}
                  disabled={!!decision}
                  className={`choice ${decision === c.id ? "selected" : ""}`}
                  onClick={() =>
                    dispatch({
                      type: "CHOOSE",
                      stageId: stage.id,
                      choiceId: c.id,
                    })
                  }
                >
                  <span>0{i + 1}</span>
                  <strong>{c.label}</strong>
                  <span>{decision === c.id ? "✓" : "↗"}</span>
                </button>
              ))}
              {decision ? (
                <p className="choice-consequence" aria-live="polite">
                  {stage.choices.find((c) => c.id === decision)?.effect}
                </p>
              ) : null}
            </div>
          ) : null}
          {stage.lot ? (
            <Auction stage={stage} session={state} dispatch={dispatch} />
          ) : null}
          {isSecret ? (
            <button
              className="text-button"
              onClick={() => {
                setSecretAgain(true);
                onGate(true);
              }}
            >
              Прочитать свои сведения ещё раз
            </button>
          ) : null}
        </>
      )}
    </>
  );
}
function Summary({
  state,
  stages,
  onHome,
}: {
  state: Session;
  stages: Stage[];
  onHome: () => void;
}) {
  const game = games.find((g) => g.id === state.game)!;
  return (
    <main className="summary-screen entrance">
      <span className="step-label">{game.title}</span>
      <h1>Занавес.</h1>

      {state.game === "auction" ? (
        <section className="summary-results">
          <h2>Истории с молотка</h2>
          <div className="balances">
            <span>Игрок I · осталось {state.balances[0]}</span>
            <span>Игрок II · осталось {state.balances[1]}</span>
          </div>
          {state.auctionHistory.map((lot) => (
            <div className="result-row" key={lot.lotId}>
              <span>{lot.title}</span>
              <span>
                {lot.winner === null
                  ? "Не продан"
                  : `Игрок ${lot.winner + 1} слушал · ${lot.price} монет`}
              </span>
            </div>
          ))}
        </section>
      ) : null}
      {Object.keys(state.decisions).length ? (
        <section className="summary-results">
          <h2>Ваши решения</h2>
          {stages
            .filter((s) => state.decisions[s.id])
            .map((s) => (
              <div className="result-row" key={s.id}>
                <span>{s.title}</span>
                <span>
                  {
                    s.choices?.find((c) => c.id === state.decisions[s.id])
                      ?.label
                  }
                </span>
              </div>
            ))}
        </section>
      ) : null}
      <div className="summary-actions">
        <button
          className="primary"
          onClick={() => {
            clearSession();
            onHome();
          }}
        >
          Вернуться на главную →
        </button>
      </div>
    </main>
  );
}
export function Game(props: Parameters<typeof ScriptedGame>[0]) {
  if (props.initial.drawing) return <Drawing {...props} />;
  if (isPartyGame(props.initial.game)) return <PartyGames {...props} />;
  return props.initial.game === "museum" ? (
    <Museum {...props} />
  ) : (
    <ScriptedGame {...props} />
  );
}
function ScriptedGame({
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
  const [state, dispatch] = useReducer(reducer, initial);
  const [gated, setGated] = useState(initial.stageKind === "secret");
  const [journal, setJournal] = useState(false);
  const [conditionsOpen, setConditionsOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const lastBucket = useRef(Math.floor(initial.elapsed / 12));
  const previousStack = useRef(initial.stack.length);
  const previousRemaining = useRef(initial.remaining);
  const stages = useMemo(
    () =>
      state.game === "universes"
        ? buildLegacyDrawingStages(
            state.variant,
            state.intimacy,
            state.narrator,
          )
        : buildStages(
            state.game,
            state.variant,
            state.intimacy,
            state.decisions,
            state.narrator,
          ),
    [
      state.game,
      state.variant,
      state.intimacy,
      state.decisions,
      state.narrator,
    ],
  );
  const stage = stages[state.stageIndex];
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.stageId]);
  const host = getNarrator(state.narrator);
  const game = games.find((g) => g.id === state.game)!;
  const top = state.stack.at(-1);
  useDialogFocus(conditionsOpen ? "conditions" : ending ? "ending" : top?.id);
  const activeHost = top
    ? getNarrator(top.narrator)
    : state.auction && ["event", "reward"].includes(state.auction.phase)
      ? getNarrator("chance")
      : host;
  const economicEvent =
    state.auction && ["event", "reward"].includes(state.auction.phase)
      ? state.auction.event
      : null;
  const remark = stageRemark(
    state.narrator,
    state.game,
    state.stageIndex,
    state.stageId,
  );
  const spokenNarrator =
    top?.narrator ?? economicEvent?.narrator ?? state.narrator;
  const spokenText = top?.text ?? economicEvent?.text ?? remark;
  const voice = useNarratorVoice(
    spokenNarrator,
    spokenText,
    `${state.stageId}:${top?.id ?? (economicEvent ? "economy" : "stage")}`,
    sound && !state.finished,
    state.paused || gated || ending || conditionsOpen,
  );
  const blocked =
    gated || ending || conditionsOpen || state.finished || voice.speaking;
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    let last = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const delta = Math.min((now - last) / 1000, 2);
      last = now;
      if (!blocked && !document.hidden) dispatch({ type: "TICK", delta });
    }, 250);
    return () => clearInterval(interval);
  }, [blocked]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) dispatch({ type: "PAUSE" });
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  useEffect(() => {
    const persist = () => {
      if (!stateRef.current.finished) saveSession(stateRef.current);
    };
    const save = window.setInterval(persist, 1000);
    const beforeUnload = persist;
    window.addEventListener("pagehide", beforeUnload);
    return () => {
      clearInterval(save);
      window.removeEventListener("pagehide", beforeUnload);
      persist();
    };
  }, []);
  useEffect(() => {
    if (state.finished) clearSession();
  }, [state.finished]);
  useEffect(() => {
    if (state.stack.length > previousStack.current && sound) chime("event");
    previousStack.current = state.stack.length;
    if (state.remaining === 0 && previousRemaining.current > 0 && sound)
      chime("end");
    previousRemaining.current = state.remaining;
  }, [state.stack.length, state.remaining, sound]);
  useEffect(() => {
    if (blocked || state.paused || state.finished || state.game === "auction")
      return;
    if (top) {
      const event = interruptionPool.find((e) => e.id === top.id);
      const reply = event?.reply;
      if (
        reply &&
        state.stack.length === 1 &&
        top.duration - top.remaining >= reply.after &&
        canInterrupt(state, top.priority + 1)
      )
        dispatch({
          type: "INTERRUPT",
          event: {
            id: `${top.id}-reply`,
            narrator: reply.narrator,
            title: reply.cancelsParent
              ? "Позвольте возразить."
              : "Маленькое дополнение.",
            text: reply.text,
            duration: 9,
            remaining: 9,
            priority: top.priority + 1,
            cancelsParent: reply.cancelsParent,
            operation: reply.operation,
            targetConditionId: top.conditionId,
          },
        });
      return;
    }
    const bucket = Math.floor(state.elapsed / 12);
    if (bucket === lastBucket.current) return;
    lastBucket.current = bucket;
    if (
      !canInterrupt(state) ||
      state.stageKind === "verdict" ||
      state.auctionHistory.some((lot) => lot.lotId === state.currentLotId)
    )
      return;
    if (Math.random() > 0.22 * host.frequency) return;
    const pool = availableInterruptions(state);
    const event = pool[Math.floor(Math.random() * pool.length)];
    if (event) interrupt(event);
  });
  function interrupt(event: InterruptionContent) {
    const targets = state.conditions.filter(
      (c) => c.status === "active" && c.narrator !== event.narrator,
    );
    const stageTargets = targets.filter(
      (c) => c.scope === "stage" && c.stageId === state.stageId,
    );
    const target =
      event.target === "host"
        ? targets.find((c) => c.scope === "game")
        : (stageTargets.at(-1) ??
          targets.filter((c) => c.scope === "game").at(-1));
    dispatch({
      type: "INTERRUPT",
      event: {
        ...event,
        remaining: event.duration,
        targetConditionId: target?.id,
      },
    });
  }
  function openConditions() {
    dispatch({ type: "PAUSE" });
    setConditionsOpen(true);
  }
  function next() {
    if (!stage) return;
    if (state.auction?.phase === "preview") {
      dispatch({ type: "AUCTION", action: { type: "OPEN" } });
      return;
    }
    setGated(false);
    if (state.stageIndex + 1 >= stages.length) {
      dispatch({ type: "FINISH" });
    } else {
      const nextStage = stages[state.stageIndex + 1];
      setGated(nextStage.kind === "secret");
      dispatch({
        type: "NEXT",
        stage: nextStage,
      });
    }
  }
  const decisionRequired =
    !!stage?.choices?.length && !state.decisions[stage.id];
  const auctionRequired =
    !!stage?.lot &&
    state.auction?.phase !== "done" &&
    state.auction?.phase !== "preview";
  if (!stage || stage.id !== state.stageId)
    return (
      <div className="app-shell centered">
        <h1>Сохранение устарело.</h1>
        <p>Начните новый вечер — сценарий изменился после сохранения.</p>
        <button
          className="primary"
          onClick={() => {
            clearSession();
            onHome();
          }}
        >
          На главную
        </button>
      </div>
    );
  return (
    <div
      className={`app-shell game-shell theme-${activeHost.id} ${state.game === "auction" ? "auction-game" : ""}`}
    >
      <Header
        sound={sound}
        onSound={onSound}
        onHome={() => (state.finished ? onHome() : setEnding(true))}
        middle={
          <div className="game-header-progress">
            <div className="progress-dots">
              {stages.map((s, i) => (
                <span
                  key={s.id}
                  className={
                    i === state.stageIndex
                      ? "current"
                      : i < state.stageIndex
                        ? "done"
                        : ""
                  }
                />
              ))}
            </div>
            <span>
              {stage?.lot
                ? `Лот ${state.stageIndex} / 10`
                : `${String(state.stageIndex + 1).padStart(2, "0")} / ${stages.length}`}{" "}
              · {game.title}
            </span>
          </div>
        }
      />
      {state.finished ? (
        <Summary state={state} stages={stages} onHome={onHome} />
      ) : (
        <>
          <div className="game-toolbar">
            <button className="text-button" onClick={openConditions}>
              Условия
            </button>
            <button
              className="text-button"
              onClick={() => setJournal(!journal)}
              aria-expanded={journal}
            >
              {journal ? "Закрыть журнал" : "Журнал вечера"} <span>↗</span>
            </button>

            <button className="text-button" onClick={() => setEnding(true)}>
              Закончить вечер
            </button>
          </div>
          <main className="play-layout">
            <aside className="host-sidebar">
              <Portrait
                key={activeHost.id}
                id={activeHost.id}
                className="entrance"
              />
              <h2>{activeHost.name}</h2>

              <blockquote>«{spokenText}»</blockquote>
              {voice.available ? (
                <button
                  className="text-button voice-replay"
                  disabled={!sound || state.paused}
                  onClick={voice.replay}
                >
                  ↻ Реплика
                </button>
              ) : null}
            </aside>
            <section className="stage-main" aria-label="Текущий этап">
              <div className="stage-topline">
                <span className="small-label">
                  {stage.kind === "draw"
                    ? "Бумага, карандаши и воображение"
                    : stage.kind === "auction"
                      ? stage.title
                      : stage.kind === "secret"
                        ? "Секретный этап"
                        : stage.kind === "verdict"
                          ? "Время решения"
                          : stage.kind === "choice"
                            ? "Решение за вами"
                            : "Разговор за столом"}
                </span>
                <span className="target-label">
                  {stage.target === "one"
                    ? "Игрок I · второй продолжает рисовать"
                    : stage.target === "two"
                      ? "Игрок II · первый продолжает рисовать"
                      : "Вместе"}
                </span>
              </div>
              <h1 key={`title-${stage.id}`} className="stage-title entrance">
                {stage.lot?.title || stage.title}
              </h1>
              <StageBody
                key={`body-${stage.id}`}
                stage={stage}
                state={state}
                dispatch={dispatch}
                onGate={setGated}
              />
              {state.conditions.some(
                (c) =>
                  c.scope === "stage" &&
                  c.stageId === state.stageId &&
                  c.status === "active",
              ) ? (
                <button className="live-conditions" onClick={openConditions}>
                  <span>Также действует</span>
                  {state.conditions
                    .filter(
                      (c) =>
                        c.scope === "stage" &&
                        c.stageId === state.stageId &&
                        c.status === "active",
                    )
                    .map((c) => (
                      <strong key={c.id}>{c.title}</strong>
                    ))}
                  <span>↗</span>
                </button>
              ) : null}
              <div className="stage-controls">
                <button
                  className="secondary"
                  disabled={gated}
                  onClick={() =>
                    dispatch({ type: state.paused ? "RESUME" : "PAUSE" })
                  }
                >
                  {state.paused ? "▶ Продолжить" : "Ⅱ Пауза"}
                </button>
                {!stage.lot ? (
                  <button className="text-button" onClick={next}>
                    Пропустить этап
                  </button>
                ) : null}
                <button
                  className="primary"
                  disabled={
                    decisionRequired ||
                    auctionRequired ||
                    gated ||
                    (state.paused && !!stage.lot)
                  }
                  onClick={next}
                >
                  {state.stageIndex === stages.length - 1
                    ? "Завершить вечер"
                    : "Дальше"}{" "}
                  →
                </button>
              </div>
            </section>
            <aside className="timer-panel">
              <span className="small-label">
                {gated
                  ? "Ждём друг друга"
                  : state.paused
                    ? "Пауза"
                    : voice.speaking
                      ? "Говорит ведущий"
                      : state.auction?.phase === "preview"
                        ? "Перед торгами"
                        : state.auction?.phase === "bidding"
                          ? `На ход игроку ${state.auction.turn + 1}`
                          : state.auction?.phase === "reward"
                            ? "Решение за вами"
                            : state.remaining === 0
                              ? "Можно продолжать"
                              : "Осталось"}
              </span>
              <div
                className={`timer ${state.paused ? "paused" : ""}`}
                role="timer"
                aria-label={`Осталось ${clockText(state.remaining)}`}
              >
                {state.auction?.phase === "preview"
                  ? "∞"
                  : (state.auction &&
                        ["done", "reward"].includes(state.auction.phase)) ||
                      (state.auction?.event?.type === "swap" &&
                        state.auction.phase === "event")
                    ? "—"
                    : clockText(state.remaining)}
              </div>
              <div
                className={`time-line ${state.auction?.phase === "preview" ? "untimed" : ""}`}
              >
                <span
                  style={{
                    width: `${Math.min(100, (state.remaining / (state.auction?.phase === "bidding" ? 30 : state.auction ? 90 : stage.seconds)) * 100)}%`,
                  }}
                />
              </div>
              {gated ? (
                <p>Сначала прочитайте личные сведения или завершите ставки.</p>
              ) : state.remaining === 0 && !state.auction ? (
                <p>Нажмите «Дальше», когда закончите.</p>
              ) : null}
            </aside>
          </main>
          {top ? (
            <div
              className={`interruption-backdrop entrance-${activeHost.entrance}`}
            >
              <section
                className="interruption"
                role="dialog"
                aria-modal="true"
                aria-labelledby="interruption-title"
                key={top.id}
              >
                <div className="interruption-portrait">
                  <Portrait id={top.narrator} />
                </div>
                <div className="interruption-copy">
                  <span className="small-label">
                    {state.stack.length > 1
                      ? `${getNarrator(state.stack[0].narrator).name}, вас перебивают`
                      : "Слово перехватывает"}
                  </span>
                  <span className="interruption-name">{activeHost.name}</span>
                  <h2 id="interruption-title">{top.title}</h2>
                  <p>{top.text}</p>
                  <div className="interruption-status">
                    <strong>{clockText(top.remaining)}</strong>
                    <span>
                      Игра на паузе · {clockText(state.remaining)}
                      {state.stack.length > 1 ? (
                        <>
                          <br />
                          Предыдущее вмешательство ·{" "}
                          {clockText(state.stack[0].remaining)}
                        </>
                      ) : null}
                    </span>
                  </div>
                  <div className="interruption-actions">
                    <button className="text-button" onClick={openConditions}>
                      Условия
                    </button>
                    <button
                      className="primary"
                      onClick={() => dispatch({ type: "END_INTERRUPTION" })}
                    >
                      {top.cancelsParent
                        ? "Отменить затею и вернуться →"
                        : "Выполнено →"}
                    </button>
                    <button
                      className="text-button"
                      onClick={() =>
                        dispatch({ type: state.paused ? "RESUME" : "PAUSE" })
                      }
                    >
                      {state.paused ? "Продолжить" : "Пауза"}
                    </button>
                    <button
                      className="text-button"
                      onClick={() =>
                        dispatch({ type: "CANCEL_ALL_INTERRUPTION" })
                      }
                    >
                      Пропустить всё
                    </button>
                  </div>
                </div>
              </section>
            </div>
          ) : null}
          {journal ? (
            <aside className="journal" aria-label="Журнал вечера">
              <div>
                <h2>Следы вечера</h2>
                <button
                  className="text-button"
                  onClick={() => setJournal(false)}
                  aria-label="Закрыть журнал"
                >
                  ✕
                </button>
              </div>
              {state.log.map((entry) => (
                <div
                  className={`journal-entry log-${entry.type}`}
                  key={entry.id}
                >
                  <span>{String(entry.id).padStart(2, "0")}</span>
                  <p>
                    {entry.type === "choice"
                      ? "Вы приняли совместное решение."
                      : entry.text}
                  </p>
                </div>
              ))}
            </aside>
          ) : null}
          {conditionsOpen ? (
            <Conditions
              state={state}
              stages={stages}
              onClose={() => setConditionsOpen(false)}
            />
          ) : null}
          {ending ? (
            <div className="modal-backdrop">
              <section
                className="confirm-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="ending-title"
              >
                <h2 id="ending-title">Закончить игру?</h2>

                <button
                  className="primary"
                  onClick={() => {
                    dispatch({ type: "FINISH" });
                    setEnding(false);
                  }}
                >
                  Завершить
                </button>
                <button
                  className="text-button"
                  onClick={() => setEnding(false)}
                >
                  Остаться в игре
                </button>
              </section>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
