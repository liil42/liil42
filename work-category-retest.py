import json, time, urllib.request
from playwright.sync_api import sync_playwright
BASE='http://localhost:5173'; API='http://localhost:3002'; out=[]
def record(n,ok,d=''): out.append((n,ok,str(d)[:160]))
def req(path,payload=None,method=None,token=None):
    h={'Content-Type':'application/json; charset=utf-8'}
    if token: h['Authorization']='Bearer '+token
    data=json.dumps(payload).encode('utf-8') if payload is not None else None
    r=urllib.request.Request(API+path,data=data,headers=h,method=method or ('POST' if payload is not None else 'GET'))
    with urllib.request.urlopen(r,timeout=20) as resp: return resp.status,json.loads(resp.read().decode('utf-8'))
u='cat'+str(int(time.time()))
_,a=req('/api/auth/register',{'username':u,'password':'test123456'}); token=a['token']
with sync_playwright() as p:
    b=p.chromium.launch(); c=b.new_context(viewport={'width':1440,'height':900}); page=c.new_page()
    errs=[]; page.on('console',lambda m: errs.append(m.text[:160]) if m.type=='error' else None)
    page.goto(BASE,wait_until='networkidle'); page.evaluate('(t)=>localStorage.setItem("daimaxuexi_token",t)',token); page.reload(wait_until='networkidle'); page.wait_for_timeout(800)
    page.locator('nav.tabs button',has_text='历史').click(); page.wait_for_timeout(800)
    box=page.locator('.category-create input')
    box.fill('重点项目')
    page.locator('.category-create button').click(); page.wait_for_timeout(1200)
    _,cats=req('/api/learning/categories',token=token)
    names=[x['name'] for x in cats.get('categories',[])]
    record('分类新增写入数据库', '重点项目' in names, names)
    rename=page.locator('.category-item .icon-btn[title="重命名分类"]').first
    if rename.count():
        rename.click(); page.wait_for_timeout(300)
        inp=page.locator('.category-rename-input').first; inp.fill('核心项目')
        page.locator('.category-item .icon-btn[title="保存分类名称"]').first.click(); page.wait_for_timeout(1200)
        _,cats2=req('/api/learning/categories',token=token)
        names2=[x['name'] for x in cats2.get('categories',[])]
        record('分类改名写入数据库', '核心项目' in names2 and '重点项目' not in names2, names2)
    else:
        record('分类改名按钮存在',False,'missing')
    record('分类链路无控制台报错',len(errs)==0,' | '.join(errs[:2]))
    page.screenshot(path='work-category-retest.png',full_page=True); b.close()
for n,ok,d in out: print(('PASS' if ok else 'FAIL')+' | '+n+' | '+d)
print('TOTAL '+str(sum(1 for _,ok,_ in out if ok))+'/'+str(len(out)))
