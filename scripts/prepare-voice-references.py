"""Extract approved openings, preserving the user's accepted pace and timbre."""
import json, re, subprocess
from difflib import SequenceMatcher
from pathlib import Path
import numpy as np
import soundfile as sf
root = Path(__file__).resolve().parents[1]
profiles = json.loads((root/'scripts/voice-casting.json').read_text())['profiles']
catalog = json.loads((root/'scripts/voice-catalog.json').read_text())
def tokens(text): return re.findall(r'[а-яa-z0-9]+',text.lower().replace('ё','е'))
refs=[]
for profile in profiles:
    stem=f"{profile['id']}-v{profile.get('take',1)}"
    source=root/'assets/voice-sources'/f'{stem}.wav'
    if '\n' in profile['text']: text=profile['text'].split('\n')[0]
    else: text='Позвольте. Хороший вопрос ещё не означает хороший ответ.'
    words=json.loads(source.with_suffix('.words.json').read_text())['words']
    flat=[]
    for word in words:
        for token in tokens(word['word']): flat.append({**word,'token':token})
    original=tokens(profile['text']); desired=tokens(text)
    mapping={}
    for block in SequenceMatcher(None,original,[w['token'] for w in flat],autojunk=False).get_matching_blocks():
        for offset in range(block.size): mapping[block.a+offset]=block.b+offset
    end_index=mapping[len(desired)-1]
    end=flat[end_index]['end']
    following=flat[end_index+1]['start'] if end_index+1<len(flat) else end+.4
    cut=(end+following)/2
    original_audio,rate=sf.read(source,dtype='float32')
    audio=original_audio[:int(cut*rate)]
    report=json.loads((root/'assets/voice-sources'/f'{stem}-paced-v1.pauses.json').read_text())
    pieces=[]; cursor=0
    for edit in report['pauses']:
        if edit['at']>=len(audio): break
        at=edit['at']; pieces.append(audio[cursor:at]); cursor=at
        pieces.append(np.zeros(round(max(0,edit['gap_after']-edit['gap_before'])*rate),dtype=np.float32))
    pieces.append(audio[cursor:]); paced=np.concatenate(pieces)
    # Retain the short original take for stable identity cloning. The accepted
    # paced version is used verbatim for the first bank line.
    ref=root/'assets/voice-references'/f"{profile['id']}.wav"; ref.parent.mkdir(exist_ok=True)
    sf.write(ref,audio,rate,subtype='PCM_16')
    entry=next(e for e in catalog if e['narrator']==profile['id'] and e['text']==text)
    target=root/'public'/entry['src'].lstrip('/'); target.parent.mkdir(parents=True,exist_ok=True)
    pcm=ref.with_name(ref.stem+'-opening.wav'); sf.write(pcm,paced,rate,subtype='PCM_16')
    subprocess.run(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-i',str(pcm),'-af','loudnorm=I=-18:TP=-1.5:LRA=9','-ar','24000','-ac','1','-c:a','libmp3lame','-b:a','96k',str(target)],check=True)
    refs.append({'narrator':profile['id'],'text':text,'path':str(ref.relative_to(root)),'seconds':round(len(audio)/rate,2)})
    print(profile['id'],text,round(len(paced)/rate,2),flush=True)
(root/'scripts/voice-references.json').write_text(json.dumps(refs,ensure_ascii=False,indent=2)+'\n')
