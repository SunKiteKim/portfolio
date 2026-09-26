import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { historyStore } from '../server/history.mjs';

test('history persists across store restarts, keeps failures, sorts and paginates', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'portfolio-history-'));
  const store = historyStore(directory);
  assert.deepEqual(await store.list(), { total: 0, runs: [] });
  const first = { id: randomUUID(), startedAt: '2026-09-01T00:00:00Z', status: 'failed', cases: [{ status: 'failed', error: 'Mismatch' }, { status: 'skipped' }], logs: [], durationMs: 1000 };
  const second = { ...first, id: randomUUID(), startedAt: '2026-09-02T00:00:00Z', status: 'passed', cases: [{ status: 'passed' }] };
  await store.save(first); await store.save(second);
  const restarted = historyStore(directory);
  assert.deepEqual(await restarted.get(first.id), first);
  const page = await restarted.list(0, 1);
  assert.equal(page.total, 2); assert.equal(page.runs[0].id, second.id);
  assert.equal((await restarted.list(1, 1)).runs[0].failed, 1);
  await restarted.save(first);
  assert.equal((await restarted.list()).total, 2);
  await assert.rejects(restarted.get('../unsafe'));
});
