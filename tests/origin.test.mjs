import { test } from 'node:test';
import assert from 'node:assert/strict';
import { endpoint } from '../lib/api-handler.mjs';

test('deployment same-origin requests work while foreign and forged forwarded origins stay blocked', async () => {
  const handler = endpoint(async (_req, res) => res.status(200).json({ ok: true }));
  async function request(origin, host, forwardedHost) {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await handler({ method: 'POST', headers: { origin, host, 'x-forwarded-host': forwardedHost } }, res);
    return res;
  }
  const host = 'portfolio-deployment-sunkitekim.vercel.app';
  const allowed = await request(`https://${host}`, host);
  assert.equal(allowed.code, 200);
  assert.equal(allowed.headers['Access-Control-Allow-Origin'], `https://${host}`);
  assert.equal((await request('https://portfolio.example.com', 'portfolio.example.com')).code, 200);
  assert.equal((await request('https://attacker.vercel.app', host)).code, 403);
  assert.equal((await request('https://attacker.example', host, 'attacker.example')).code, 403);
  assert.equal((await request(`http://${host}`, host)).code, 403);
});
