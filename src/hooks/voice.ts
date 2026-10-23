import { useCallback, useEffect, useRef, useState } from "react";
import manifest from "../audio/voiceManifest.json";
import type { NarratorId } from "../content/types";
interface VoiceEntry {
  narrator: NarratorId;
  text: string;
  src: string;
}
const voices = new Map(
  (manifest as VoiceEntry[]).map((v) => [`${v.narrator}\n${v.text}`, v.src]),
);
let player: HTMLAudioElement | undefined;
function getPlayer() {
  return (player ??= new Audio());
}
/** Called in the start/continue click so Safari can authorise this audio element. */
export function unlockVoice() {
  const audio = getPlayer();
  if (audio.src) return;
  audio.src =
    "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQIAAAAAAA==";
  void audio
    .play()
    .then(() => {
      if (audio.src.startsWith("data:")) audio.pause();
    })
    .catch(() => {});
}
export function useNarratorVoice(
  narrator: NarratorId,
  text: string,
  cue: string,
  enabled: boolean,
  paused: boolean,
) {
  const src = voices.get(`${narrator}\n${text}`);
  const heard = useRef(new Set<string>());
  const [speaking, setSpeaking] = useState(false);
  const current = useRef({ enabled, paused });
  current.current = { enabled, paused };
  const play = useCallback(() => {
    if (!src || !current.current.enabled || current.current.paused) return;
    const audio = getPlayer();
    audio.pause();
    audio.src = src;
    audio.currentTime = 0;
    heard.current.add(cue);
    setSpeaking(true);
    void audio.play().catch(() => setSpeaking(false));
  }, [cue, src]);
  useEffect(() => {
    const audio = getPlayer();
    const stop = () => setSpeaking(false);
    const start = () => setSpeaking(true);
    audio.addEventListener("ended", stop);
    audio.addEventListener("error", stop);
    audio.addEventListener("pause", stop);
    audio.addEventListener("playing", start);
    return () => {
      audio.removeEventListener("ended", stop);
      audio.removeEventListener("error", stop);
      audio.removeEventListener("pause", stop);
      audio.removeEventListener("playing", start);
      audio.pause();
    };
  }, []);
  useEffect(() => {
    const audio = getPlayer();
    audio.pause();
    setSpeaking(false);
    if (enabled && !paused && !heard.current.has(cue)) play();
    // Pausing the game must resume the same recording, not restart the cue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cue, src, enabled, play]);
  useEffect(() => {
    const audio = getPlayer();
    if (paused || !enabled) {
      audio.pause();
      setSpeaking(false);
      return;
    }
    if (src && !heard.current.has(cue)) {
      play();
      return;
    }
    if (src && audio.getAttribute("src") === src && !audio.ended) {
      setSpeaking(true);
      void audio.play().catch(() => setSpeaking(false));
    }
  }, [paused, enabled, src, cue, play]);
  return { speaking, replay: play, available: !!src };
}
