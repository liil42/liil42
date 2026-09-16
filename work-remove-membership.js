const fs=require('fs');const p='server/src/index.js';let lines=fs.readFileSync(p,'utf8').split(/\r?\n/);
// Remove the admin codes route by locating exact string boundaries in the current file.
let adminStart=lines.findIndex(l=>l.includes("app.post('/api/admin/codes'"));
if(adminStart<0)throw new Error('admin route not found');
let adminEnd=adminStart;while(adminEnd<lines.length && !(lines[adminEnd].trim()==='});' && adminEnd>adminStart))adminEnd++;
lines.splice(adminStart,adminEnd-adminStart+2);
// Remove redeem route imported route block.
let redeemStart=lines.findIndex(l=>l.includes("app.post('/api/membership/redeem'"));
if(redeemStart<0)throw new Error('redeem route not found');
let redeemEnd=redeemStart;while(redeemEnd<lines.length && !(lines[redeemEnd].trim()==='});' && redeemEnd>redeemStart))redeemEnd++;
lines.splice(redeemStart,redeemEnd-redeemStart+2);
lines=lines.filter(l=>!l.trim().startsWith('createMembershipCodes,')&&!l.trim().startsWith('redeemMembership,'));
fs.writeFileSync(p,lines.join('\n'),'utf8');console.log('done');
