const fs = require('fs');
const p = 'client/public/tutorial/api-key.html';
let s = fs.readFileSync(p, 'utf8');
s = s.replace(/href="\/"/g, 'href="../"');
s = s.replace(/src="\/tutorial\//g, 'src="./');
fs.writeFileSync(p, s, 'utf8');
console.log(s.match(/(?:href|src)="[^"]+"/g).join('\n'));
