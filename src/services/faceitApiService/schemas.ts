import z from "zod/v4";

export const playerZodObject = z.object({
  player_id: z.string(),
  nickname: z.string(),
  games: z.record(
    z.string(),
    z.object({
      skill_level: z.number(),
      faceit_elo: z.number(),
      region: z.string(),
    }),
  ),
  country: z.string(),
});

const factionZodObject = z.object({
  roster: z.array(z.object({ id: z.string(), elo: z.number() })),
  stats: z.object({ winProbability: z.number() }).optional(),
});

export const customMatchDetailsZodObject = z.object({
  payload: z.object({
    teams: z.object({
      faction1: factionZodObject,
      faction2: factionZodObject,
    }),
    tags: z.array(z.string()).optional(),
    entity: z.object({ name: z.string() }),
    voting: z
      .object({ map: z.object({ pick: z.array(z.string()) }) })
      .optional(),
  }),
});

export const customCurrentMatchZodObject = z.object({
  payload: z.record(z.string(), z.array(z.object({ id: z.string() }))),
});

const matchZodObject = z.object({
  match_id: z.string(),
  scheduled_at: z.number().optional(),
  teams: z.object({
    faction1: z.object({ faction_id: z.string(), name: z.string() }),
    faction2: z.object({ faction_id: z.string(), name: z.string() }),
  }),
  faceit_url: z.string(),
});

export const matchReturnZodObject = z.object({
  items: z.array(matchZodObject),
  start: z.number(),
  end: z.number(),
});
