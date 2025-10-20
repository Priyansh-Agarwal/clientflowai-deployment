import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server';

describe('API', () => {
  it('health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
  it('outbound sandbox sms', async () => {
    const res = await request(app)
      .post('/api/messages/outbound?orgId=00000000-0000-0000-0000-000000000000')
      .send({ orgId: '00000000-0000-0000-0000-000000000000', channel: 'sms', to_addr: '+15555550123', body: 'hi' });
    expect(res.status).toBe(200);
    expect(res.body).toBeTruthy();
  });
});
