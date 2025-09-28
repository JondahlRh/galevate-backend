import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";

import env from "../../env.js";

export default function getSubscribeUrl(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "",
    schema: {
      tags: ["calender"],
      querystring: z.object({
        team: z.url(),
        championship: z.url(),
      }),
      response: { 200: z.string() },
    },
    handler: async (req, res) => {
      const { team, championship } = req.query;

      let fullUrlWithoutPath = `${req.protocol}://${req.host}`;
      if (env.ROUTE_PREFIX !== undefined) {
        fullUrlWithoutPath += env.ROUTE_PREFIX;
      }

      const teamId = team.replace(/\/$/, "").split("/").pop();
      const parsedTeamId = z.uuidv4().safeParse(teamId);
      if (!parsedTeamId.success) {
        return res.code(200).send("faceit team url not valid");
      }

      const championshipId = championship.replace(/\/$/, "").split("/")[5];
      const parsedChampionshipId = z.uuidv4().safeParse(championshipId);
      if (!parsedChampionshipId.success) {
        return res.code(200).send("faceit team url not valid");
      }

      return res
        .code(200)
        .send(
          `${fullUrlWithoutPath}/calender/subscribe-url?team=${parsedTeamId.data}&championship=${parsedChampionshipId.data}`,
        );
    },
  });
}
