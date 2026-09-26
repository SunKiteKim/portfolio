import { chromium } from '@playwright/test';
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:3000/project-cart-report.html');
  await page.locator('.board tbody tr').first().waitFor({ timeout: 60000 });
  console.log('History:', await page.locator('.board tbody tr').first().innerText());
  await page.locator('.board tbody tr .title a').first().click();
  await page.locator('#test-results').waitFor();
  console.log('Saved report:', await page.locator('#result-meta').innerText());
} finally { await browser.close(); }
