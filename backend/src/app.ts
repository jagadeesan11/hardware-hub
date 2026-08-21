import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { corsOrigins, env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        // No Origin header means curl / same-origin / server-to-server — allow it.
        if (!origin || corsOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`Origin not allowed by CORS: ${origin}`));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
