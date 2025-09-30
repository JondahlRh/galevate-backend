import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import ics from "ics";
import { z } from "zod/v4";

import CalenderService from "../../services/CalenderService.js";
import type DachcsScraperService from "../../services/dachcsScraperService/DachcsScraperService.js";
import FaceitApiService from "../../services/faceitApiService/FaceitApiService.js";

type Config = {
  faceitApiService: FaceitApiService;
  dachcsScraperService: DachcsScraperService;
};

export default function subscribeUrl(
  app: FastifyInstance,
  options: { config: Config },
) {
  const { faceitApiService, dachcsScraperService } = options.config;

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "",
    schema: {
      tags: ["calender"],
      querystring: z.object({
        team: z.string(),
        championship: z.string(),
      }),
      response: { 200: z.string() },
    },
    handler: async (req, res) => {
      const { team, championship } = req.query;

      const response = await faceitApiService.getTeamMatchesOfChampionship(
        team,
        championship,
      );

      const eventData = response.data.map((x) => {
        const dachcsMatch = dachcsScraperService.matches.get(x.match_id);

        return CalenderService.mapMatchEventData({
          teamLeftName: x.teams.faction1.name,
          teamRightName: x.teams.faction2.name,
          scheduled_at: x.scheduled_at,
          faceit_url: x.faceit_url,
          dachcsMatch,
        });
      });

      const event = ics.createEvents(eventData);
      if (event.value === undefined) {
        return res.code(200).send("unknown error creating event");
      }

      return res
        .code(200)
        .header("Content-Type", "text/calendar")
        .send(event.value);
    },
  });
}
