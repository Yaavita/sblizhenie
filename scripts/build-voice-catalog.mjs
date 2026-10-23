/** Enumerate every playable character line; no network or model dependency. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const root = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const { narratorRemarks, interruptionPool } = await import(pathToFileURL(path.join(root, 'src/content/narrators.ts')));
const unique = new Map();
function add(narrator, text, kind) {
  const hash = createHash('sha256').update(`${narrator}\n${text}`).digest('hex').slice(0, 12);
  const entry = { narrator, text, src: `/audio/voices/${narrator}-${hash}.mp3`, kind };
  unique.set(`${narrator}\n${text}`, entry);
}
for (const [narrator, texts] of Object.entries(narratorRemarks)) for (const text of texts) add(narrator, text, 'stage');
for (const event of interruptionPool) {
  if (!event.games.length) continue;
  add(event.narrator, event.text, 'interruption');
  if (event.reply) add(event.reply.narrator, event.reply.text, 'reply');
}
const { auctionEventLines } = await import(pathToFileURL(path.join(root, 'src/engine/auction.ts')));
for (const [narrator, events] of Object.entries(auctionEventLines)) {
  if (narrator !== "chance") continue;
  for (const text of Object.values(events)) add(narrator, text, 'auction');
}
const lines = [...unique.values()];
fs.writeFileSync(path.join(root, 'scripts/voice-catalog.json'), JSON.stringify(lines, null, 2)+'\n');
console.log(`Voice catalog: ${lines.length} unique lines.`, Object.fromEntries(['noise','momo','archivist','chance','noir'].map(id=>[id,lines.filter(x=>x.narrator===id).length])));
