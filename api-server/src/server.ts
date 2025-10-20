import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import IORedis from 'ioredis';
import messagesRouter from './routes/messages';
import automationsRouter from './routes/automations';
import apptRouter from './routes/appointments';
import slaRouter from './routes/sla';

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: true, limit: '512kb' }));
app.use(helmet());
app.use(cors({
  origin: (origin, cb) => cb(null, true), // tighten for prod with allowlist
  credentials: true
}));
app.use(compression());
app.use(pinoHttp({
  genReqId: (req) => (req.headers['x-request-id'] as string) || randomUUID(),
  customSuccessMessage: () => 'ok',
  customErrorMessage: () => 'error',
}));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'api', time: new Date().toISOString() });
});

app.use(messagesRouter);
app.use(automationsRouter);
app.use(apptRouter);
app.use(slaRouter);

// Redis connection for readiness check
const red = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

app.get('/api/ready', async (_req, res) => {
  try {
    await red.ping();
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});
