import { cases } from './cases.mjs';
import { github, readReport, workflow } from './github.mjs';
export function placeholder(run) {
  const complete = run.status === 'completed';
  return { id: String(run.id), status: complete ? 'error' : run.status === 'in_progress' ? 'running' : 'queued',
    phase: complete ? '리포트 없음' : run.status === 'in_progress' ? '브라우저 준비 중' : 'GitHub runner 대기 중',
    pollIntervalMs: 10000, startedAt: run.created_at, durationMs: complete ? Math.max(0, Date.parse(run.updated_at) - Date.parse(run.created_at)) : undefined,
    runUrl: run.html_url, target: 'https://www.things4demo.site/',
    cases: cases.map(name => ({ name, status: complete ? 'skipped' : 'pending' })),
    logs: [{ time: run.created_at, message: 'GitHub Actions 실행 요청 접수 · runner 준비 중', level: 'info' }],
    ...(complete ? { error: `실행이 ${run.conclusion} 상태로 종료되었지만 상세 결과가 저장되지 않았습니다. GitHub 실행 로그를 확인해 주세요.` } : {}) };
}
export async function getRun(id) {
  const saved = await readReport(`runs/${id}.json`);
  if (saved && !['running', 'queued'].includes(saved.status)) return { ...saved, pollIntervalMs: 10000 };
  const remote = await github(`actions/runs/${id}`);
  if (remote.path !== `.github/workflows/${workflow}`) throw Object.assign(new Error('테스트 실행을 찾을 수 없습니다.'), { status: 404 });
  if (saved && remote.status !== 'completed') return { ...saved, pollIntervalMs: 10000 };
  if (saved) return { ...saved, status: 'error', cases: saved.cases.map(c => ['running', 'pending'].includes(c.status) ? { ...c, status: 'skipped' } : c), error: `GitHub 실행 종료: ${remote.conclusion}. 결과 저장 전에 중단되었습니다.`, durationMs: Date.parse(remote.updated_at) - Date.parse(saved.startedAt) };
  return placeholder(remote);
}
export async function dispatch() {
  const recent = await github(`actions/workflows/${workflow}/runs?per_page=100`);
  const active = recent.workflow_runs.find(run => run.status !== 'completed');
  if (active) return { code: 409, data: { run: await getRun(String(active.id)) } };
  if (recent.workflow_runs.some(run => Date.now() - Date.parse(run.created_at) < 60000)) {
    return { code: 429, data: { error: '실행 요청은 1분 간격으로 가능합니다.' } };
  }
  const today = new Date().toISOString().slice(0, 10);
  if (recent.workflow_runs.filter(run => run.created_at.startsWith(today)).length >= 30) {
    return { code: 429, data: { error: '오늘의 테스트 실행 한도(30회)에 도달했습니다. 내일 다시 실행해 주세요.' } };
  }
  const result = await github(`actions/workflows/${workflow}/dispatches`, { method: 'POST', body: JSON.stringify({ ref: 'main' }) });
  if (!result?.workflow_run_id) throw new Error('GitHub가 실행 ID를 반환하지 않았습니다. History 또는 GitHub Actions에서 요청 결과를 확인해 주세요.');
  return { code: 202, data: placeholder({ id: result.workflow_run_id, status: 'queued', created_at: new Date().toISOString(), html_url: result.html_url }) };
}
export async function listRuns(offset = 0) {
  const remote = await github(`actions/workflows/${workflow}/runs?status=completed&per_page=100`);
  const index = await readReport('index.json') || [];
  const runs = remote.workflow_runs.map(run => index.find(item => item.id === String(run.id)) || {
    id: String(run.id), status: 'error', startedAt: run.created_at, durationMs: Date.parse(run.updated_at) - Date.parse(run.created_at), passed: 0, failed: 0, skipped: cases.length
  });
  // Indexed reports remain available even after GitHub's workflow retention expires.
  const merged = [...index];
  for (const run of runs) if (!merged.some(item => item.id === run.id)) merged.push(run);
  merged.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  return { total: merged.length, runs: merged.slice(offset, offset + 20) };
}
