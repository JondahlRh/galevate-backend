import fastify from "fastify";

import env from "./env.js";
import middlewareCors from "./middlewares/cors.js";
import middlewareDocs from "./middlewares/docs.js";
import middlewareTypeProvider from "./middlewares/typeProvider.js";
import errorRoute from "./routes/error.js";
import faceit from "./routes/faceit/index.js";
import ping from "./routes/ping.js";
import FaceitApiService from "./services/faceitApiService/FaceitApiService.js";

export default async function app() {
  const faceitApiService = FaceitApiService.connect();

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
          config: { faceitApiService },
        });
      },
      { prefix: env.ROUTE_PREFIX },
    );
  });

  errorRoute(app);

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
}
