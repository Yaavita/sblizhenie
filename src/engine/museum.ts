export type MuseumPlayer = 0 | 1;
type ThreeCaptions = [string, string, string];
export type MuseumPhase =
  | "intro"
  | "handoff"
  | "write"
  | "pick"
  | "story"
  | "label"
  | "approve"
  | "gallery";
export interface MuseumExhibit {
  owner: MuseumPlayer;
  slot: number;
  original: string;
  revised: string;
}
export interface MuseumState {
  version: 1;
  phase: MuseumPhase;
  preparationPlayer: MuseumPlayer;
  captions: [ThreeCaptions, ThreeCaptions];
  selected: number | null;
  label: string;
  exhibits: MuseumExhibit[];
  title: string;
}
export type MuseumAction =
  | { type: "START" }
  | { type: "READY" }
  | { type: "WRITE"; slot: number; text: string }
  | { type: "SEAL" }
  | { type: "PICK"; slot: number }
  | { type: "STORY_DONE" }
  | { type: "LABEL"; text: string }
  | { type: "PROPOSE" }
  | { type: "REVISE" }
  | { type: "APPROVE" }
  | { type: "TITLE"; text: string };

export const museumOwner = (state: MuseumState): MuseumPlayer =>
  (state.exhibits.length % 2) as MuseumPlayer;
const slotValid = (slot: number) =>
  Number.isInteger(slot) && slot >= 0 && slot < 3;
export function captionsReady(captions: readonly string[]): boolean {
  return (
    captions.every((text) => text.trim().length >= 3) &&
    new Set(captions.map((text) => text.trim().toLocaleLowerCase("ru")))
      .size === 3
  );
}
export function initialMuseum(): MuseumState {
  return {
    version: 1,
    phase: "intro",
    preparationPlayer: 0,
    captions: [
      ["", "", ""],
      ["", "", ""],
    ],
    selected: null,
    label: "",
    exhibits: [],
    title: "Музей неверных впечатлений",
  };
}
export function museumReducer(
  state: MuseumState,
  action: MuseumAction,
): MuseumState {
  switch (action.type) {
    case "START":
      return state.phase === "intro" ? { ...state, phase: "handoff" } : state;
    case "READY":
      return state.phase === "handoff" ? { ...state, phase: "write" } : state;
    case "WRITE": {
      if (
        state.phase !== "write" ||
        !slotValid(action.slot) ||
        typeof action.text !== "string"
      )
        return state;
      const captions: MuseumState["captions"] = [
        [...state.captions[0]],
        [...state.captions[1]],
      ];
      captions[state.preparationPlayer][action.slot] = action.text.slice(
        0,
        180,
      );
      return { ...state, captions };
    }
    case "SEAL": {
      if (
        state.phase !== "write" ||
        !captionsReady(state.captions[state.preparationPlayer])
      )
        return state;
      const captions: MuseumState["captions"] = [
        [...state.captions[0]],
        [...state.captions[1]],
      ];
      captions[state.preparationPlayer] = captions[state.preparationPlayer].map(
        (text) => text.trim(),
      ) as ThreeCaptions;
      return {
        ...state,
        captions,
        preparationPlayer: 1,
        phase: state.preparationPlayer === 0 ? "handoff" : "pick",
      };
    }
    case "PICK":
      return state.phase === "pick" &&
        slotValid(action.slot) &&
        !state.exhibits.some(
          (item) =>
            item.owner === museumOwner(state) && item.slot === action.slot,
        )
        ? { ...state, phase: "story", selected: action.slot }
        : state;
    case "STORY_DONE":
      return state.phase === "story" ? { ...state, phase: "label" } : state;
    case "LABEL":
      return state.phase === "label" && typeof action.text === "string"
        ? { ...state, label: action.text.slice(0, 280) }
        : state;
    case "PROPOSE":
      return state.phase === "label" && state.label.trim().length >= 3
        ? { ...state, phase: "approve", label: state.label.trim() }
        : state;
    case "REVISE":
      return state.phase === "approve" ? { ...state, phase: "label" } : state;
    case "APPROVE": {
      if (state.phase !== "approve" || state.selected === null) return state;
      const owner = museumOwner(state);
      const exhibits = [
        ...state.exhibits,
        {
          owner,
          slot: state.selected,
          original: state.captions[owner][state.selected],
          revised: state.label,
        },
      ];
      return {
        ...state,
        exhibits,
        label: "",
        selected: null,
        phase: exhibits.length === 6 ? "gallery" : "pick",
      };
    }
    case "TITLE":
      return state.phase === "gallery" && typeof action.text === "string"
        ? { ...state, title: action.text.slice(0, 80) }
        : state;
  }
}

