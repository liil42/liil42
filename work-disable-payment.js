const fs=require('fs');
function editLines(file, removeStartSet, textOps=[]){
  let lines=fs.readFileSync(file,'utf8').split(/\r?\n/);
  for(const op of textOps) lines=lines.map(line=>line.replace(op.from,op.to));
  const remove=new Set(removeStartSet);
  lines=lines.filter((_,idx)=>!remove.has(idx+1));
  fs.writeFileSync(file,lines.join('\n'),'utf8');
}
editLines('client/src/components/SettingsPanel.jsx',[12,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,175,176,177,178,179,180,181,182,183,184],[{from:', Gift',to:''}]);
const p='server/src/index.js';let s=fs.readFileSync(p,'utf8');s=s.replace("app.post('/api/membership/redeem', requireAuth, (req, res, next) => {\n  try {","app.post('/api/membership/redeem', requireAuth, (req, res, next) => {\n  return fail(res, 403, '\u4f1a\u5458\u652f\u4ed8\u529f\u80fd\u5c1a\u672a\u5f00\u653e', 'PAYMENT_DISABLED');\n  // eslint-disable-next-line no-unreachable\n  try {");fs.writeFileSync(p,s,'utf8');
