import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod/v4";

import type VolantaService from "../services/volantaService.js";

type Config = {
  volantaService: VolantaService;
};

export default function volanta(
  app: FastifyInstance,
  options: { config: Config },
) {
  const { volantaService } = options.config;

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/current/:id",
    schema: {
      params: z.object({ id: z.string() }),
      querystring: z.object({ username: z.string().min(4) }).partial(),
      response: { 200: z.string() },
    },
    handler: async (req, res) => {
      let nickname = req.query.username;
      if (nickname === undefined || nickname.length === 0) {
        nickname = req.params.id;
      }

      const flightUrl = await volantaService.getCurrentFlight(nickname);
      if (flightUrl === undefined) {
        return res.code(404).send("No flight found");
      }
      return res.code(200).send(flightUrl);
    },
  });
}
