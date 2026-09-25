// Використання: npm run set-url -- https://rivna.vercel.app
// Прописує адресу сайту в capacitor.config.json і в офлайн-сторінку.
import fs from "node:fs";
const url = (process.argv[2] || "").replace(/\/+$/, "");
if (!/^https:\/\/[^/]+/.test(url)) {
  console.error("Вкажи адресу з https://, напр.: npm run set-url -- https://rivna.vercel.app");
  process.exit(1);
}
const cfgPath = new URL("../capacitor.config.json", import.meta.url);
const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
cfg.server.url = url;
const host = new URL(url).host;
cfg.server.allowNavigation = Array.from(new Set([host, ...(cfg.server.allowNavigation || [])]));
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n");
const off = new URL("../www/offline.html", import.meta.url);
fs.writeFileSync(off, fs.readFileSync(off, "utf8").replace(/const RIVNA_URL = "[^"]*"/, `const RIVNA_URL = "${url}"`));
console.log("✔ Адреса застосунку:", url);
