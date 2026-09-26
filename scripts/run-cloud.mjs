import { fork } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { cases } from '../lib/cases.mjs';
import { github, readReport, writeReport, reportBranch } from '../lib/github.mjs';

const id = process.env.GITHUB_RUN_ID;
if (!/^\d+$/.test(id || '')) throw new Error('GITHUB_RUN_ID is required');
try { await github(`git/ref/heads/${reportBranch}`); }
catch (error) {
  if (error.status !== 404) throw error;
  const main = await github('git/ref/heads/main');
  await github('git/refs', { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${reportBranch}`, sha: main.object.sha }) });
}
const run = { id, status: 'running', startedAt: new Date().toISOString(), target: 'https://www.things4demo.site/',
  runUrl: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${id}`,
  cases: cases.map(name => ({ name, status: 'pending' })), logs: [] };
const log = (message, level = 'info') => { run.logs.push({ time: new Date().toISOString(), message, level }); console.log(message); };
log('GitHub runner 준비 완료 · Chromium 테스트 시작');
await writeReport(`runs/${id}.json`, run);
let dirty = false;
let publishing = Promise.resolve();
let publishError;
function publish() {
  if (!dirty) return;
  dirty = false;
  const snapshot = structuredClone(run);
  publishing = publishing.then(() => writeReport(`runs/${id}.json`, snapshot)).catch(error => { publishError = error; });
}
const interval = setInterval(publish, 3000);
const child = fork(new URL('../server/journey.mjs', import.meta.url), [], { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
child.on('message', event => {
  if (event.type === 'case') {
    Object.assign(run.cases[event.index], event);
    log(`[${event.index + 1}/${cases.length}] ${run.cases[event.index].name} · ${event.status.toUpperCase()}`, event.status === 'failed' ? 'error' : event.status === 'passed' ? 'success' : 'info');
    if (event.error) log(event.error, 'error');
  } else if (event.type === 'error') { run.error = event.message; log(event.message, 'error'); }
  dirty = true;
});
const timeout = setTimeout(() => { run.error = '테스트 제한 시간(3분)을 초과했습니다.'; child.kill(); }, 180000);
const code = await new Promise(resolve => {
  child.on('exit', resolve);
  child.on('error', error => { run.error = error.message; resolve(1); });
});
clearTimeout(timeout); clearInterval(interval);
await publishing;
for (const item of run.cases) if (['pending', 'running'].includes(item.status)) item.status = 'skipped';
run.status = run.error ? 'error' : code === 0 && run.cases.every(c => c.status === 'passed') ? 'passed' : 'failed';
run.finishedAt = new Date().toISOString(); run.durationMs = Date.now() - Date.parse(run.startedAt);
log(`실행 완료 · ${run.status.toUpperCase()}`, run.status === 'passed' ? 'success' : 'error');
await mkdir('test-results', { recursive: true });
await writeFile('test-results/cloud-report.json', JSON.stringify(run, null, 2));
// A final durable write is required even when intermediate log publication failed.
await writeReport(`runs/${id}.json`, run);
const index = await readReport('index.json') || [];
const summary = { id, status: run.status, startedAt: run.startedAt, durationMs: run.durationMs,
  passed: run.cases.filter(c => c.status === 'passed').length, failed: run.cases.filter(c => c.status === 'failed').length, skipped: run.cases.filter(c => c.status === 'skipped').length };
await writeReport('index.json', [summary, ...index.filter(item => item.id !== id)].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)).slice(0, 1000));
if (publishError) console.warn('일부 중간 로그 업로드가 지연되었지만 최종 결과는 저장되었습니다.');
process.exitCode = run.status === 'passed' ? 0 : 1;
