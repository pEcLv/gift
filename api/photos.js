const { randomUUID } = require("node:crypto");

const PHOTO_PREFIX = "christmas-tree/photos/";
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_BODY_BYTES = 6 * 1024 * 1024;
let blobClientPromise;

async function handleGetPhotos(req, res) {
  ensureBlobToken();

  const { list } = await getBlobClient();
  const result = await list({
    prefix: PHOTO_PREFIX,
    limit: 100
  });

  const photos = result.blobs
    .filter((blob) => blob.pathname && blob.pathname.startsWith(PHOTO_PREFIX))
    .sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime())
    .map((blob) => ({
      url: blob.url,
      pathname: blob.pathname,
      size: blob.size,
      uploadedAt: blob.uploadedAt
    }));

  sendJson(res, 200, { photos });
}

async function handlePostPhoto(req, res) {
  ensureBlobToken();

  const { put } = await getBlobClient();
  const body = await readJsonBody(req);
  const { buffer, contentType } = parseDataUrl(body.dataUrl);
  const extension = pickExtension(contentType, body.filename);
  const safeName = sanitizeName(body.filename);
  const pathname = `${PHOTO_PREFIX}${Date.now()}-${randomUUID()}-${safeName}.${extension}`;

  const blob = await put(pathname, buffer, {
    access: "public",
    addRandomSuffix: false,
    contentType
  });

  sendJson(res, 201, {
    photo: {
      url: blob.url,
      pathname: blob.pathname,
      size: buffer.length,
      uploadedAt: new Date().toISOString()
    }
  });
}

module.exports = async function photosHandler(req, res) {
  try {
    if (req.method === "GET") {
      await handleGetPhotos(req, res);
      return;
    }

    if (req.method === "POST") {
      await handlePostPhoto(req, res);
      return;
    }

    res.setHeader("Allow", "GET, POST");
    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    sendJson(res, statusCode, {
      error: statusCode === 500 ? "Photo storage failed" : error.message
    });
  }
};

function getBlobClient() {
  if (!blobClientPromise) {
    blobClientPromise = import("@vercel/blob");
  }

  return blobClientPromise;
}

function ensureBlobToken() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    const error = new Error("Missing BLOB_READ_WRITE_TOKEN");
    error.statusCode = 503;
    throw error;
  }
}

function readJsonBody(req) {
  if (Buffer.isBuffer(req.body)) {
    return Promise.resolve(JSON.parse(req.body.toString("utf8") || "{}"));
  }

  if (req.body && typeof req.body === "object") {
    return Promise.resolve(req.body);
  }

  if (typeof req.body === "string") {
    return Promise.resolve(JSON.parse(req.body || "{}"));
  }

  return new Promise((resolve, reject) => {
    let rawBody = "";
    let tooLarge = false;

    req.on("data", (chunk) => {
      rawBody += chunk;
      if (Buffer.byteLength(rawBody) > MAX_BODY_BYTES) {
        tooLarge = true;
      }
    });

    req.on("end", () => {
      if (tooLarge) {
        const error = new Error("Photo payload is too large");
        error.statusCode = 413;
        reject(error);
        return;
      }

      try {
        resolve(rawBody ? JSON.parse(rawBody) : {});
      } catch (error) {
        error.statusCode = 400;
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=]+)$/i.exec(dataUrl || "");
  if (!match) {
    const error = new Error("Expected a base64 image data URL");
    error.statusCode = 400;
    throw error;
  }

  const contentType = match[1].toLowerCase();
  const buffer = Buffer.from(match[2], "base64");

  if (!buffer.length) {
    const error = new Error("Photo payload is empty");
    error.statusCode = 400;
    throw error;
  }

  if (buffer.length > MAX_UPLOAD_BYTES) {
    const error = new Error("Photo must be smaller than 4 MB after compression");
    error.statusCode = 413;
    throw error;
  }

  return { buffer, contentType };
}

function sanitizeName(filename) {
  const withoutExtension = String(filename || "photo").replace(/\.[^.]+$/, "");
  const cleaned = withoutExtension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);

  return cleaned || "photo";
}

function pickExtension(contentType, filename) {
  const byType = {
    "image/avif": "avif",
    "image/gif": "gif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  };

  if (byType[contentType]) {
    return byType[contentType];
  }

  const fromName = String(filename || "").toLowerCase().match(/\.(jpe?g|png|webp|gif|avif)$/);
  if (fromName) {
    return fromName[1] === "jpeg" ? "jpg" : fromName[1];
  }

  return "jpg";
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
