import type { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

export default function middlewareTypeProvider(app: FastifyInstance) {
  app.setValidatorCompiler(validatorCompiler);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.setSerializerCompiler(serializerCompiler);
}
