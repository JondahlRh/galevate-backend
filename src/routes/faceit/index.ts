import type { FastifyInstance } from "fastify";

import type FaceitApiService from "../../services/faceitApiService/FaceitApiService.js";
import type JsonLoggerService from "../../services/jsonLoggerService/jsonLoggerService.js";
import player from "./player/index.js";

type Config = {
  faceitApiService: FaceitApiService;
  loggerServicePlayerIds: JsonLoggerService;
  loggerServiceUsers: JsonLoggerService;
  loggerServiceBots: JsonLoggerService;
};

export default function faceit(
  app: FastifyInstance,
  options: { config: Config },
) {
  app.register((route) => {
    route.register(player, { prefix: "/player", config: options.config });
  });
}
