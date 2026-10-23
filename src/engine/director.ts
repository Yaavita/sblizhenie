import { interruptionPool } from "../content/narrators";
import type { Session } from "./engine";

/** Context is checked before rolling an event; replies keep their parent's scene. */
export function availableInterruptions(state: Session) {
  return interruptionPool.filter(
    (event) =>
      event.narrator !== state.narrator &&
      event.games.includes(state.game) &&
      event.contextstageIds?.includes(state.stageId) &&
      event.minIntimacy <= state.intimacy &&
      !state.log.some((entry) => entry.text === event.text),
  );
}
