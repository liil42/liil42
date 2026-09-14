const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/package.json";
const j = JSON.parse(fs.readFileSync(p, "utf8"));
j.scripts.dev = "concurrently -k -n server,client -c blue,green \"npm run dev --workspace=server\" \"npm run dev --workspace=client\"";
j.scripts["dev:server"] = "npm run dev --workspace=server";
j.scripts["dev:client"] = "npm run dev --workspace=client";
j.scripts["start:all"] = "npm run dev";
fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
console.log(JSON.stringify(j.scripts, null, 2));