const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const ENROLLMENTS_FILE = path.join(DATA_DIR, "enrollments.json");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

ensureEnrollmentsFile();

const server = http.createServer(async (request, response) => {
  try {
    if (request.url === "/api/enrollments" && request.method === "POST") {
      const enrollment = await readJsonBody(request);
      const enrollments = readEnrollments();
      enrollments.push(enrollment);
      writeEnrollments(enrollments);
      return sendJson(response, { ok: true, reference: enrollment.reference });
    }

    serveStatic(request, response);
  } catch (error) {
    console.error(error);
    sendJson(response, { error: "Server error." }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`BETTER TOMORROW website running at http://localhost:${PORT}`);
});

function serveStatic(request, response) {
  const requestedPath = decodeURIComponent(new URL(request.url, `http://localhost:${PORT}`).pathname);
  const filePath = requestedPath === "/" ? path.join(ROOT, "index.html") : path.join(ROOT, requestedPath);
  const safePath = path.normalize(filePath);

  if (!safePath.startsWith(ROOT)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(safePath, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    const contentType = mimeTypes[path.extname(safePath)] || "application/octet-stream";
    response.writeHead(200, { "Content-Type": contentType });
    response.end(content);
  });
}

function ensureEnrollmentsFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
  }

  if (!fs.existsSync(ENROLLMENTS_FILE)) {
    writeEnrollments([]);
  }
}

function readEnrollments() {
  return JSON.parse(fs.readFileSync(ENROLLMENTS_FILE, "utf8"));
}

function writeEnrollments(enrollments) {
  fs.writeFileSync(ENROLLMENTS_FILE, JSON.stringify(enrollments, null, 2));
}

function sendJson(response, payload, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Request body too large."));
      }
    });

    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });
}
