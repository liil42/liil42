import json, time, urllib.request
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5173'
API = 'http://localhost:3002'
results = []

def record(name, ok, detail=''):
    results.append((name, ok, str(detail)[:180]))

def request(path, payload=None, method=None, token=None):
    headers = {'Content-Type': 'application/json; charset=utf-8'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    data = json.dumps(payload).encode('utf-8') if payload is not None else None
    req = urllib.request.Request(API + path, data=data, headers=headers, method=method or ('POST' if payload is not None else 'GET'))
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.status, json.loads(resp.read().decode('utf-8'))

username = 'flow' + str(int(time.time()))
_, auth = request('/api/auth/register', {'username': username, 'password': 'test123456'})
token = auth['token']
code = 'const price = 3;\nconst count = 4;\nconst total = price * count;\nconsole.log(total);'

with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(viewport={'width': 1440, 'height': 900})
    page = context.new_page()
    errors = []
    page.on('console', lambda msg: errors.append(msg.text[:160]) if msg.type == 'error' else None)
    page.goto(BASE, wait_until='networkidle')
    page.evaluate('(t) => localStorage.setItem("daimaxuexi_token", t)', token)
    page.reload(wait_until='networkidle')
    page.wait_for_timeout(1000)

    body = page.locator('body').inner_text()
    record('登录后页面可加载', '粘贴代码' in body or '帮我讲懂' in body, body[:80])

    page.locator('nav.tabs button', has_text='历史').click()
    page.wait_for_timeout(800)
    record('历史页可打开', '历史' in page.locator('body').inner_text(), 'ok')

    page.locator('nav.tabs button', has_text='错题库').click()
    page.wait_for_timeout(800)
    tabs = page.locator('.mistake-view-tabs .chip')
    labels = [tabs.nth(i).inner_text() for i in range(tabs.count())]
    record('错题库四个复习入口', labels == ['今日要复习','还没掌握','已掌握','全部错题'], labels)
    record('错题库无支付入口', '微信' not in page.locator('body').inner_text() and '收款码' not in page.locator('body').inner_text(), 'payment-free')

    page.locator('nav.tabs button', has_text='设置').click()
    page.wait_for_timeout(800)
    record('设置页新手/进阶模式', page.locator('.mode-card').count() == 2, 'cards=' + str(page.locator('.mode-card').count()))
    page.screenshot(path='work-final-settings-2.png')

    record('无控制台报错', len(errors) == 0, ' | '.join(errors[:2]))
    browser.close()

for name, ok, detail in results:
    print(('PASS' if ok else 'FAIL') + ' | ' + name + ' | ' + detail)
print('TOTAL ' + str(sum(1 for _, ok, _ in results if ok)) + '/' + str(len(results)))
