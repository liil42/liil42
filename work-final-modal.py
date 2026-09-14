import json, time, urllib.request
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5173'
API = 'http://localhost:3002'
results = []

def record(name, ok, detail=''):
    results.append((name, ok, str(detail)[:150]))

def api(path, payload, token=None, method='POST'):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(API + path, data=json.dumps(payload).encode('utf-8') if payload is not None else None, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode('utf-8'))

username = 'modal' + str(int(time.time()))
token = api('/api/auth/register', {'username': username, 'password': 'test123456'})['token']
api('/api/settings/apikey', {'provider': 'custom', 'apiKey': 'sk-test-local', 'baseUrl': 'http://127.0.0.1:9099/v1'}, token)
code = 'const price = 10;\nconst count = 3;\nconst total = price * count;\nconsole.log(total);'
analysis = api('/api/analyze/snippet', {'code': code, 'language': 'javascript'}, token)
record('分析成功并返回会话', bool(analysis.get('learning_session_id')), analysis.get('learning_session_id', ''))

def check_viewport(browser, width, height, label):
    context = browser.new_context(viewport={'width': width, 'height': height})
    page = context.new_page()
    page.goto(BASE, wait_until='networkidle')
    page.evaluate('(t) => localStorage.setItem("daimaxuexi_token", t)', token)
    page.reload(wait_until='networkidle')
    page.wait_for_timeout(1200)

    # 打开历史并进入学习弹窗
    page.locator('nav.tabs button', has_text='历史').click()
    page.wait_for_timeout(1200)
    opened = False
    try:
        page.locator('.history-open').first.click(timeout=5000)
        opened = True
    except Exception as exc:
        record(label + ' 打开学习弹窗', False, str(exc)[:120])
    page.wait_for_timeout(1500)

    overlay = page.locator('.modal-overlay').first
    modal = page.locator('.learning-modal').first
    if overlay.count() == 0 or modal.count() == 0:
        record(label + ' 学习弹窗居中', False, 'modal not found, opened=' + str(opened))
        page.screenshot(path='work-final-modal-' + label + '.png')
        context.close()
        return

    box_overlay = overlay.bounding_box()
    box_modal = modal.bounding_box()
    cx_modal = box_modal['x'] + box_modal['width'] / 2
    cy_modal = box_modal['y'] + box_modal['height'] / 2
    cx_view = width / 2
    cy_view = height / 2
    dx = abs(cx_modal - cx_view)
    dy = abs(cy_modal - cy_view)
    center_ok = dx <= max(12, width * 0.03) and dy <= max(40, height * 0.08)
    fits = box_modal['width'] <= width + 1 and box_modal['height'] <= height + 1
    record(label + ' 学习弹窗水平居中', dx <= max(12, width * 0.03), 'dx=%.1f dy=%.1f' % (dx, dy))
    record(label + ' 学习弹窗不超出视口', fits, 'modal=%.0fx%.0f viewport=%dx%d' % (box_modal['width'], box_modal['height'], width, height))
    page.screenshot(path='work-final-modal-' + label + '.png')
    context.close()

with sync_playwright() as p:
    browser = p.chromium.launch()
    check_viewport(browser, 1440, 900, 'desktop')
    check_viewport(browser, 390, 844, 'mobile')
    browser.close()

fail = 0
for name, ok, detail in results:
    print(('PASS' if ok else 'FAIL') + ' | ' + name + ' | ' + detail)
    if not ok:
        fail += 1
print('TOTAL ' + str(len(results) - fail) + '/' + str(len(results)))

