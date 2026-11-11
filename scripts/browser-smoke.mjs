import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json"
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    const pathname = decodeURIComponent(url.pathname);
    const relative = pathname === "/" ? "index.html" : pathname.slice(1);
    const file = resolve(root, relative);
    if (file !== root && !file.startsWith(root + sep)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const body = await readFile(file);
    response.writeHead(200, { "content-type": mime[extname(file)] || "application/octet-stream" });
    response.end(body);
  } catch (_) {
    response.writeHead(404).end("Not found");
  }
});

await new Promise(resolveServer => server.listen(4173, "127.0.0.1", resolveServer));
let browser;
try {
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true
  });
  const pageErrors = [];
  const webSockets = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("websocket", socket => webSockets.push(socket.url()));

  await page.goto("http://127.0.0.1:4173/", { waitUntil: "load" });
  await page.locator("#startBtn").waitFor({ state: "visible" });
  await page.locator("#startBtn").click();
  await page.waitForFunction(() =>
    document.getElementById("start").classList.contains("hidden") &&
    !document.getElementById("hud").classList.contains("hidden")
  );

  const canvasReady = await page.locator("#game").evaluate(canvas => canvas.width > 0 && canvas.height > 0);
  if (!canvasReady) throw new Error("Canvas did not initialize at a non-zero size.");
  const missionText = await page.locator("#mission").textContent();
  if (!missionText.includes("ENEMIES REMAIN")) throw new Error("Offline campaign did not enter the mission state.");

  await page.locator("#pauseBtn").click();
  await page.locator("#resumeBtn").waitFor({ state: "visible" });
  await page.locator("#resumeBtn").click();
  await page.locator("#pauseBtn").waitFor({ state: "visible" });

  await page.locator("#pauseBtn").click();
  await page.locator("#quitBtn").click();
  await page.locator("#onlineBtn").click();
  const initialOnlineStatus = await page.locator("#onlineStatus").textContent();
  if (!initialOnlineStatus.toLowerCase().includes("not configured")) {
    throw new Error("Online UI did not clearly report the missing signaling configuration.");
  }
  await page.locator("#createRoomBtn").click();
  const createStatus = await page.locator("#onlineStatus").textContent();
  if (!createStatus.toLowerCase().includes("not active yet")) {
    throw new Error("Create room did not refuse to fake a connection without a signaling URL.");
  }
  if (webSockets.length) throw new Error("The unconfigured online UI unexpectedly opened a WebSocket.");

  if (pageErrors.length) throw new Error("Browser runtime errors: " + pageErrors.join(" | "));
  console.log("Browser smoke passed: mobile canvas, mission start, pause/resume, and honest offline-only online state.");
} finally {
  if (browser) await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
