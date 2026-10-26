export function PlayerTurn({
  active,
  roles,
}: {
  active: 0 | 1;
  roles: readonly [string, string];
}) {
  return (
    <div className="player-turn" aria-label="Чей сейчас ход">
      {roles.map((role, player) => (
        <div
          key={player}
          className={`player-turn-card ${active === player ? "is-active" : ""}`}
          aria-current={active === player ? "step" : undefined}
        >
          <strong>Игрок {player + 1}</strong>
          <span>
            {active === player
              ? `Сейчас: ${role.toLocaleLowerCase("ru")}`
              : role}
          </span>
        </div>
      ))}
    </div>
  );
}
