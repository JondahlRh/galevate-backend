import type { FastifyInstance } from "fastify";

import type FaceitApiService from "../../services/faceitApiService/FaceitApiService.js";
import player from "./player/index.js";

export default function faceit(
  app: FastifyInstance,
  options: { config: { faceitApiService: FaceitApiService } },
) {
  app.register((route) => {
    route.register(player, { prefix: "/player", config: options.config });
  });
}
