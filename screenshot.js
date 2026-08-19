const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 1920,
    height: 1440,
    deviceScaleFactor: 1
  });

  await page.goto('http://localhost:8765', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  await page.screenshot({
    path: path.join(__dirname, 'screenshot.png'),
    fullPage: true
  });

  console.log('Screenshot saved: E:\\ABU\\abuz8ai-site\\screenshot.png');
  await browser.close();
})().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
