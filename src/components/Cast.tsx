import { narrators } from "../content/narrators";
import { Portrait } from "./Portrait";
export function Cast({ onBack }: { onBack: () => void }) {
  return (
    <main className="cast-screen entrance">
      <div className="centered">
        <h1>
          Они <em>сами пришли.</em>
        </h1>
        <p className="lead">
          Ведущего здесь не выбирают. Эти пятеро делят ваш вечер между собой.
        </p>
      </div>
      <div className="cast-gallery">
        {narrators.map((n) => (
          <article className="cast-character" key={n.id}>
            <div className="cast-portrait">
              <Portrait id={n.id} />
            </div>
            <h2>{n.name}</h2>
            <span className="small-label" style={{ color: n.color }}>
              {n.role}
            </span>
            <blockquote>«{n.quote}»</blockquote>
            <p>{n.description}</p>
            <details>
              <summary>С кем дружит, с кем спорит</summary>
              <p>{n.relations}</p>
            </details>
          </article>
        ))}
      </div>
      <div className="cast-footer">
        <p>
          Каждый этап — новый голос.
          <br />
          Чужое вмешательство может стать поводом для маленькой войны.
        </p>
        <button className="primary" onClick={onBack}>
          Вернуться к вечеру →
        </button>
      </div>
    </main>
  );
}
