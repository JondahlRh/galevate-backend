import fastify from "fastify";

import env from "./env.js";
import middlewareCors from "./middlewares/cors.js";
import middlewareDocs from "./middlewares/docs.js";
import middlewareTypeProvider from "./middlewares/typeProvider.js";
import errorRoute from "./routes/error.js";
import ping from "./routes/ping.js";

export default async function app() {
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
        ping(route, "/ping", "GET");
      },
      { prefix: env.ROUTE_PREFIX },
    );
  });

  errorRoute(app);

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
}
