import { API_ERROR_CODES } from "../../../types.js";
import ErrorResponse from "../ErrorResponse.js";

export default class SwaggerValidationError<T> extends ErrorResponse<T> {
  constructor(issues: T, method: string, url: string) {
    super(
      "Request doesn't match the schema",
      API_ERROR_CODES.SWAGGER_SERIALIZATION_ERROR,
      400,
      { issues, method, url },
    );
  }
}
