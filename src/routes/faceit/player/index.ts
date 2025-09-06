import type { FastifyInstance } from "fastify";

import type FaceitApiService from "../../../services/faceitApiService/FaceitApiService.js";
import elo from "./elo.js";

export default function player(
  app: FastifyInstance,
  options: { config: { faceitApiService: FaceitApiService } },
) {
  app.register((route) => {
    route.register(elo, { prefix: "/:id/elo", config: options.config });
  });
}
