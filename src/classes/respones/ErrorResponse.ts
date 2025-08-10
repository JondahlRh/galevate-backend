import type { ApiErrorCode } from "../../types.js";

class ErrorResponseDetails<T> {
  issues: T;
  method: string;
  url: string;

  constructor(issues: T, method: string, url: string) {
    this.issues = issues;
    this.method = method;
    this.url = url;
  }

  toObject() {
    return {
      issues: this.issues,
      method: this.method,
      url: this.url,
    };
  }
}

export default class ErrorResponse<T> {
  message: string;
  code: ApiErrorCode;
  statusCode: number;
  details: ErrorResponseDetails<T>;

  constructor(
    message: string,
    code: ApiErrorCode,
    statusCode: number,
    details: { issues: T; method: string; url: string },
  ) {
    this.message = message;
    this.code = code;
    this.statusCode = statusCode;
    this.details = new ErrorResponseDetails(
      details.issues,
      details.method,
      details.url,
    );
  }

  toObject() {
    return {
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}
