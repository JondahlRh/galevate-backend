import { API_ERROR_CODES } from "../../../types.js";
import ErrorResponse from "../ErrorResponse.js";

export default class InternalServerError extends ErrorResponse<string> {
  constructor(issues: string, method: string, url: string) {
    super("Unknown server error", API_ERROR_CODES.INTERNAL_SERVER_ERROR, 500, {
      issues,
      method,
      url,
    });
  }
}
