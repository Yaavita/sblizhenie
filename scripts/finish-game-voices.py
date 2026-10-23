"""Give generated game lines deliberate phrase pauses, then publish the offline manifest."""
import importlib.util, json, re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('pacing',root/'scripts/pace-voice-auditions.py');pacing=importlib.util.module_from_spec(spec);spec.loader.exec_module(pacing)
catalog=json.loads((root/'scripts/voice-catalog.json').read_text())
completed=[]
for entry in catalog:
 target=root/'public'/entry['src'].lstrip('/')
 if target.exists(): completed.append(entry);continue
 stem=Path(entry['src']).stem
 source=root/'assets/game-voice-sources'/f'{stem}.wav'
 if not source.exists(): continue
 sentence={'noise':.8,'momo':.85,'archivist':1.0,'chance':.9,'noir':1.15}[entry['narrator']]
 cues=[]
 for boundary in re.finditer(r'[,;:.!?…—](?:[»”"])?\s+',entry['text']):
  punctuation=entry['text'][boundary.start()]
  prefix=entry['text'][:boundary.start()]
  if not pacing.tokens(prefix): continue
  cues.append({'after':prefix,'seconds':sentence if punctuation in '.!?…' else .6 if punctuation in ';:' else .4})
 pacing.render({'id':entry['narrator'],'name':entry['narrator'],'sourceStem':stem,'sourceDir':'assets/game-voice-sources','text':entry['text'],'audio':target.name,'folder':'voices','relaxed':True,'pauses':cues},root,'/tmp/third-align-model')
 completed.append(entry)
(root/'src/audio/voiceManifest.json').write_text(json.dumps(completed,ensure_ascii=False,indent=2)+'\n')
print(f'Voice coverage: {len(completed)}/{len(catalog)}',flush=True)
if len(completed)!=len(catalog): raise SystemExit(2)
