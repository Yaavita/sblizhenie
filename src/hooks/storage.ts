import { restoreSession, type Session } from "../engine/engine";
const KEY = "third-wheel-session-v1";
export function saveSession(session: Session) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, session }));
  } catch {
    /* A full or private storage must not stop the game. */
  }
}
export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* Optional persistence. */
  }
}
export function readSaved(): Session | null {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "null");
    if (data?.version !== 1) return null;
    return restoreSession(data.session);
  } catch {
    return null;
  }
}
