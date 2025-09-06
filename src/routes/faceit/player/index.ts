import type { FastifyInstance } from "fastify";

import type FaceitApiService from "../../../services/faceitApiService/FaceitApiService.js";
import type JsonLoggerService from "../../../services/jsonLoggerService/jsonLoggerService.js";
import elo from "./elo.js";
import getCommand from "./getCommand.js";

type Config = {
  faceitApiService: FaceitApiService;
  loggerServicePlayerIds: JsonLoggerService;
  loggerServiceUsers: JsonLoggerService;
};

export default function player(
  app: FastifyInstance,
  options: { config: Config },
) {
  app.register((route) => {
    route.register(elo, { prefix: "/elo/:id", config: options.config });
    route.register(getCommand, {
      prefix: "/get-command/:id",
      config: options.config,
    });
  });
}
