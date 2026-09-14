import json, time, urllib.request, urllib.error
from playwright.sync_api import sync_playwright

BASE='http://localhost:5173'; API='http://localhost:3002'; results=[]

def record(name, ok, detail=''):
    results.append((name, ok, str(detail)[:180]))

def req(path, payload=None, method=None, token=None, expect_error=False):
    headers={'Content-Type':'application/json; charset=utf-8'}
    if token: headers['Authorization']='Bearer '+token
    data=json.dumps(payload).encode('utf-8') if payload is not None else None
    r=urllib.request.Request(API+path,data=data,headers=headers,method=method or ('POST' if payload is not None else 'GET'))
    try:
        with urllib.request.urlopen(r,timeout=20) as resp:
            return resp.status,json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        body=json.loads(e.read().decode('utf-8'))
        if expect_error: return e.code,body
        raise

u='prod'+str(int(time.time()))
_,a=req('/api/auth/register',{'username':u,'password':'test123456'}); token=a['token']
req('/api/settings/apikey',{'provider':'custom','apiKey':'sk-local','baseUrl':'http://127.0.0.1:9099/v1','model':'deepseek-chat'},token=token)
code='const price = 3;\nconst count = 4;\nconst total = price * count;'
_,analysis=req('/api/analyze/snippet',{'code':code,'language':'javascript','style':''},token=token)
sid=analysis['learning_session_id']
_,insight=req('/api/learning/sessions/'+sid+'/lines/1/explain',{},token=token)

with sync_playwright() as p:
    b=p.chromium.launch(); c=b.new_context(viewport={'width':1440,'height':900}); page=c.new_page()
    errors=[]
    page.on('console',lambda m: errors.append(m.text[:160]) if m.type=='error' else None)
    page.goto(BASE,wait_until='networkidle'); page.evaluate('(t)=>localStorage.setItem("daimaxuexi_token",t)',token); page.reload(wait_until='networkidle'); page.wait_for_timeout(800)

    page.locator('nav.tabs button',has_text='历史').click(); page.wait_for_timeout(900)
    page.locator('.history-item .history-open').first.click(); page.wait_for_timeout(1200)
    page.locator('.code-line').first.click(); page.wait_for_timeout(1500)
    page.locator('button',has_text='加入错题').first.click(); page.wait_for_timeout(300)
    q=page.locator('textarea[placeholder*="具体没懂"]')
    if q.count():
        q.first.fill('这行的变量怎么理解？')
        page.locator('button',has_text='保存行错题').first.click(); page.wait_for_timeout(1800)
    page.screenshot(path='work-product-mistake-add.png',full_page=True)

    page.locator('nav.tabs button',has_text='错题库').click(); page.wait_for_timeout(1000)
    item_count=page.locator('.mistake-item').count()
    record('页面加入错题后可见',item_count>=1,'items='+str(item_count))
    if item_count:
        page.locator('.mistake-item .icon-btn[title*="复习"]').first.click(); page.wait_for_timeout(500)
        page.locator('.review-panel textarea').first.fill('先把价格和数量相乘，再存进 total。')
        page.locator('button',has_text='我答对了').first.click(); page.wait_for_timeout(1800)
        record('错题复习结果保存', '连对' in page.locator('body').inner_text(), 'ok')
    page.screenshot(path='work-product-review.png',full_page=True)

    page.locator('nav.tabs button',has_text='历史').click(); page.wait_for_timeout(900)
    input_new=page.locator('.category-create input')
    if input_new.count():
        category_name = '重点' + str(int(time.time() * 1000))[-6:]
        input_new.fill(category_name)
        page.locator('.category-create button').click(); page.wait_for_timeout(1000)
        body=page.locator('body').inner_text()
        record('分类可新增', category_name in body, 'ok')
        rename_btn=page.locator('.category-item .icon-btn[title="重命名分类"]').first
        if rename_btn.count():
            rename_btn.click(); page.wait_for_timeout(250)
            box=page.locator('.category-rename-input').first
            box.fill('核心项目')
            page.locator('.category-item .icon-btn[title="保存分类名称"]').first.click(); page.wait_for_timeout(1000)
            record('分类可改名', '核心项目' in page.locator('body').inner_text(), 'ok')
    page.screenshot(path='work-product-category.png',full_page=True)

    record('端到端无控制台报错',len(errors)==0,' | '.join(errors[:2]))
    b.close()

for n,ok,d in results: print(('PASS' if ok else 'FAIL')+' | '+n+' | '+d)
print('TOTAL '+str(sum(1 for _,ok,_ in results if ok))+'/'+str(len(results)))
