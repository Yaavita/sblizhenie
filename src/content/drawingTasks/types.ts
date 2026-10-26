import type { NarratorId } from "../types";

export const drawingBaseIds = [
  "momo-island",
  "momo-house",
  "momo-city",
  "momo-garden",
  "noir-house",
  "noir-theater",
  "noir-museum",
  "noir-station",
  "archivist-machine",
  "archivist-factory",
  "archivist-control",
  "archivist-recharge",
  "noise-city",
  "noise-hq",
  "noise-park",
  "noise-square",
  "chance-station",
  "chance-bureau",
  "chance-hotel",
  "chance-market",
] as const;
export type DrawingBaseId = (typeof drawingBaseIds)[number];
export interface DrawingTask {
  id: string;
  /** The personal function being asked about; equivalent questions share a purpose. */
  purpose: string;
  text: string;
}
export type DrawingTaskSet = Record<NarratorId, [DrawingTask, DrawingTask]>;
