let audio: AudioContext | undefined;
export function chime(kind: "event" | "end" | "click" = "click") {
  try {
    audio ??= new AudioContext();
    void audio.resume();
    const start = audio.currentTime;
    const tones =
      kind === "event"
        ? [330, 440, 660]
        : kind === "end"
          ? [523, 659, 784]
          : [440];
    tones.forEach((frequency, i) => {
      const oscillator = audio!.createOscillator();
      const gain = audio!.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.07, start + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + i * 0.12 + 0.25);
      oscillator.connect(gain);
      gain.connect(audio!.destination);
      oscillator.start(start + i * 0.12);
      oscillator.stop(start + i * 0.12 + 0.3);
    });
  } catch {
    /* Audio support is optional. */
  }
}
