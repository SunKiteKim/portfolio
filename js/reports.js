(() => {
  const board = document.getElementById('report-board');
  if (!board) return;
  const meta = document.getElementById('board-meta');
  const refresh = document.getElementById('refresh-history');
  const prev = document.getElementById('history-prev');
  const next = document.getElementById('history-next');
  const page = document.getElementById('history-page');
  const base = (document.querySelector('meta[name="test-api-base"]')?.content || '').replace(/\/$/, '');
  let offset = 0;
  let loading = false;
  async function load() {
    if (loading) return;
    loading = true;
    refresh.disabled = prev.disabled = next.disabled = true;
    meta.textContent = '실행 기록을 불러오는 중…';
    try {
      const response = await fetch(`${base}/api/runs?offset=${offset}`, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('History 서버 연결을 확인해 주세요.');
      const data = await response.json();
      board.replaceChildren();
      meta.textContent = `${data.total} runs · 최근 실행 순 · KST`;
      page.textContent = data.total ? `${Math.floor(offset / 20) + 1} / ${Math.ceil(data.total / 20)}` : '';
      if (!data.runs.length) {
        const empty = document.createElement('p'); empty.className = 'board-empty';
        empty.textContent = '아직 저장된 결과가 없습니다. Trigger로 테스트를 실행하면 이곳에 자동으로 쌓입니다.';
        board.append(empty);
      } else {
        const table = document.createElement('table'); table.className = 'board';
        const head = table.createTHead().insertRow();
        for (const title of ['No', 'Status', 'Title', 'Result', 'Duration', 'Run at']) {
          const th = document.createElement('th'); th.scope = 'col'; th.textContent = title; head.append(th);
        }
        const body = table.createTBody();
        data.runs.forEach((run, index) => {
          const row = body.insertRow();
          const cell = (value, className) => { const td = row.insertCell(); td.className = className; td.textContent = value; return td; };
          cell(data.total - offset - index, 'num');
          const badge = document.createElement('span');
          badge.className = `pill ${run.status === 'passed' ? 'pass' : 'fail'}`;
          badge.textContent = run.status.toUpperCase(); cell('', '').append(badge);
          const link = document.createElement('a');
          link.href = `./project-cart.html?run=${encodeURIComponent(run.id)}`;
          link.textContent = `things · Cart E2E · ${run.id.slice(0, 8)}`;
          cell('', 'title').append(link);
          cell(`${run.passed} passed / ${run.failed} failed / ${run.skipped} skipped`, 'result');
          cell(`${(run.durationMs / 1000).toFixed(1)}s`, 'result');
          cell(new Date(run.startedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false }), 'when');
        });
        board.append(table);
      }
      prev.disabled = offset === 0;
      next.disabled = offset + 20 >= data.total;
    } catch (error) {
      meta.textContent = '기록을 불러오지 못했습니다.';
      board.replaceChildren();
      const message = document.createElement('p'); message.className = 'board-empty';
      message.textContent = `${error.message} 새로고침으로 다시 시도해 주세요.`; board.append(message);
    } finally { loading = false; refresh.disabled = false; }
  }
  refresh.addEventListener('click', () => { offset = 0; load(); });
  prev.addEventListener('click', () => { offset = Math.max(0, offset - 20); load(); });
  next.addEventListener('click', () => { offset += 20; load(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
  setInterval(() => { if (!document.hidden) load(); }, 10000);
  load();
})();
