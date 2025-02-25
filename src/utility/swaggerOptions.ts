import type { SwaggerOptions } from "@fastify/swagger";
import type { FastifySwaggerUiOptions } from "@fastify/swagger-ui";
import { jsonSchemaTransform } from "fastify-type-provider-zod";

const swaggerOptions = {
  openapi: {
    info: { title: "Galevate Backend", version: "1.0.0" },
    servers: [],
  },
  transform: jsonSchemaTransform,
} as const satisfies SwaggerOptions;

const swaggerUiOptions = {
  routePrefix: "/api/docs",
} as const satisfies FastifySwaggerUiOptions;

export { swaggerOptions, swaggerUiOptions };
