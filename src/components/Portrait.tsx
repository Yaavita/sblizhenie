import type { CSSProperties } from "react";
import type { NarratorId } from "../content/types";
const positions: Record<NarratorId, number> = {
  noise: 0,
  momo: 25,
  archivist: 50,
  chance: 75,
  noir: 100,
};
const focalPoints: Record<NarratorId, number> = {
  noise: 0,
  momo: 10,
  archivist: 32,
  chance: 22,
  noir: 0,
};
export function Portrait({
  id,
  className = "",
}: {
  id: NarratorId;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`portrait portrait-${id} ${className}`}
      style={
        {
          "--portrait-position": `${positions[id]}%`,
          "--portrait-y": `${focalPoints[id]}%`,
        } as CSSProperties
      }
    />
  );
}
