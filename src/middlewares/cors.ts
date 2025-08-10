import fastifyCors from "@fastify/cors";
import type { FastifyInstance } from "fastify";

export default function middlewareCors(app: FastifyInstance) {
  app.register(fastifyCors, {
    origin: true,
    methods: ["GET"],
  });
}
