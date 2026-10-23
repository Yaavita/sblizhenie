import { buildStages, buildLegacyDrawingStages } from "../src/content/games";
/** The old random director and host rules remain available for in-progress ten-stage saves. */
export const buildLegacyStages: typeof buildStages = (
  game,
  variant = 0,
  intimacy = 0,
  decisions = {},
  narrator,
) =>
  game === "universes"
    ? buildLegacyDrawingStages(variant, intimacy, narrator)
    : buildStages(game, variant, intimacy, decisions, narrator);
