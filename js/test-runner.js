(() => {
  const $ = id => document.getElementById(id);
  const trigger = $('test-trigger');
  if (!trigger) return;
  const base = (document.querySelector('meta[name="test-api-base"]')?.content || '').replace(/\/$/, '');
  let current, logCount = 0, busy = false, previousLogs = [];
  const duration = ms => `${((ms || 0) / 1000).toFixed(1)}s`;
  const appendLog = entry => {
    const line = document.createElement('div');
    line.className = `terminal-line ${entry.level || ''}`;
    const time = document.createElement('time');
    time.textContent = new Date(entry.time).toLocaleTimeString('ko-KR', { hour12: false });
    line.append(time, document.createTextNode(entry.message));
    const log = $('test-log');
    const follow = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
    log.append(line);
    if (follow) log.scrollTop = log.scrollHeight;
  };
  const request = async (url, options = {}) => {
    const response = await fetch(`${base}${url}`, { ...options, signal: AbortSignal.timeout(30000), cache: 'no-store' });
    const type = response.headers.get('content-type') || '';
    if (!type.includes('application/json')) throw new Error('테스트 실행 서버에 연결할 수 없습니다. 서버 주소와 실행 상태를 확인해 주세요.');
    const data = await response.json();
    if (response.status === 409 && data.run) return data.run;
    if (!response.ok) {
      if (response.status === 404) forget();
      throw new Error(data.error || '서버 요청에 실패했습니다.');
    }
    return data;
  };
  function render(run) {
    current = run;
    if (previousLogs.some((entry, index) => JSON.stringify(entry) !== JSON.stringify(run.logs[index]))) {
      $('test-log').replaceChildren(); logCount = 0;
    }
    run.logs.slice(logCount).forEach(appendLog);
    logCount = run.logs.length;
    previousLogs = run.logs;
    $('run-state').textContent = run.status.toUpperCase();
    $('run-state').style.color = ['failed', 'error'].includes(run.status) ? 'var(--fail)' : 'var(--pass)';
    const done = run.cases.filter(item => ['passed', 'failed', 'skipped'].includes(item.status)).length;
    $('run-progress').value = done;
    $('run-progress').max = run.cases.length;
    $('run-progress-text').textContent = run.phase || `${done} / ${run.cases.length} checks completed`;
    $('run-elapsed').textContent = duration(run.durationMs || Date.now() - Date.parse(run.startedAt));
  }
  function report(run) {
    $('test-results').hidden = false;
    $('test-report-link').disabled = false;
    $('result-meta').textContent = `${run.status.toUpperCase()} · Chromium · ${new Date(run.startedAt).toLocaleString('ko-KR')} · ${run.id.slice(0, 8)}`;
    $('result-stats').replaceChildren();
    for (const [label, value, style] of [
      ['PASSED', run.cases.filter(c => c.status === 'passed').length, 'passed'],
      ['FAILED', run.cases.filter(c => c.status === 'failed').length, 'failed'],
      ['SKIPPED', run.cases.filter(c => c.status === 'skipped').length, ''],
      ['DURATION', duration(run.durationMs), '']
    ]) {
      const card = document.createElement('div'); card.className = `result-stat ${style}`;
      const strong = document.createElement('strong'); strong.textContent = value;
      card.append(strong, document.createTextNode(label)); $('result-stats').append(card);
    }
    $('result-error').hidden = !(run.error || run.historyError);
    $('result-error').textContent = [run.error, run.historyError].filter(Boolean).join('\n');
    const runLink = $('github-run-link');
    if (runLink) {
      runLink.hidden = !run.runUrl;
      if (run.runUrl?.startsWith('https://github.com/')) runLink.href = run.runUrl;
    }
    $('case-results').replaceChildren();
    for (const item of run.cases) {
      const row = document.createElement('div'); row.className = 'case-result';
      for (const [text, className] of [[item.status.toUpperCase(), `case-status ${item.status}`], [item.name, 'case-name'], [duration(item.durationMs), 'case-duration']]) {
        const span = document.createElement('span'); span.className = className; span.textContent = text; row.append(span);
      }
      if (item.error) {
        const details = document.createElement('details'); const summary = document.createElement('summary'); summary.textContent = '오류 상세';
        const pre = document.createElement('pre'); pre.textContent = item.error; details.append(summary, pre); row.append(details);
      }
      $('case-results').append(row);
    }
  }
  const remember = id => { try { sessionStorage.setItem('things-run', id); } catch {} };
  const forget = () => { try { sessionStorage.removeItem('things-run'); } catch {} };
  async function execute(id) {
    if (busy) return;
    busy = true; trigger.disabled = true; trigger.textContent = '◌ 테스트 실행 중…';
    $('test-terminal').hidden = false; $('test-results').hidden = true; $('test-report-link').disabled = true;
    $('test-log').replaceChildren(); logCount = 0; previousLogs = [];
    $('run-state').textContent = 'CONNECTING'; $('run-progress').value = 0;
    $('run-elapsed').textContent = '0.0s'; $('run-progress-text').textContent = '실행 준비 중';
    try {
      let run = await request(id ? `/api/runs/${id}` : '/api/runs', id ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      remember(run.id);
      let failures = 0;
      while (true) {
        render(run);
        if (!['running', 'queued'].includes(run.status)) break;
        await new Promise(resolve => setTimeout(resolve, run.pollIntervalMs || 800));
        try { run = await request(`/api/runs/${run.id}`); failures = 0; }
        catch (error) { if (++failures >= 3) throw error; }
      }
      report(run); forget();
    } catch (error) {
      $('run-state').textContent = 'DISCONNECTED';
      $('run-progress-text').textContent = '연결 실패 · 다시 시도해 주세요';
      appendLog({ time: new Date().toISOString(), level: 'error', message: `${error.message}\n실행 결과를 확인하지 못했습니다. ‘테스트 실행하기’를 눌러 다시 연결할 수 있습니다.` });
    } finally { busy = false; trigger.disabled = false; trigger.textContent = '↻ 테스트 실행하기'; }
  }
  trigger.addEventListener('click', () => {
    let id; try { id = sessionStorage.getItem('things-run'); } catch {}
    execute(id);
  });
  $('test-report-link').addEventListener('click', () => { $('test-results').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); $('test-results').focus({ preventScroll: true }); });
  $('download-report').addEventListener('click', () => {
    if (!current) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(current, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `things-${current.id}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  const selected = new URLSearchParams(location.search).get('run');
  if (selected && /^(?:[a-f0-9-]{36}|\d{1,20})$/.test(selected)) execute(selected);
  else { try { const id = sessionStorage.getItem('things-run'); if (id) execute(id); } catch {} }
})();
