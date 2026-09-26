import { chromium } from '@playwright/test';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('http://127.0.0.1:3000/project-cart.html');
  await page.locator('#test-trigger').click();
  await page.locator('#test-results').waitFor({ timeout: 200000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/live-desktop.png', fullPage: true });
  console.log(await page.locator('#result-meta').innerText());
  console.log(await page.locator('#case-results').innerText());
  console.log(await page.locator('#case-results pre').allTextContents());
  await page.getByRole('link', { name: 'History · 지난 테스트 결과 보기' }).click();
  await page.locator('.board tbody tr').first().waitFor();
  console.log('History:', await page.locator('.board tbody tr').first().innerText());
  await page.locator('.board tbody tr .title a').first().click();
  await page.locator('#test-results').waitFor();
  console.log('Saved report:', await page.locator('#result-meta').innerText());
} finally { await browser.close(); }
