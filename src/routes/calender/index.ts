import type { FastifyInstance } from "fastify";

import type DachcsScraperService from "../../services/dachcsScraperService/DachcsScraperService.js";
import type FaceitApiService from "../../services/faceitApiService/FaceitApiService.js";
import customUrl from "./customUrl.js";
import getSubscribeUrl from "./getSubscribeUrl.js";
import subscribeUrl from "./subscribeUrl.js";

type Config = {
  faceitApiService: FaceitApiService;
  dachcsScraperService: DachcsScraperService;
};

export default function calender(
  app: FastifyInstance,
  options: { config: Config },
) {
  app.register((route) => {
    route.register(subscribeUrl, {
      prefix: "/subscribe-url",
      config: options.config,
    });

    route.register(customUrl, {
      prefix: "/custom-url",
      config: options.config,
    });

    route.register(getSubscribeUrl, { prefix: "/get-subscribe-url" });
  });
}
