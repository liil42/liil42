require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { createMembershipCodes } = require('../src/store');

const count = Math.min(parseInt(process.argv[2] || '1', 10) || 1, 100);
const codes = createMembershipCodes(count);
console.log(codes.join('\n'));
