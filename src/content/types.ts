export type GameId = "universes" | "cult" | "auction" | "secrets";
export type NarratorId = "noise" | "momo" | "archivist" | "chance" | "noir";
export type PreferenceId =
  "talk" | "debate" | "absurd" | "create" | "romance" | "mystery" | "random";

export interface GameMeta {
  id: GameId;
  title: string;
  subtitle: string;
  description: string;
  minutes: string;
  materials: string[];
  tags: PreferenceId[];
}

export interface Stage {
  id: string;
  title: string;
  body: string;
  seconds: number;
  prompt?: string;
  target?: "both" | "one" | "two";
  kind?: "discussion" | "draw" | "choice" | "secret" | "auction" | "verdict";
  choices?: { id: string; label: string; effect: string }[];
  secret?: { one: string; two: string };
  lot?: {
    id: string;
    title: string;
    description: string;
    question: string;
    narrator?: NarratorId;
  };
  notes?: string;
}
