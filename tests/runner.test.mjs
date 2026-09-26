import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

test('runner UI: progress, failed report, retry, download and mobile layout', async () => {
  const server = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, PORT: '3011' }, stdio: 'pipe' });
  let browser;
  try {
    await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); });
    browser = await chromium.launch();
    const page = await browser.newPage();
    const run = { id: 'test-run', status: 'running', startedAt: new Date().toISOString(), logs: [{ time: new Date().toISOString(), message: '상품 확인', level: 'info' }], cases: [{ name: '상품 확인', status: 'running' }, { name: '금액 검증', status: 'pending' }] };
    await page.route('**/api/runs**', async route => {
      if (route.request().method() === 'GET') {
        run.status = 'failed'; run.durationMs = 1200;
        run.cases = [{ name: '상품 확인', status: 'passed', durationMs: 400 }, { name: '금액 검증', status: 'failed', durationMs: 800, error: '<script>unsafe</script>' }];
      }
      await route.fulfill({ json: run });
    });
    await page.goto('http://127.0.0.1:3011/project-cart.html');
    assert.equal(await page.locator('#test-terminal').isVisible(), false);
    await page.locator('#test-trigger').click();
    assert.equal(await page.locator('#test-trigger').isDisabled(), true);
    await page.locator('#test-results').waitFor();
    assert.match(await page.locator('#result-meta').innerText(), /FAILED/);
    assert.equal(await page.locator('.case-result').count(), 2);
    assert.equal(await page.locator('#case-results script').count(), 0);
    assert.equal(await page.locator('#test-trigger').isEnabled(), true);
    const download = page.waitForEvent('download');
    await page.locator('#download-report').click();
    assert.match((await download).suggestedFilename(), /things-test-run.json/);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
    await page.unroute('**/api/runs**');
    await page.route('**/api/runs**', route => route.fulfill({ status: 503, json: { error: '서버 점검 중' } }));
    await page.locator('#test-trigger').click();
    await page.waitForFunction(() => document.getElementById('run-state').textContent === 'DISCONNECTED');
    assert.equal(await page.locator('#test-results').isVisible(), false);
    assert.equal(await page.locator('#test-trigger').isEnabled(), true);
    const forbidden = await fetch('http://127.0.0.1:3011/api/runs', { method: 'POST', headers: { Origin: 'https://untrusted.example', 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(forbidden.status, 403);
    assert.equal((await fetch('http://127.0.0.1:3011/server/index.mjs')).status, 404);
  } finally { await browser?.close(); server.kill(); }
});
