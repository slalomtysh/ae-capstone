export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class UpstreamError extends ApiError {
  constructor(message = 'Upstream service unavailable', details?: unknown) {
    super(502, 'UPSTREAM_UNAVAILABLE', message, details);
  }
}
