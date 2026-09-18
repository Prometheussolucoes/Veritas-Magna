import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: '/opt/pw-browsers/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 1000 });
await page.goto('http://localhost:4173/index.html', { waitUntil: 'networkidle0' });
await page.click('[data-abre-modal="modal-privacidade"]');
await new Promise((r) => setTimeout(r, 200));
await page.screenshot({ path: process.argv[2] || 'modal.png' });
await browser.close();
