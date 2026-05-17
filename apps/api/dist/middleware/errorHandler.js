import { ApiError } from '../errors.js';
export function notFoundHandler(req, res) {
    res.status(404).json({
        error: {
            code: 'NOT_FOUND',
            message: `Route not found: ${req.method} ${req.path}`
        }
    });
}
export function errorHandler(error, req, res, _next) {
    const requestId = req.header('x-request-id') ?? null;
    if (error instanceof ApiError) {
        res.status(error.status).json({
            error: {
                code: error.code,
                message: error.message,
                details: error.details,
                requestId
            }
        });
        return;
    }
    res.status(500).json({
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Unexpected server error',
            requestId
        }
    });
}
