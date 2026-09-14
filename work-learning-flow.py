import json, time, urllib.request
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5173'
API = 'http://localhost:3002'
results = []

def record(name, ok, detail=''):
    results.append((name, ok, str(detail)[:200]))

def req(path, payload=None, method=None, token=None):
    headers = {'Content-Type': 'application/json; charset=utf-8'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    data = json.dumps(payload).encode('utf-8') if payload is not None else None
    r = urllib.request.Request(API + path, data=data, headers=headers, method=method or ('POST' if payload is not None else 'GET'))
    with urllib.request.urlopen(r, timeout=20) as resp:
        return resp.status, json.loads(resp.read().decode('utf-8'))

username = 'learn' + str(int(time.time()))
_, auth = req('/api/auth/register', {'username': username, 'password': 'test123456'})
token = auth['token']
_, settings = req('/api/settings/apikey', {'provider':'custom','apiKey':'sk-local-test','baseUrl':'http://127.0.0.1:9099/v1','model':'deepseek-chat'}, token=token)
code = 'const price = 3;\nconst count = 4;\nconst total = price * count;\nconsole.log(total);'
_, analysis = req('/api/analyze/snippet', {'code': code, 'language':'javascript', 'style':''}, token=token)
record('创建分析学习会话', bool(analysis.get('learning_session_id')), analysis.get('learning_session_id',''))
session_id = analysis.get('learning_session_id')

with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(viewport={'width':1440,'height':900})
    page = context.new_page()
    errors = []
    page.on('console', lambda msg: errors.append(msg.text[:180]) if msg.type == 'error' else None)
    page.goto(BASE, wait_until='networkidle')
    page.evaluate('(t) => localStorage.setItem("daimaxuexi_token", t)', token)
    page.reload(wait_until='networkidle')
    page.wait_for_timeout(1000)

    page.locator('nav.tabs button', has_text='继续上次学习').click()
    page.wait_for_timeout(1000)
    record('历史列表出现学习记录', page.locator('.history-item').count() >= 1, 'items=' + str(page.locator('.history-item').count()))
    if page.locator('.history-item').count() >= 1:
        page.locator('.history-item .history-open').first.click()
        page.wait_for_timeout(1200)
        record('历史详情还原代码', 'const price' in page.locator('body').inner_text(), 'ok')
        lines = page.locator('.code-line')
        record('逐行代码可点击', lines.count() >= 1, 'lines=' + str(lines.count()))
        if lines.count() >= 1:
            lines.first.click()
            page.wait_for_timeout(1600)
            text = page.locator('body').inner_text()
            record('点击行后出现讲解', '这一行' in text or '生活' in text or '变量' in text, text[-180:])

        question_box = page.locator('textarea[placeholder*="这个函数为什么"]')
        if question_box.count():
            question_box.first.fill('price 是从哪里来的？')
            ask = page.locator('button', has_text='发送追问')
            if ask.count():
                ask.first.click()
                page.wait_for_timeout(1800)

        understanding_box = page.locator('textarea[placeholder*="不用担心说错"]')
        if understanding_box.count():
            understanding_box.first.fill('我的理解：把单价和数量相乘，结果存进 total。')
            save = page.locator('button', has_text='保存并让 AI 点评')
            if save.count():
                save.first.click()
                page.wait_for_timeout(1800)
                record('页面提交我的理解', '我的理解' in page.locator('body').inner_text() or '理解' in page.locator('body').inner_text(), 'ok')

        page.screenshot(path='work-learning-flow.png', full_page=True)

    _, detail = req('/api/learning/sessions/' + session_id, token=token)
    session = detail.get('session', {})
    record('后端读到逐行讲解', len(session.get('insights', [])) >= 1, 'insights=' + str(len(session.get('insights', []))))
    record('后端读到单行提问', len(session.get('questions', [])) >= 1, 'questions=' + str(len(session.get('questions', []))))
    record('后端读到用户理解', len(session.get('understandings', [])) >= 1, 'understandings=' + str(len(session.get('understandings', []))))

    record('链路无控制台报错', len(errors) == 0, ' | '.join(errors[:2]))
    browser.close()

for name, ok, detail in results:
    print(('PASS' if ok else 'FAIL') + ' | ' + name + ' | ' + detail)
print('TOTAL ' + str(sum(1 for _, ok, _ in results if ok)) + '/' + str(len(results)))
