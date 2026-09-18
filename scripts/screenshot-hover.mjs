import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: '/opt/pw-browsers/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://localhost:4173/index.html', { waitUntil: 'networkidle0' });

const btn = await page.evaluateHandle(() =>
  Array.from(document.querySelectorAll('a[href="#metodo"]')).find((a) => a.textContent.includes('Conhecer'))
);
const box = await btn.asElement().boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await new Promise((r) => setTimeout(r, 150));
await page.screenshot({ path: process.argv[2] || 'hover.png', clip: { x: 0, y: 300, width: 900, height: 400 } });

await browser.close();
