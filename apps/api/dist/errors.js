export class ApiError extends Error {
    status;
    code;
    details;
    constructor(status, code, message, details) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
    }
}
export class UpstreamError extends ApiError {
    constructor(message = 'Upstream service unavailable', details) {
        super(502, 'UPSTREAM_UNAVAILABLE', message, details);
    }
}
