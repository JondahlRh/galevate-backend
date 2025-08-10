import type { FastifyInstance, HTTPMethods } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod/v4";

export default function ping(
  app: FastifyInstance,
  method: HTTPMethods,
  url: `/${string}`,
) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method,
    url,
    schema: {
      querystring: z.object({ name: z.string().min(4) }),
      response: { 200: z.string() },
    },
    handler: async (req, res) => {
      return res.code(200).send(`pong ${req.query.name}`);
    },
  });
}