/** Validate both field shapes and progression before restoring private player input. */
export function isMuseumState(value: unknown): value is MuseumState {
  if (!value || typeof value !== "object") return false;
  const s = value as MuseumState;
  const text = (v: unknown, max: number) =>
    typeof v === "string" && v.length <= max;
  if (
    s.version !== 1 ||
    ![
      "intro",
      "handoff",
      "write",
      "pick",
      "story",
      "label",
      "approve",
      "gallery",
    ].includes(s.phase) ||
    ![0, 1].includes(s.preparationPlayer) ||
    !Array.isArray(s.captions) ||
    s.captions.length !== 2 ||
    !s.captions.every(
      (row) =>
        Array.isArray(row) &&
        row.length === 3 &&
        row.every((v) => text(v, 180)),
    ) ||
    !(s.selected === null || slotValid(s.selected)) ||
    !text(s.label, 280) ||
    !text(s.title, 80) ||
    !Array.isArray(s.exhibits) ||
    s.exhibits.length > 6
  )
    return false;
  const preparation = ["intro", "handoff", "write"].includes(s.phase);
  if (
    preparation &&
    (s.exhibits.length !== 0 || s.selected !== null || s.label !== "")
  )
    return false;
  if (
    s.phase === "intro" &&
    (s.preparationPlayer !== 0 || s.captions.flat().some(Boolean))
  )
    return false;
  if (s.preparationPlayer === 0 && s.captions[1].some(Boolean)) return false;
  if (s.preparationPlayer === 1 && !captionsReady(s.captions[0])) return false;
  if (
    !preparation &&
    (s.preparationPlayer !== 1 || !s.captions.every(captionsReady))
  )
    return false;
  if ((s.phase === "gallery") !== (s.exhibits.length === 6)) return false;
  if (
    s.exhibits.some(
      (e, index) =>
        !e ||
        e.owner !== index % 2 ||
        !slotValid(e.slot) ||
        e.original !== s.captions[e.owner][e.slot] ||
        !text(e.revised, 280) ||
        e.revised.trim().length < 3,
    )
  )
    return false;
  if (
    new Set(s.exhibits.map((e) => `${e.owner}:${e.slot}`)).size !==
    s.exhibits.length
  )
    return false;
  const selectedPhase = ["story", "label", "approve"].includes(s.phase);
  if (selectedPhase !== (s.selected !== null)) return false;
  if (
    s.selected !== null &&
    s.exhibits.some((e) => e.owner === museumOwner(s) && e.slot === s.selected)
  )
    return false;
  if (s.phase === "approve" && s.label.trim().length < 3) return false;
  if (!["label", "approve"].includes(s.phase) && s.label !== "") return false;
  return true;
}

export function museumText(state: MuseumState): string {
  return [
    state.title.trim() || "Музей неверных впечатлений",
    "",
    ...state.exhibits.flatMap((item, i) => [
      `Экспонат ${i + 1} · Игрок ${item.owner + 1}`,
      `Первое впечатление: ${item.original}`,
      `Новая подпись: ${item.revised}`,
      "",
    ]),
  ].join("\n");
}
