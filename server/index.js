import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { handleGenerate } from "./routes/generate.js";
import { handleGenerateSvg } from "./routes/generateSvg.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const staticRoot = path.resolve(projectRoot, "src");
const port = Number(process.env.PORT || 3000);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const json = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  response.end(JSON.stringify(payload));
};

const getStaticFilePath = (requestUrl) => {
  const pathname = new URL(requestUrl,'http://localhost').pathname;
  const relativePath =
    pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
  const filePath = path.resolve(staticRoot, relativePath);

  if (!filePath.startsWith(staticRoot)) {
    return null;
  }

  return filePath;
};

const serveStatic = async (request, response) => {
  const filePath = getStaticFilePath(request.url || "/");
  if (!filePath) {
    json(response, 403, { ok: false, error: "Forbidden" });
    return true;
  }

  try {
    const body = await readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
    });
    response.end(body);
    return true;
  } catch (error) {
    if (error?.code !== "ENOENT") {
      json(response, 500, { ok: false, error: "Failed to read static file" });
      return true;
    }
  }

  return false;
};

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    });
    response.end();
    return;
  }

  if (request.url === "/health") {
    json(response, 200, { ok: true });
    return;
  }

  if (request.url === "/api/generate" && request.method === "POST") {
    await handleGenerate(request, response, { json });
    return;
  }

  if (request.url === "/api/generate-svg" && request.method === "POST") {
    await handleGenerateSvg(request, response, { json });
    return;
  }

  if (request.method === "GET" || request.method === "HEAD") {
    const served = await serveStatic(request, response);
    if (served) {
      return;
    }
  }

  json(response, 404, { ok: false, error: "Not found" });
});

server.listen(port, () => {
  console.log(`Badge Maker server listening on http://localhost:${port}`);
});
