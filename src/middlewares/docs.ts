import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUI from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";
import { jsonSchemaTransform } from "fastify-type-provider-zod";
import path from "path";

import env from "../env.js";

export default function middlewareDocs(app: FastifyInstance) {
  app.register(fastifySwagger, {
    openapi: {
      // TODO: Use package.json value automatically
      info: {
        title: "galevate-backend",
        description: "",
        version: "0.0.0",
      },
      servers: [],
    },
    transform: jsonSchemaTransform,
  });

  app.register(fastifySwaggerUI, {
    routePrefix: path.join(env.ROUTE_PREFIX ?? "", "/docs"),
  });
}
