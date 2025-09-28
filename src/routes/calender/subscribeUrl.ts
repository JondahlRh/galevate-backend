import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import ics from "ics";
import { z } from "zod/v4";

import type FaceitApiService from "../../services/faceitApiService/FaceitApiService.js";

type Config = {
  faceitApiService: FaceitApiService;
};

export default function subscribeUrl(
  app: FastifyInstance,
  options: { config: Config },
) {
  const { faceitApiService } = options.config;

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

      const event = ics.createEvents(response.data);
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
