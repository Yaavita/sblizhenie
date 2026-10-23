"""Generate five original audition voices locally; not a runtime dependency of the game."""
import argparse
import json
import time
import subprocess
from pathlib import Path

import mlx.core as mx
import numpy as np
import soundfile as sf
from mlx_audio.tts.utils import load_model

parser = argparse.ArgumentParser()
parser.add_argument('--model', default='/tmp/third-voice-model')
parser.add_argument('--only')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
profiles = json.loads((root / 'scripts/voice-casting.json').read_text())['profiles']
output = root / 'assets/voice-sources'
compressed = root / 'public/audio/auditions'
compressed.mkdir(parents=True, exist_ok=True)
output.mkdir(parents=True, exist_ok=True)
print('Loading local voice model', flush=True)
model = load_model(args.model)
print('Model ready', flush=True)
for profile in profiles:
    if args.only and profile['id'] != args.only:
        continue
    target = output / f"{profile['id']}-v{profile.get('take', 1)}.wav"
    if target.exists():
        print(f"Already generated: {profile['id']}", flush=True)
        continue
    mx.random.seed(profile['seed'])
    started = time.monotonic()
    print(f"Generating {profile['name']}", flush=True)
    chunks = []
    rate = 24000
    for result in model.generate_voice_design(text=profile['text'], instruct=profile['instruct'], language='Russian', temperature=0.75, max_tokens=700, verbose=False):
        mx.eval(result.audio)
        chunks.append(np.asarray(result.audio, dtype=np.float32))
        rate = result.sample_rate
    audio = np.concatenate(chunks)
    peak = np.max(np.abs(audio))
    if not np.isfinite(audio).all() or peak < 0.001:
        raise RuntimeError('Invalid or silent generation')
    audio = audio * min(1.0, .95 / peak)
    sf.write(target, audio, rate, subtype='PCM_16')
    subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(target), '-af', 'loudnorm=I=-18:TP=-1.5:LRA=9', '-ar', '24000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '96k', str(compressed / (target.stem + '.mp3'))], check=True)
    print(json.dumps({'id': profile['id'], 'file': str(target), 'seconds': round(len(audio)/rate, 2), 'generation_seconds': round(time.monotonic()-started, 2)}, ensure_ascii=False), flush=True)
    mx.clear_cache()
