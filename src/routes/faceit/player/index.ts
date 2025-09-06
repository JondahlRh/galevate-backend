import type { FastifyInstance } from "fastify";

import type FaceitApiService from "../../../services/faceitApiService/FaceitApiService.js";
import elo from "./elo.js";
import getCommand from "./getCommand.js";

export default function player(
  app: FastifyInstance,
  options: { config: { faceitApiService: FaceitApiService } },
) {
  app.register((route) => {
    route.register(elo, { prefix: "/elo/:id", config: options.config });
    route.register(getCommand, {
      prefix: "/get-command/:id",
      config: options.config,
    });
  });
}
