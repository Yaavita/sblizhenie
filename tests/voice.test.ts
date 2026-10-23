import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import manifest from "../src/audio/voiceManifest.json";
import { narratorRemarks, interruptionPool } from "../src/content/narrators";
import { auctionEventLines } from "../src/engine/auction";
describe("offline prerecorded dialogue", () => {
  it("covers every displayed narrator line and interruption, including auction Chance", () => {
    const expected = new Set<string>();
    for (const [n, lines] of Object.entries(narratorRemarks))
      for (const text of lines) expected.add(`${n}\n${text}`);
    for (const e of interruptionPool) {
      if (!e.games.length) continue;
      expected.add(`${e.narrator}\n${e.text}`);
      if (e.reply) expected.add(`${e.reply.narrator}\n${e.reply.text}`);
    }
    for (const text of Object.values(auctionEventLines.chance))
      expected.add(`chance\n${text}`);
    expect(new Set(manifest.map((v) => `${v.narrator}\n${v.text}`))).toEqual(
      expected,
    );
    expect(manifest.length).toBe(expected.size);
    for (const line of manifest) {
      expect(line.src.startsWith("/audio/voices/")).toBe(true);
      const file = `public${line.src}`;
      expect(existsSync(file)).toBe(true);
      expect(readFileSync(file).length).toBeGreaterThan(2000);
    }
  });
});
