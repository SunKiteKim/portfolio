import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { cases } from './journey.mjs';
import { historyStore } from './history.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
const allowed = new Set((process.env.ALLOWED_ORIGINS || `http://localhost:${port},http://127.0.0.1:${port}`).split(','));
const runs = new Map();
const history = historyStore(process.env.RUN_HISTORY_DIR || path.join(root, 'storage/runs'));
let active;
let lastStart = 0;
function log(run, message, level = 'info') { run.logs.push({ time: new Date().toISOString(), message, level }); }
function startRun() {
  const run = { id: randomUUID(), status: 'running', startedAt: new Date().toISOString(), target: 'https://www.things4demo.site/', cases: cases.map(name => ({ name, status: 'pending' })), logs: [] };
  runs.set(run.id, run);
  while (runs.size > 20) runs.delete(runs.keys().next().value);
  active = run;
  lastStart = Date.now();
  log(run, 'Chromium 시작 · things 장바구니 E2E');
  const child = fork(path.join(root, 'server/journey.mjs'), [], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
  let stderr = '';
  child.stderr.on('data', data => { stderr = (stderr + data).slice(-4000); });
  let finishing = false;
  const finish = async (error) => {
    if (finishing || run.status !== 'running') return;
    finishing = true;
    clearTimeout(timeout);
    if (error) { run.error = error; log(run, error, 'error'); }
    for (const item of run.cases) if (['pending', 'running'].includes(item.status)) item.status = 'skipped';
    const status = error ? 'error' : run.cases.every(item => item.status === 'passed') ? 'passed' : 'failed';
    run.finishedAt = new Date().toISOString();
    run.durationMs = Date.now() - Date.parse(run.startedAt);
    log(run, `실행 완료 · ${status.toUpperCase()}`, status === 'passed' ? 'success' : 'error');
    try {
      await history.save({ ...run, status });
      log(run, 'History 게시판에 결과를 저장했습니다.', 'success');
    } catch (error) {
      run.historyError = '결과 저장에 실패했습니다. JSON을 다운로드하여 보관해 주세요.';
      log(run, run.historyError, 'error');
      console.error('History save failed:', error.message);
    }
    run.status = status;
    active = null;
  };
  const timeout = setTimeout(() => { child.kill(); finish('실행 제한 시간(3분)을 초과했습니다.'); }, 180000);
  child.on('message', event => {
    if (finishing || run.status !== 'running') return;
    if (event.type === 'case') {
      Object.assign(run.cases[event.index], event);
      log(run, `[${event.index + 1}/${cases.length}] ${run.cases[event.index].name} · ${event.status.toUpperCase()}`, event.status === 'failed' ? 'error' : event.status === 'passed' ? 'success' : 'info');
      if (event.error) log(run, event.error, 'error');
    } else if (event.type === 'error') run.error = event.message;
  });
  child.on('error', error => finish(error.message));
  child.on('exit', code => finish(run.error || (code !== 0 && !run.cases.some(item => item.status === 'failed') ? stderr || '테스트 프로세스가 종료되었습니다.' : undefined)));
  return run;
}
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
http.createServer(async (req, res) => {
  const json = (code, value) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      if (req.headers.origin && !allowed.has(req.headers.origin)) return json(403, { error: '허용되지 않은 출처입니다.' });
      if (req.headers.origin) { res.setHeader('Access-Control-Allow-Origin', req.headers.origin); res.setHeader('Vary', 'Origin'); }
      if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Methods', 'GET, POST'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); res.writeHead(204); return res.end(); }
      if (url.pathname === '/api/runs' && req.method === 'POST') {
        if (!req.headers['content-type']?.startsWith('application/json')) return json(415, { error: 'JSON 요청이 필요합니다.' });
        if (active) return json(409, { error: '현재 실행 중인 테스트에 연결합니다.', run: active });
        if (Date.now() - lastStart < 30000) return json(429, { error: '잠시 후 다시 실행해 주세요. 실행 간격은 최소 30초입니다.' });
        return json(202, startRun());
      }
      if (url.pathname === '/api/runs' && req.method === 'GET') {
        const offset = Math.max(0, Number.parseInt(url.searchParams.get('offset'), 10) || 0);
        try { return json(200, await history.list(offset)); }
        catch { return json(500, { error: '저장된 실행 기록을 읽지 못했습니다.' }); }
      }
      if (req.method === 'GET' && /^\/api\/runs\/[a-f0-9-]{36}$/.test(url.pathname)) {
        const id = url.pathname.split('/').pop();
        const run = runs.get(id) || await history.get(id);
        return run ? json(200, run) : json(404, { error: '실행 기록이 만료되었습니다. 다시 실행해 주세요.' });
      }
      return json(404, { error: 'API를 찾을 수 없습니다.' });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(405, { error: 'Method not allowed' });
    const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname).slice(1);
    if (!/^(?:[\w-]+\.html|favicon\.svg|(?:css|js|img|data)\/[\w./-]+)$/.test(relative) || relative.split('/').includes('..')) return json(404, { error: 'Not found' });
    const data = await readFile(path.join(root, relative));
    res.writeHead(200, { 'Content-Type': `${mime[path.extname(relative)] || 'application/octet-stream'}; charset=utf-8`, 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { json(404, { error: '요청한 리소스를 찾을 수 없습니다.' }); }
}).listen(port, host, () => console.log(`Portfolio: http://${host}:${port}/project-cart.html`));
