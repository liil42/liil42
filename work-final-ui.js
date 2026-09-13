const { chromium } = require('playwright');
const path = require('path');
const BASE = 'http://localhost:5173';
const API = 'http://localhost:3002';

(async () => {
  const results = [];
  function record(n, p, d) { results.push({ n, p, d: String(d || '').slice(0, 140) }); }
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 120)); });

  // 注册一个测试用户
  const user = 'ui' + Date.now();
  const password = 'test123456';
  const reg = await fetch(API + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, password }) });
  const regBody = await reg.json();
  const token = regBody.token;
  record('注册测试用户', !!token, reg.status);

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate((t) => localStorage.setItem('daimaxuexi_token', t), token);
  await page.reload({ waitUntil: 'networkidle' });

  const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  record('默认深色科技风', theme === 'dark', 'theme=' + theme);

  const heroText = await page.locator('.analyze-hero h2').first().textContent().catch(() => '');
  record('首屏主入口文案', /粘进来|讲/.test(heroText || ''), heroText);

  const moreText = await page.locator('.more-modes-toggle').first().textContent().catch(() => '');
  record('更多分析方式折叠', /更多/.test(moreText || ''), moreText);

  await page.screenshot({ path: 'work-final-dashboard.png', fullPage: false });

  // 浅色切换
  await page.locator('.theme-toggle').click();
  await page.waitForTimeout(400);
  const lightTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  record('浅色主题切换', lightTheme === 'light', 'theme=' + lightTheme);
  await page.screenshot({ path: 'work-final-light.png' });
  await page.locator('.theme-toggle').click();
  await page.waitForTimeout(300);

  // 错题库导航
  await page.locator('nav.tabs button', { hasText: '错题库' }).click();
  await page.waitForTimeout(900);
  const mistakeTitle = await page.locator('.mistake-shell, .panel').first().textContent().catch(() => '');
  record('错题库页面可打开', (mistakeTitle || '').length > 0, (mistakeTitle || '').slice(0, 60));
  await page.screenshot({ path: 'work-final-mistakes.png' });

  // 历史导航
  await page.locator('nav.tabs button', { hasText: '历史' }).click();
  await page.waitForTimeout(900);
  const historyChips = await page.locator('.chip').count();
  record('历史页分类筛选', historyChips > 0, 'chips=' + historyChips);
  await page.screenshot({ path: 'work-final-history.png' });

  // 设置页：讲解模式 + 无支付入口
  await page.locator('nav.tabs button', { hasText: '设置' }).click();
  await page.waitForTimeout(900);
  const modeCards = await page.locator('.mode-card').count();
  record('设置页有新手/进阶模式', modeCards === 2, 'cards=' + modeCards);
  const bodyText = await page.locator('body').innerText();
  record('设置页无支付入口', !/微信 Native|支付二维码|模拟扫码/.test(bodyText), 'payment-free');
  await page.screenshot({ path: 'work-final-settings.png' });

  record('无控制台报错', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '));

  await browser.close();
  let fail = 0;
  for (const x of results) { if (!x.p) fail++; console.log((x.p ? 'PASS' : 'FAIL') + ' | ' + x.n + ' | ' + x.d); }
  console.log('TOTAL ' + (results.length - fail) + '/' + results.length);
})();
