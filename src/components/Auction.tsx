import type { Dispatch } from "react";
import type { Stage } from "../content/types";
import type { Action, Session } from "../engine/engine";
import { Portrait } from "./Portrait";
export function Auction({
  stage,
  session,
  dispatch,
}: {
  stage: Stage;
  session: Session;
  dispatch: Dispatch<Action>;
}) {
  const round = session.auction;
  if (!round) return null;
  const act = (action: Extract<Action, { type: "AUCTION" }>["action"]) =>
    dispatch({ type: "AUCTION", action });
  const locked = session.paused;
  const event = round.event;
  const record = session.auctionHistory.find((l) => l.lotId === stage.lot?.id);
  const playerName = (p: number) => `Игрок ${p + 1}`;
  return (
    <section
      className="auction-area open-auction"
      aria-label="Открытый аукцион"
    >
      <div className="balances auction-wallets">
        {round.balances.map((balance, p) => (
          <div
            key={p}
            className={`auction-wallet ${round.phase === "bidding" && round.turn === p ? "your-turn" : ""}`}
          >
            <span>
              {playerName(p)}{" "}
              {round.phase === "bidding" && round.turn === p ? (
                <small>· ваш ход</small>
              ) : null}
            </span>
            <strong>
              {balance}
              <small> монет</small>
            </strong>
          </div>
        ))}
      </div>
      {round.log
        .filter(
          (l) =>
            l.type === "system" &&
            (l.text.includes("Вход переходит") ||
              l.text.includes("Оба кошелька")),
        )
        .map((l) => (
          <p className="auction-entry-notice" key={l.id}>
            {l.text}
          </p>
        ))}
      {round.phase === "preview" ? null : round.phase === "bidding" ? (
        <div className="open-bid-panel" aria-live="polite">
          <div className="auction-price">
            <span className="small-label">
              {round.highestBid
                ? `Ставка игрока ${round.highestBidder! + 1}`
                : "Торги открыты"}
            </span>
            <strong>
              {round.highestBid || "—"}
              <small>{round.highestBid ? " монет" : ""}</small>
            </strong>
          </div>
          <div className="open-bid-players">
            {[0, 1].map((p) => (
              <div
                className={`open-bid-player ${round.turn === p ? "active" : ""}`}
                key={p}
              >
                <button
                  className="primary"
                  disabled={locked || round.turn !== p}
                  onClick={() => act({ type: "BID" })}
                >
                  {round.highestBid
                    ? `Повысить до ${round.highestBid + 1}`
                    : "Поставить 1 монету"}{" "}
                  ↑
                </button>
                {round.highestBid ? (
                  <button
                    className="text-button"
                    disabled={locked || round.turn !== p}
                    onClick={() => act({ type: "PASS" })}
                  >
                    Уступить
                  </button>
                ) : (
                  <span className="opening-required">
                    Обязательная первая ставка
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : round.phase === "story" ? (
        <div className="auction-story entrance" aria-live="polite">
          <span className="small-label">
            Продано · {round.price} монет в банк
          </span>
          <h3>Рассказывает {playerName(round.loser!).toLowerCase()}.</h3>
          <p>{playerName(round.winner!)} слушает и может задавать вопросы.</p>
          <div className="auction-phase-actions">
            <button
              className="primary"
              disabled={locked}
              onClick={() => act({ type: "STORY_DONE" })}
            >
              Рассказ закончен →
            </button>
            <button
              className="text-button"
              disabled={locked}
              onClick={() => act({ type: "STORY_PASS" })}
            >
              Пропустить ответ
            </button>
          </div>
        </div>
      ) : (round.phase === "event" || round.phase === "reward") && event ? (
        <div className="auction-chance entrance-chance" aria-live="polite">
          <div className="auction-guest">
            <Portrait id="chance" />
            <div>
              <span className="small-label">Мимо проходил</span>
              <h3>Господин Случай</h3>
            </div>
          </div>
          <blockquote>{event.text}</blockquote>
          {event.type === "swap" ? (
            <>
              <p className="wallet-swap">
                {playerName(0)}: {round.balances[0]} → {round.balances[1]}
                <br />
                {playerName(1)}: {round.balances[1]} → {round.balances[0]}
              </p>
              <div className="auction-phase-actions">
                <button
                  className="primary"
                  disabled={locked}
                  onClick={() => act({ type: "EVENT_CONTINUE" })}
                >
                  Поменять кошельки →
                </button>
                <button
                  className="text-button"
                  disabled={locked}
                  onClick={() => act({ type: "EVENT_PASS" })}
                >
                  Не вмешивайтесь
                </button>
              </div>
            </>
          ) : round.phase === "reward" ? (
            <>
              <h3>{playerName(event.evaluator)}, ответ вас устроил?</h3>
              <div className="auction-phase-actions">
                <button
                  className="primary"
                  disabled={locked}
                  onClick={() => act({ type: "REWARD", approved: true })}
                >
                  Да · выдать {event.amount} монет
                </button>
                <button
                  className="secondary"
                  disabled={locked}
                  onClick={() => act({ type: "REWARD", approved: false })}
                >
                  Нет · без награды
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="small-label">
                Отвечает {playerName(event.target).toLowerCase()} · награда{" "}
                {event.amount} монет
              </span>
              <p className="bonus-question">{record?.bonusQuestion}</p>
              <div className="auction-phase-actions">
                <button
                  className="primary"
                  disabled={locked}
                  onClick={() => act({ type: "BONUS_DONE" })}
                >
                  Ответ готов →
                </button>
                <button
                  className="text-button"
                  disabled={locked}
                  onClick={() => act({ type: "EVENT_PASS" })}
                >
                  Пропустить вопрос
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="auction-result" aria-live="polite">
          <span className="small-label">Лот закрыт</span>
          <h3>
            {round.winner === null
              ? "Оба пропустили."
              : round.storyPassed
                ? "Ответ пропущен."
                : `Историю рассказал игрок ${round.loser! + 1}.`}
          </h3>
          {round.log
            .filter((l) => l.type === "swap" || l.type === "reward")
            .map((l) => (
              <p key={l.id}>{l.text}</p>
            ))}
        </div>
      )}
    </section>
  );
}
