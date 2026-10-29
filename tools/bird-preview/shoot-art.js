// Tira as capturas da folha de prévia dos desenhos do Passarinho (tools/bird-preview/art.html), sobre fundo verde, areia ou escuro.
// Uso:  node tools/bird-preview/shoot-art.js [pasta-de-saída] [seções separadas por vírgula] [fundos separados por vírgula]
//   ex.: node tools/bird-preview/shoot-art.js /tmp/capturas bird-adulto,gatos green
// Variáveis: CHROMIUM_PATH (caminho do Chromium), NODE_PATH (onde está o playwright), PREVIEW_LOCK (arquivo de trava: se existir a variável, o script
// se reexecuta sob `flock` nesse arquivo, para vários agentes não abrirem o navegador ao mesmo tempo), CALM=1 (reduzir movimento), TIME (segundos), Z (zoom), ROWS (ex.: 0,5: só esses estados nas folhas do passarinho).
// Escreve <pasta>/<seção>-<fundo>.png e imprime os erros de página, se houver.
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawnSync } = require("child_process");

if (process.env.PREVIEW_LOCK && !process.env.PREVIEW_LOCKED) {
  const r = spawnSync("flock", [process.env.PREVIEW_LOCK, process.execPath, __filename, ...process.argv.slice(2)], { stdio: "inherit", env: { ...process.env, PREVIEW_LOCKED: "1" } });
  process.exit(r.status === null ? 1 : r.status);
}

const { chromium } = require("playwright");
const ALL = ["bird-filhote", "bird-jovem", "bird-adulto", "voo", "skins1", "skins2", "gatos", "gatos2", "gavioes", "itens", "fx", "cenario", "real"];
(async () => {
  const out = process.argv[2] || path.join(os.tmpdir(), "bird-art");
  const secs = process.argv[3] ? process.argv[3].split(",") : ALL, bgs = process.argv[4] ? process.argv[4].split(",") : ["green", "dark"];
  fs.mkdirSync(out, { recursive: true });
  const html = "file://" + path.join(__dirname, "art.html");
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
  let bad = 0;
  try {
    const page = await b.newPage({ viewport: { width: 1600, height: 1000 } });
    page.on("pageerror", (e) => { bad++; console.log("ERRO DE PÁGINA:", e.message); });
    page.on("console", (m) => { if (m.type() === "error") { bad++; console.log("ERRO NO CONSOLE:", m.text()); } });
    for (const sec of secs) for (const bg of bgs) {
      const q = `?sec=${sec}&bg=${bg}${process.env.CALM === "1" ? "&calm=1" : ""}${process.env.TIME ? "&time=" + process.env.TIME : ""}${process.env.Z ? "&z=" + process.env.Z : ""}${process.env.ROWS ? "&rows=" + process.env.ROWS : ""}`;
      await page.goto(html + q);
      await page.waitForFunction(() => window.__ready === true, null, { timeout: 15000 });
      const file = path.join(out, `${sec}-${bg}${process.env.TAG ? "-" + process.env.TAG : ""}.png`);
      await page.locator("#sheet").screenshot({ path: file });
      console.log("ok", file);
    }
  } finally { await b.close(); }
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
