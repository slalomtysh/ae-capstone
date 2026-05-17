import express from 'express';
import cors from 'cors';
import { requestContext } from './middleware/requestContext.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createApiRouter } from './routes/api.js';
import { DefaultEspnClient } from './espn/client.js';
import { MemoryCache } from './lib/cache.js';
import type { EspnClient } from './types.js';

export function createApp(deps?: { espnClient?: EspnClient; cache?: MemoryCache }) {
  const app = express();
  const espnClient = deps?.espnClient ?? new DefaultEspnClient();
  const cache = deps?.cache ?? new MemoryCache();

  app.use(requestContext);
  app.use(requestLogger);
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', createApiRouter(espnClient, cache));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
