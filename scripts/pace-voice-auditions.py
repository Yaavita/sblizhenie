"""Direct the silence in existing takes, preserving voices and speech speed.

Word alignment runs once on a local Whisper model; later edits reuse its cache.
Pause durations in voice-casting.json are minimum *total* gaps, not added delays.
"""
import argparse
import hashlib
import json
import re
import subprocess
from difflib import SequenceMatcher
from pathlib import Path

import numpy as np
import soundfile as sf


def tokens(text):
    return re.findall(r"[а-яa-z0-9]+", text.lower().replace("ё", "е"))


def render(profile, root, alignment_model):
    stem = profile.get("sourceStem", f"{profile['id']}-v{profile.get('take', 1)}")
    source = root / profile.get("sourceDir", "assets/voice-sources") / f"{stem}.wav"
    cache = source.with_suffix(".words.json")
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    aligned = json.loads(cache.read_text()) if cache.exists() else {}
    if aligned.get("source_sha256") != digest:
        import mlx_whisper

        print(f"Aligning {profile['name']}", flush=True)
        result = mlx_whisper.transcribe(
            str(source), path_or_hf_repo=alignment_model, language="ru",
            word_timestamps=True, temperature=0, condition_on_previous_text=False,
        )
        aligned = {
            "source_sha256": digest,
            "text": result["text"],
            "words": [w for s in result["segments"] for w in s.get("words", [])],
        }
        cache.write_text(json.dumps(aligned, ensure_ascii=False, indent=2) + "\n")

    words = []
    for word in aligned["words"]:
        for token in tokens(word["word"]):
            words.append({**word, "token": token})
    original = tokens(profile["text"])
    match = SequenceMatcher(None, original, [w["token"] for w in words], autojunk=False)
    mapping = {}
    for block in match.get_matching_blocks():
        for offset in range(block.size):
            mapping[block.a + offset] = block.b + offset
    # Russian ASR occasionally writes near-homophones (e.g. «засчитана» /
    # «защитана»). Recover only a unique close match between anchored neighbours.
    for i, token in enumerate(original):
        if i in mapping:
            continue
        before = max((mapping[j] for j in mapping if j < i), default=-1)
        after = min((mapping[j] for j in mapping if j > i), default=len(words))
        used = set(mapping.values())
        candidates = [j for j in range(before + 1, after) if j not in used
                      and SequenceMatcher(None, token, words[j]["token"]).ratio() >= .75]
        if len(candidates) == 1:
            mapping[i] = candidates[0]

    audio, rate = sf.read(source, dtype="float32")
    if audio.ndim != 1 or not np.isfinite(audio).all():
        raise ValueError(f"Invalid source: {source}")
    edits = []
    for direction in profile["pauses"]:
        phrase = tokens(direction["after"])
        positions = [i + len(phrase) - 1 for i in range(len(original) - len(phrase) + 1)
                     if original[i:i + len(phrase)] == phrase]
        if len(positions) != 1:
            raise ValueError(f"Ambiguous pause cue: {direction['after']}")
        index = positions[0]
        if index not in mapping or mapping[index] + 1 >= len(words):
            if profile.get("relaxed"): continue
            raise ValueError(f"Review alignment at: {direction['after']}")
        left, right = words[mapping[index]], words[mapping[index] + 1]
        boundary = (left["end"] + right["start"]) / 2
        # Find a quiet acoustic boundary near the aligned word gap. Never cut or
        # stretch speech; leave both phonemes and existing breaths in the take.
        radius = .08
        step = max(1, int(rate * .005))
        window = max(1, int(rate * .012))
        candidates = range(max(window, int((boundary - radius) * rate)),
                           min(len(audio) - window, int((boundary + radius) * rate)), step)
        cut = min(candidates, key=lambda i: np.mean(audio[i-window:i+window] ** 2))
        threshold = .008
        start = end = cut
        while start > 0 and np.sqrt(np.mean(audio[max(0, start-step):start] ** 2)) < threshold:
            start -= step
        while end + step < len(audio) and np.sqrt(np.mean(audio[end:end+step] ** 2)) < threshold:
            end += step
        existing = max(0, end - start) / rate
        extra = max(0, direction["seconds"] - existing)
        rms = float(np.sqrt(np.mean(audio[cut-window:cut+window] ** 2)))
        if rms > .025:
            if profile.get("relaxed"): continue
            raise ValueError(f"No safe quiet boundary at {direction['after']}: {rms}")
        edits.append({"at": cut, "add": int(round(extra * rate)),
                      "after": direction["after"], "gap_before": round(existing, 3),
                      "gap_after": round(max(existing, direction["seconds"]), 3)})

    edits.sort(key=lambda e: e["at"])
    pieces, cursor = [], 0
    for edit in edits:
        cut = edit["at"]
        chunk = audio[cursor:cut].copy()
        if edit["add"]:
            # Two-millisecond fades avoid a discontinuity at the inserted silence.
            fade = min(int(rate * .002), len(chunk))
            chunk[-fade:] *= np.linspace(1, 0, fade)
            pieces.extend([chunk, np.zeros(edit["add"], dtype=np.float32)])
            next_fade = min(int(rate * .002), len(audio) - cut)
            audio[cut:cut+next_fade] *= np.linspace(0, 1, next_fade)
        else:
            pieces.append(chunk)
        cursor = cut
    pieces.append(audio[cursor:])
    paced = np.concatenate(pieces)
    target = root / "public/audio" / profile.get("folder", "auditions") / profile["audio"]
    target.parent.mkdir(parents=True, exist_ok=True)
    wav = source.with_name(target.stem + ("-paced" if profile.get("folder") == "voices" else "") + ".wav")
    sf.write(wav, paced, rate, subtype="PCM_16")
    subprocess.run([
        "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
        "-i", str(wav), "-af", "loudnorm=I=-18:TP=-1.5:LRA=9",
        "-ar", "24000", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "96k", str(target),
    ], check=True)
    report = {"source": source.name, "output": target.name,
              "seconds_before": len(audio) / rate, "seconds_after": len(paced) / rate,
              "pauses": [{k: v for k, v in e.items() if k != "add"} for e in edits]}
    wav.with_suffix(".pauses.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(report, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--align-model", default="/tmp/third-align-model")
    parser.add_argument("--only")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    for profile in json.loads((root / "scripts/voice-casting.json").read_text())["profiles"]:
        if not args.only or profile["id"] == args.only:
            render(profile, root, args.align_model)
