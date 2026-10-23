import { useState } from "react";
import type { Condition, Session } from "../engine/engine";
import type { Stage } from "../content/types";
import { getNarrator } from "../content/narrators";
import { PrivateReveal } from "./PrivateReveal";
const statusNames: Record<Condition["status"], string> = {
  active: "Действует",
  completed: "Этап закончен",
  cancelled: "Отменено",
  replaced: "Заменено",
};
export function ConditionItem({ condition }: { condition: Condition }) {
  const actor =
    condition.changedBy && condition.changedBy !== "players"
      ? getNarrator(condition.changedBy as Condition["narrator"]).name
      : condition.changedBy === "players"
        ? "Вы пропустили условие"
        : "";
  return (
    <article className={`condition-item condition-${condition.status}`}>
      <div>
        <strong>{condition.title}</strong>
        <span>{statusNames[condition.status]}</span>
      </div>
      <p>{condition.text}</p>
      <small>
        {condition.id.startsWith("host-auction-")
          ? "Аукцион"
          : getNarrator(condition.narrator).name}
        {actor
          ? ` · ${condition.changedBy === "players" ? actor : `${condition.status === "replaced" ? "замена" : "отмена"}: ${actor}`}`
          : ""}
      </small>
    </article>
  );
}
export function Conditions({
  state,
  stages,
  onClose,
}: {
  state: Session;
  stages: Stage[];
  onClose: () => void;
}) {
  const [secret, setSecret] = useState<Stage | null>(null);
  const visited = stages.slice(0, state.stageIndex + 1);
  const general = state.conditions.filter((c) => c.scope === "game");
  return (
    <div className="conditions-backdrop" onClick={onClose}>
      <aside
        className="conditions-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="conditions-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="conditions-title">Условия</h2>
          <button
            className="text-button"
            onClick={onClose}
            aria-label="Закрыть условия"
          >
            ✕
          </button>
        </header>
        {secret?.secret ? (
          <>
            <button className="text-button" onClick={() => setSecret(null)}>
              ← К условиям
            </button>
            <h3>{secret.title}</h3>
            <PrivateReveal
              key={secret.id}
              one={secret.secret.one}
              two={secret.secret.two}
              onDone={() => setSecret(null)}
            />
          </>
        ) : (
          <>
            <section className="house-conditions">
              <h3>
                {state.game === "auction"
                  ? "Правила аукциона"
                  : getNarrator(state.narrator).name}
              </h3>
              {general.map((c) => (
                <ConditionItem key={c.id} condition={c} />
              ))}
            </section>
            <section className="condition-history">
              <h3>Этапы и решения</h3>
              {visited.map((stage, index) => {
                const decision = stage.choices?.find(
                  (c) => c.id === state.decisions[stage.id],
                );
                const additions = state.conditions.filter(
                  (c) => c.scope === "stage" && c.stageId === stage.id,
                );
                const sale = state.auctionHistory.find(
                  (lot) => lot.lotId === stage.lot?.id,
                );
                return (
                  <details
                    key={stage.id}
                    open={stage.id === state.stageId}
                    className="stage-record"
                  >
                    <summary>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      {stage.lot?.title || stage.title}
                    </summary>
                    <div className="stage-record-body">
                      <p>{stage.lot?.description || stage.body}</p>
                      {stage.kind === "secret" && stage.secret ? (
                        <button
                          className="secondary"
                          onClick={() => setSecret(stage)}
                        >
                          Перечитать личные сведения
                        </button>
                      ) : (
                        <>
                          {stage.prompt ? (
                            <blockquote>{stage.prompt}</blockquote>
                          ) : null}
                          {decision ? (
                            <div className="record-decision">
                              <strong>{decision.label}</strong>
                              <p>{decision.effect}</p>
                            </div>
                          ) : stage.choices &&
                            index < state.stageIndex &&
                            stage.notes ? (
                            <p>{stage.notes}</p>
                          ) : null}
                        </>
                      )}
                      {sale ? (
                        <p className="record-sale">
                          {sale.winner === null
                            ? "Лот не продан."
                            : `Игрок ${sale.winner + 1} заплатил ${sale.price} монет за рассказ игрока ${sale.respondent! + 1}.`}
                        </p>
                      ) : null}
                      {sale?.bonusQuestion ? (
                        <blockquote>{sale.bonusQuestion}</blockquote>
                      ) : null}
                      {sale?.log.map((text, i) => (
                        <p key={i} className="auction-history-line">
                          {text}
                        </p>
                      ))}
                      {additions.map((c) => (
                        <ConditionItem key={c.id} condition={c} />
                      ))}
                    </div>
                  </details>
                );
              })}
            </section>
          </>
        )}
      </aside>
    </div>
  );
}
