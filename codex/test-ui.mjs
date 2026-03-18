import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = 4173;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
};

function createServer() {
  return http.createServer(async (req, res) => {
    const requestPath = req.url === "/" ? "/index.html" : req.url;
    const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(__dirname, safePath);
    try {
      const data = await readFile(filePath);
      const ext = path.extname(filePath);
      res.writeHead(200, { "content-type": mimeTypes[ext] ?? "application/octet-stream" });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });
}

async function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runViewportChecks(page, viewportConfig) {
  await page.setViewport({
    width: viewportConfig.width,
    height: viewportConfig.height,
    isMobile: viewportConfig.name === "mobile",
    hasTouch: viewportConfig.name !== "desktop",
  });
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: "networkidle2" });

  await page.waitForFunction(() => window.__pianoState?.keyCount === 60);
  const visibleOctaves = await page.evaluate(() => window.__pianoState.visibleOctaves);
  await assert(
    visibleOctaves === viewportConfig.expectOctaves,
    `${viewportConfig.name}: expected ${viewportConfig.expectOctaves} visible octaves, got ${visibleOctaves}`
  );

  await page.click('[data-note="C2"]');
  await page.waitForFunction(() => window.__pianoState.playedNotes.length >= 1);
  const playedAfterClick = await page.evaluate(() => [...window.__pianoState.playedNotes]);
  await assert(playedAfterClick.length >= 1, `${viewportConfig.name}: click did not trigger note playback`);

 await page.keyboard.down("a");
  await new Promise((resolve) => setTimeout(resolve, 80));
  await page.keyboard.up("a");
  const playedAfterKeyboard = await page.evaluate(() => [...window.__pianoState.playedNotes]);
  await assert(
    playedAfterKeyboard.length >= 2,
    `${viewportConfig.name}: keyboard shortcut did not trigger note playback`
  );

  const rangeBefore = await page.$eval("#range-label", (node) => node.textContent);
  const ribbon = await page.$("#octave-ribbon");
  const ribbonBox = await ribbon?.boundingBox();
  if (!ribbonBox) {
    throw new Error(`${viewportConfig.name}: ribbon bounds unavailable`);
  }
  const y = ribbonBox.y + ribbonBox.height / 2;
  await page.mouse.move(ribbonBox.x + ribbonBox.width * 0.75, y);
  await page.mouse.down();
  await page.mouse.move(ribbonBox.x + ribbonBox.width * 0.25, y, { steps: 10 });
  await page.mouse.up();

  await page.waitForFunction(
    (previous) => document.querySelector("#range-label")?.textContent !== previous,
    {},
    rangeBefore
  );
  const rangeAfter = await page.$eval("#range-label", (node) => node.textContent);
  await assert(rangeAfter !== rangeBefore, `${viewportConfig.name}: ribbon swipe did not change octave range`);
}

const server = createServer();

server.listen(port, "127.0.0.1");

try {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  for (const viewport of [
    { name: "desktop", width: 1440, height: 1024, expectOctaves: 2 },
    { name: "tablet", width: 1024, height: 768, expectOctaves: 2 },
    { name: "mobile", width: 390, height: 844, expectOctaves: 1 },
  ]) {
    await runViewportChecks(page, viewport);
  }

  await browser.close();
  console.log("Puppeteer UI verification passed for desktop, tablet, and mobile.");
} finally {
  server.close();
}
