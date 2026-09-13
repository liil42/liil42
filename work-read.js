const fs = require("fs");
const path = require("path");
const root = "F:\\AI-codex\daimaxuexi";
const p = path.join("client", "src", "api.js");
const file = path.join(root, p);
const src = fs.readFileSync(file, "utf8");
console.log(src.includes("无法连接后端服务") ? "HAS_NEW_MSG" : "OLD_VERSION");
console.log(src.slice(src.indexOf("let response"), src.indexOf("return data")));