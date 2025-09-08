import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";

import env from "../../../env.js";
import type FaceitApiService from "../../../services/faceitApiService/FaceitApiService.js";

type Config = {
  faceitApiService: FaceitApiService;
};

export default function getCommand(
  app: FastifyInstance,
  options: { config: Config },
) {
  const { faceitApiService } = options.config;

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "",
    schema: {
      params: z.object({ id: z.string() }),
      querystring: z.object({ bot: z.string().optional() }),
      response: { 200: z.any() },
    },
    handler: async (req, res) => {
      const { bot = "nightbot" } = req.query;

      const player = await faceitApiService.getPlayer(req.params.id);
      if (player === undefined || player.player_id === undefined) {
        return res.code(200).send("player not found");
      }

      let fullUrlWithoutPath = `${req.protocol}://${req.host}`;
      if (env.ROUTE_PREFIX !== undefined) {
        fullUrlWithoutPath += env.ROUTE_PREFIX;
      }

      if (bot === "nightbot") {
        let response = "Bot: nightbot\n\n";
        response += `Add new Command:       !addcom !elo $(urlfetch ${fullUrlWithoutPath}/faceit/player/elo/${player.player_id}?nickname=$(querystring))\n`;
        response += `Edit existing Command: !editcom !elo $(urlfetch ${fullUrlWithoutPath}/faceit/player/elo/${player.player_id}?nickname=$(querystring))\n`;
        return res.code(200).send(response);
      }

      let response = "Bot not found, available bot(s): nightbot\n\n";
      response += `Url to be used:                ${fullUrlWithoutPath}/faceit/player/elo/${player.player_id}\n`;
      response += `Url with optional querystring: ${fullUrlWithoutPath}/faceit/player/elo/${player.player_id}?nickname=<optional_querystring>\n\n`;
      response += `=> replace "<optional_querystring>" with bot specific variable\n`;
      return res.code(200).send(response);
    },
  });
}
