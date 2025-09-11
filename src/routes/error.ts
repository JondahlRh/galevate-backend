import type { FastifyInstance } from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from "fastify-type-provider-zod";

import InternalServerError from "../classes/responses/general/InternalServerError.js";
import SwaggerSerializationError from "../classes/responses/swagger/SwaggerSerializationError.js";
import SwaggerValidationError from "../classes/responses/swagger/SwaggerValidationError.js";

export default function errorRoute(app: FastifyInstance) {
  app.setErrorHandler((err, req, res) => {
    if (hasZodFastifySchemaValidationErrors(err)) {
      return res
        .code(400)
        .send(new SwaggerValidationError(err.validation, req.method, req.url));
    }

    if (isResponseSerializationError(err)) {
      return res
        .code(500)
        .send(
          new SwaggerSerializationError(err.cause.issues, req.method, req.url),
        );
    }

    return res
      .code(500)
      .send(new InternalServerError(err.message, req.method, req.url));
  });
}
