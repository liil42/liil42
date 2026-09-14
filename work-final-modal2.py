import json, time, urllib.request
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5173'
API = 'http://localhost:3002'
results = []

def record(name, ok, detail=''):
    results.append((name, ok, str(detail)[:150]))

def api(path, payload, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(API + path, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode('utf-8'))

username = 'modal2' + str(int(time.time()))
token = api('/api/auth/register', {'username': username, 'password': 'test123456'})['token']
api('/api/settings/apikey', {'provider': 'custom', 'apiKey': 'sk-test-local', 'baseUrl': 'http://127.0.0.1:9099/v1'}, token)

code = 'const price = 10;\nconst count = 3;\nconst total = price * count;\nconsole.log(total);'

def check(browser, width, height, label):
    context = browser.new_context(viewport={'width': width, 'height': height})
    page = context.new_page()
    page.goto(BASE, wait_until='networkidle')
    page.evaluate('(t) => localStorage.setItem("daimaxuexi_token", t)', token)
    page.reload(wait_until='networkidle')
    page.wait_for_timeout(1000)

    # 在分析页粘贴代码并触发学习弹窗
    page.locator('textarea.code-textarea').first.fill(code)
    page.locator('button', has_text='开始讲解').first.click()
    page.wait_for_selector('.modal-overlay', timeout=25000)
    page.wait_for_timeout(1500)

    overlay = page.locator('.modal-overlay').first
    modal = page.locator('.learning-modal').first
    box = modal.bounding_box()
    obox = overlay.bounding_box()
    cx = box['x'] + box['width'] / 2
    cy = box['y'] + box['height'] / 2
    dx = abs(cx - width / 2)
    dy = abs(cy - height / 2)
    record(label + ' 学习弹窗水平居中', dx <= max(12, width * 0.03), 'dx=%.1f dy=%.1f' % (dx, dy))
    record(label + ' 学习弹窗不超出视口', box['width'] <= width + 1 and box['height'] <= height + 1, 'modal=%.0fx%.0f viewport=%dx%d' % (box['width'], box['height'], width, height))
    record(label + ' 遮罩覆盖全屏', obox['width'] >= width - 1 and obox['height'] >= height - 1, 'overlay=%.0fx%.0f' % (obox['width'], obox['height']))
    page.screenshot(path='work-final-modal-' + label + '.png')
    context.close()

with sync_playwright() as p:
    browser = p.chromium.launch()
    check(browser, 1440, 900, 'desktop')
    check(browser, 390, 844, 'mobile')
    browser.close()

fail = 0
for name, ok, detail in results:
    print(('PASS' if ok else 'FAIL') + ' | ' + name + ' | ' + detail)
    if not ok:
        fail += 1
print('TOTAL ' + str(len(results) - fail) + '/' + str(len(results)))
