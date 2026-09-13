import json, time, urllib.request
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5173'
API = 'http://localhost:3002'
results = []

def record(name, ok, detail=''):
    results.append((name, ok, str(detail)[:140]))

def api_post(path, payload):
    req = urllib.request.Request(API + path, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode('utf-8'))

username = 'ui' + str(int(time.time()))
data = api_post('/api/auth/register', {'username': username, 'password': 'test123456'})
token = data['token']
record('注册测试用户', bool(token), 'ok')

with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(viewport={'width': 1440, 'height': 900})
    page = context.new_page()
    errors = []
    page.on('console', lambda msg: errors.append(msg.text[:120]) if msg.type == 'error' else None)

    page.goto(BASE, wait_until='networkidle')
    page.evaluate('(t) => localStorage.setItem("daimaxuexi_token", t)', token)
    page.reload(wait_until='networkidle')
    page.wait_for_timeout(1200)

    theme = page.evaluate('document.documentElement.getAttribute("data-theme")')
    record('默认深色科技风', theme == 'dark', 'theme=' + str(theme))

    hero = page.locator('.analyze-hero h2').first.inner_text()
    record('首屏是可用工具且文案口语化', bool(hero), hero)

    toggle = page.locator('.more-modes-toggle').first
    record('更多分析方式折叠入口存在', toggle.count() > 0, toggle.inner_text() if toggle.count() else '')
    page.screenshot(path='work-final-dashboard.png')

    page.locator('.theme-toggle').click()
    page.wait_for_timeout(500)
    light = page.evaluate('document.documentElement.getAttribute("data-theme")')
    record('浅色主题切换', light == 'light', 'theme=' + str(light))
    page.screenshot(path='work-final-light.png')
    page.locator('.theme-toggle').click()
    page.wait_for_timeout(400)

    page.locator('nav.tabs button', has_text='错题库').click()
    page.wait_for_timeout(1000)
    body = page.locator('body').inner_text()
    record('错题库页面可打开', '错题' in body, body[:60])
    page.screenshot(path='work-final-mistakes.png')

    page.locator('nav.tabs button', has_text='历史').click()
    page.wait_for_timeout(1000)
    chips = page.locator('.chip').count()
    record('历史页分类筛选', chips > 0, 'chips=' + str(chips))
    page.screenshot(path='work-final-history.png')

    page.locator('nav.tabs button', has_text='设置').click()
    page.wait_for_timeout(1000)
    cards = page.locator('.mode-card').count()
    record('设置页有新手/进阶模式', cards == 2, 'cards=' + str(cards))
    body_text = page.locator('body').inner_text()
    record('设置页无支付入口', ('微信 Native' not in body_text) and ('支付二维码' not in body_text), 'payment-free')
    page.screenshot(path='work-final-settings.png')

    record('无控制台报错', len(errors) == 0, ' | '.join(errors[:2]))
    browser.close()

fail = 0
for name, ok, detail in results:
    print(('PASS' if ok else 'FAIL') + ' | ' + name + ' | ' + detail)
    if not ok:
        fail += 1
print('TOTAL ' + str(len(results) - fail) + '/' + str(len(results)))
