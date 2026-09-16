const fs=require('fs');const p='client/src/components/SettingsPanel.jsx';let lines=fs.readFileSync(p,'utf8').split(/\r?\n/);
const block=[
'              <input',
'                type="password"',
'                value={deletePassword}',
'                onChange={(event) => setDeletePassword(event.target.value)}',
'                placeholder="输入当前密码确认注销"',
'              />',
'              <div className="action-row">',
'                <button className="btn btn-danger" onClick={deleteAccount} disabled={loading || !deletePassword}>',
'                  确认永久注销',
'                </button>',
'                <button className="btn" onClick={() => setShowDeleteAccount(false)} disabled={loading}>',
'                  取消',
'                </button>',
'              </div>'
];
lines.splice(153,4,...block);fs.writeFileSync(p,lines.join('\n'),'utf8');console.log('jsx_restored');
