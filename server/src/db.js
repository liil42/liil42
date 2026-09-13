const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const file = process.env.APP_DATA_FILE || path.join(dataDir, 'app.json');
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(path.dirname(file), { recursive: true });

const defaults = {
  users: [],
  apiKeys: [],
  membershipCodes: [],
  analysisRuns: []
};

let state = defaults;
if (fs.existsSync(file)) {
  try {
    state = { ...defaults, ...JSON.parse(fs.readFileSync(file, 'utf8')) };
  } catch (error) {
    state = defaults;
  }
}

const db = {
  data: state,
  save() {
    const temp = `${file}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(db.data, null, 2));
    fs.renameSync(temp, file);
  }
};

module.exports = db;
