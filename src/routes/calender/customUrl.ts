import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import ics from "ics";
import { z } from "zod/v4";

import customCalenderUrls from "../../constants/customCalenderUrls.js";
import type FaceitApiService from "../../services/faceitApiService/FaceitApiService.js";

const ENUM_CUSTOM_CALENDAR_URLS = Object.values(customCalenderUrls).map(
  (x) => x.name,
);

type Config = {
  faceitApiService: FaceitApiService;
};

export default function customUrl(
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
        type: z.enum(ENUM_CUSTOM_CALENDAR_URLS),
      }),
      response: { 200: z.string() },
    },
    handler: async (req, res) => {
      const { type } = req.query;

      const data = [];
      for (const team of customCalenderUrls[type].teams) {
        const response = await faceitApiService.getTeamMatchesOfChampionship(
          team.teamId,
          team.championshipId,
        );

        data.push(...response.data);
      }

      const event = ics.createEvents(data);
      if (event.value === undefined) {
        return res.code(200).send("unknown error creating event");
      }

      return res
        .code(200)
        .header("Content-Type", "text/calendar")
        .header("Content-Disposition", `attachment; filename="${type}.ics"`)
        .send(event.value);
    },
  });
}
