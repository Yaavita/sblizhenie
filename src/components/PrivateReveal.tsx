import { useState } from "react";
export function PrivateReveal({
  one,
  two,
  onDone,
}: {
  one: string;
  two: string;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const player = step < 2 ? 1 : 2;
  const revealed = step % 2 === 1;
  return (
    <section className="privacy-panel" aria-label="Секретные сведения">
      <span className="small-label">Личное дело · игрок {player}</span>
      <h2>{revealed ? "Только для ваших глаз." : "Небольшая тайна."}</h2>
      {revealed ? (
        <div className="secret-copy">{player === 1 ? one : two}</div>
      ) : (
        <p>
          Игрок {player}, поверните экран к себе. Второй игрок, отвернитесь.
        </p>
      )}
      <button
        className="primary"
        onClick={() => {
          if (step === 3) onDone();
          else setStep(step + 1);
        }}
      >
        {revealed
          ? player === 1
            ? "Скрыть и передать ноутбук →"
            : "Скрыть. Мы готовы →"
          : `Я игрок ${player}. Показать сведения`}
      </button>
    </section>
  );
}
