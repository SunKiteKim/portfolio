import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dispatch, getRun, listRuns } from '../lib/cloud-runs.mjs';
import handler from '../api/runs.js';

test('cloud API: dispatch, duplicate prevention, limits, saved reports and interrupted runs', async () => {
  const originalFetch = global.fetch;
  const originalToken = process.env.GH_ACTIONS_TOKEN;
  process.env.GH_ACTIONS_TOKEN = 'test-only-token';
  let calls = [];
  let responder;
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return responder(url, options);
  };
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
  const content = body => json({ content: Buffer.from(JSON.stringify(body)).toString('base64') });
  const remote = { id: 123, path: '.github/workflows/things-e2e.yml', status: 'queued', created_at: new Date().toISOString(), html_url: 'https://github.com/SunKiteKim/portfolio/actions/runs/123' };
  try {
    responder = (url, options) => options.method === 'POST' ? json({ workflow_run_id: 123, html_url: remote.html_url }) : json({ workflow_runs: [] });
    assert.equal((await dispatch()).data.status, 'queued');
    assert.equal(JSON.parse(calls.at(-1).options.body).ref, 'main');
    responder = url => url.includes('contents/') ? json({}, 404) : url.includes('/workflows/') ? json({ workflow_runs: [remote] }) : json(remote);
    calls = [];
    assert.equal((await dispatch()).code, 409);
    assert.equal(calls.some(call => call.options.method === 'POST'), false);
    responder = () => json({ workflow_runs: [{ ...remote, status: 'completed' }] });
    assert.equal((await dispatch()).code, 429);
    const saved = { id: '123', status: 'passed', logs: [], cases: [{ status: 'passed' }] };
    responder = () => content(saved);
    assert.equal((await getRun('123')).status, 'passed');
    responder = url => url.includes('contents/') ? json({}, 404) : json({ ...remote, status: 'completed', conclusion: 'cancelled', updated_at: remote.created_at });
    const cancelled = await getRun('123');
    assert.equal(cancelled.status, 'error');
    assert.equal(cancelled.cases.every(c => c.status === 'skipped'), true);
    const index = Array.from({ length: 25 }, (_, i) => ({ id: String(i + 1), startedAt: `2026-09-${String(i + 1).padStart(2, '0')}T00:00:00Z`, status: 'passed' }));
    responder = url => url.includes('contents/') ? content(index) : json({ workflow_runs: [], total_count: 0 });
    const history = await listRuns(20);
    assert.equal(history.total, 25); assert.equal(history.runs.length, 5);
    delete process.env.GH_ACTIONS_TOKEN;
    if (!process.env.GITHUB_TOKEN) await assert.rejects(dispatch(), /GH_ACTIONS_TOKEN/);
    const response = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } };
    await handler({ method: 'POST', headers: { origin: 'https://untrusted.example', 'content-type': 'application/json' } }, response);
    assert.equal(response.code, 403);
    assert.equal(JSON.stringify(response.body).includes('test-only-token'), false);
  } finally {
    global.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.GH_ACTIONS_TOKEN;
    else process.env.GH_ACTIONS_TOKEN = originalToken;
  }
});
