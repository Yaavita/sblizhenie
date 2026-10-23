export function Header({
  sound,
  onSound,
  onHome,
  middle,
}: {
  sound: boolean;
  onSound: () => void;
  onHome: () => void;
  middle?: React.ReactNode;
}) {
  return (
    <header className="app-header">
      <button
        className="wordmark"
        onClick={onHome}
        aria-label="Третий лишний — на главную"
      >
        <span>
          Третий<span className="wordmark-dot">.</span>
        </span>
        <span>лишний</span>
      </button>
      <div className="header-middle">
        {middle || <span>Игровой вечер для двоих</span>}
      </div>
      <button
        className={`sound-toggle ${sound ? "enabled" : ""}`}
        aria-label={sound ? "Выключить звук" : "Включить звук"}
        aria-pressed={sound}
        onClick={onSound}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <path d="M11 5 6 9H3v6h3l5 4V5Z" />
          {sound ? (
            <>
              <path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" />
            </>
          ) : (
            <path d="m16 9 5 6m0-6-5 6" />
          )}
        </svg>
      </button>
    </header>
  );
}
