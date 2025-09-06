import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod/v4";

export default function ping(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "",
    schema: {
      querystring: z.object({ name: z.string().min(4) }),
      response: { 200: z.string() },
    },
    handler: async (req, res) => {
      return res.code(200).send(`pong ${req.query.name}`);
    },
  });
}
