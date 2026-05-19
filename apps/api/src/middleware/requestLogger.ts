import type { NextFunction, Request, Response } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const started = Date.now();
  const requestId = req.header('x-request-id') ?? '-';

  res.on('finish', () => {
    const durationMs = Date.now() - started;
    console.log(
      `[${requestId}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`,
    );
  });

  next();
}
