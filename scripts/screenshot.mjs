import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: '/opt/pw-browsers/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();

await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://localhost:4173/index.html', { waitUntil: 'networkidle0' });
await page.screenshot({ path: process.argv[2] || 'preview-desktop-full.png', fullPage: true });

await page.setViewport({ width: 390, height: 844 });
await page.reload({ waitUntil: 'networkidle0' });
await page.screenshot({ path: process.argv[3] || 'preview-mobile-full.png', fullPage: true });

await browser.close();
