"""Clone the five approved fictional voices into the game's offline dialogue bank."""
import argparse, json, time, subprocess
from pathlib import Path
import mlx.core as mx
import numpy as np
import soundfile as sf
from mlx_audio.tts.utils import load_model

parser=argparse.ArgumentParser()
parser.add_argument('--model',default='/tmp/third-voice-clone-model')
parser.add_argument('--only')
parser.add_argument('--limit',type=int,default=0)
parser.add_argument('--batch-size',type=int,default=3)
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
catalog=json.loads((root/'scripts/voice-catalog.json').read_text())
refs={r['narrator']:r for r in json.loads((root/'scripts/voice-references.json').read_text())}
raw=root/'assets/game-voice-sources';raw.mkdir(exist_ok=True)
print('Loading approved-voice cloning model',flush=True)
model=load_model(args.model)
print('Model ready',flush=True)
count=0
for narrator,ref in refs.items():
 if args.only and narrator!=args.only: continue
 entries=[e for e in catalog if e['narrator']==narrator and not (root/'public'/e['src'].lstrip('/')).exists() and not (raw/(Path(e['src']).stem+'.wav')).exists()]
 if args.limit: entries=entries[:max(0,args.limit-count)]
 for offset in range(0,len(entries),args.batch_size):
  batch=entries[offset:offset+args.batch_size]; started=time.monotonic()
  print('Generating '+narrator+' '+str(offset+1)+'/'+str(len(entries)),flush=True)
  mx.random.seed(18717+offset+sum(map(ord,narrator)))
  for result in model.batch_generate(texts=[e['text'] for e in batch],ref_audio=str(root/ref['path']),ref_text=ref['text'],lang_code='Russian',temperature=.7,max_tokens=420,verbose=False):
   mx.eval(result.audio)
   idx=result.sequence_idx
   entry=batch[idx]
   audio=np.asarray(result.audio,dtype=np.float32).reshape(-1)
   if len(audio)<2400 or not np.isfinite(audio).all() or np.max(abs(audio))<.001: raise RuntimeError('Invalid generated voice '+entry['src'])
   target=raw/(Path(entry['src']).stem+'.wav')
   sf.write(target,audio,result.sample_rate,subtype='PCM_16')
   print(json.dumps({'narrator':narrator,'text':entry['text'],'source':target.name,'seconds':len(audio)/result.sample_rate,'elapsed':round(time.monotonic()-started,2)},ensure_ascii=False),flush=True)
   count+=1
  mx.clear_cache()
 if args.limit and count>=args.limit: break
print('Generation complete',count,flush=True)
