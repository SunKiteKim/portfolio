import { chromium, expect } from '@playwright/test';

import { cases } from '../lib/cases.mjs';
export { cases };
const send = (event) => process.send?.(event);
let browser;
let failed = false;
let page;
let productName;
let unitPrice;
const money = (value) => Number(value.replace(/[^0-9]/g, ''));
const steps = [
  async () => {
    const response = await page.goto('https://www.things4demo.site/', { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('a[href^="/product/"]').first()).toBeVisible();
  },
  async () => {
    const urls = await page.locator('a[href^="/product/"]').evaluateAll(links => [...new Set(links.map(a => a.href))].slice(0, 12));
    for (const url of urls) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      const button = page.getByRole('button', { name: '장바구니 담기', exact: true });
      await expect(button).toBeVisible();
      if (await button.isEnabled() && Number(await page.getByRole('spinbutton').getAttribute('max')) >= 2) {
        productName = await page.locator('main h1').innerText();
        unitPrice = money(await page.locator('main h1 + p > span').nth(1).innerText());
        expect(unitPrice).toBeGreaterThan(0);
        return;
      }
    }
    throw new Error('수량 변경을 검증할 재고 2개 이상의 상품이 없습니다.');
  },
  async () => {
    const button = page.getByRole('button', { name: '장바구니 담기', exact: true });
    const added = page.waitForResponse(response => response.request().method() === 'POST' && response.request().headers()['next-action']);
    await button.click();
    expect((await added).ok()).toBeTruthy();
    await expect(button).toBeEnabled();
    await page.goto('https://www.things4demo.site/cart');
    await expect(page.locator('main a.product-name')).toHaveText(productName);
    await expect(page.locator('main aside p').nth(1)).toHaveText(`${unitPrice.toLocaleString('ko-KR')}원`);
  },
  async () => {
    await page.getByRole('button', { name: '+', exact: true }).click();
    await expect(page.locator('main aside p').nth(1)).toHaveText(`${(unitPrice * 2).toLocaleString('ko-KR')}원`);
    await expect(page.getByRole('button', { name: '+', exact: true }).locator('..').locator('span')).toHaveText('2');
  },
  async () => {
    await page.reload();
    await expect(page.locator('main a.product-name')).toHaveText(productName);
    await expect(page.getByRole('button', { name: '+', exact: true }).locator('..').locator('span')).toHaveText('2');
    await expect(page.locator('main aside p').nth(1)).toHaveText(`${(unitPrice * 2).toLocaleString('ko-KR')}원`);
  },
  async () => {
    const minus = page.getByRole('button', { name: '-', exact: true });
    await minus.click();
    await expect(page.locator('main aside p').nth(1)).toHaveText(`${unitPrice.toLocaleString('ko-KR')}원`);
    await expect(minus).toBeEnabled();
    await minus.click();
    await expect(page.getByText('아직 담긴 사물이 없습니다.', { exact: false })).toBeVisible();
    await expect(page.locator('main a.product-name')).toHaveCount(0);
  }
];

async function main() {
  try {
    browser = await chromium.launch();
    const context = await browser.newContext({ locale: 'ko-KR' });
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(30000);
    for (let i = 0; i < steps.length; i++) {
      if (failed) { send({ type: 'case', index: i, status: 'skipped', durationMs: 0 }); continue; }
      send({ type: 'case', index: i, status: 'running' });
      const start = Date.now();
      try {
        await steps[i]();
        send({ type: 'case', index: i, status: 'passed', durationMs: Date.now() - start });
      } catch (error) {
        failed = true;
        send({ type: 'case', index: i, status: 'failed', durationMs: Date.now() - start, error: error.message.slice(0, 4000) });
      }
    }
  } catch (error) { failed = true; send({ type: 'error', message: error.message.slice(0, 4000) }); }
  finally { await browser?.close(); }
  process.exitCode = failed ? 1 : 0;
}
if (process.send) main();
