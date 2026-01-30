import fastify from "fastify";
import { schedule } from "node-cron";

import env from "./env.js";
import middlewareCors from "./middlewares/cors.js";
import middlewareDocs from "./middlewares/docs.js";
import middlewareTypeProvider from "./middlewares/typeProvider.js";
import calender from "./routes/calender/index.js";
import errorRoute from "./routes/error.js";
import faceit from "./routes/faceit/index.js";
import ping from "./routes/ping.js";
import volanta from "./routes/volanta.js";
import DachcsScraperService from "./services/dachcsScraperService/DachcsScraperService.js";
import FaceitApiService from "./services/faceitApiService/FaceitApiService.js";
import JsonLoggerService from "./services/jsonLoggerService/jsonLoggerService.js";
import VolantaService from "./services/volantaService.js";

export default async function app() {
  const faceitApiService = FaceitApiService.connect();
  const volantaService = VolantaService.connect();

  // const dachcsScraperService = await DachcsScraperService.init();

  const loggerServicePlayerIds = JsonLoggerService.connect("playerIds.json");
  const loggerServiceUsers = JsonLoggerService.connect("users.json");
  const loggerServiceBots = JsonLoggerService.connect("bots.json");

  const app = fastify({
    logger: env.ENVIRONMENT === "dev",
    ignoreTrailingSlash: true,
  });

  middlewareCors(app);
  middlewareDocs(app);
  middlewareTypeProvider(app);

  app.after(() => {
    app.register(
      (route) => {
        route.register(ping, { prefix: "/ping" });

        route.register(faceit, {
          prefix: "/faceit",
          config: {
            faceitApiService,
            loggerServicePlayerIds,
            loggerServiceUsers,
            loggerServiceBots,
          },
        });

        route.register(volanta, {
          prefix: "/volanta",
          config: { volantaService },
        });

        // route.register(calender, {
        //   prefix: "/calender",
        //   config: { faceitApiService, dachcsScraperService },
        // });
      },
      { prefix: env.ROUTE_PREFIX },
    );
  });

  errorRoute(app);

  // await dachcsScraperService.main();
  schedule("0 * * * *", async () => {
    // await dachcsScraperService.main();
  });

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
}
