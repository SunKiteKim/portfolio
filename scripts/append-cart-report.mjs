import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "data", "cart-reports.json");
const MAX_POSTS = 50;

const readJson = () => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return { updatedAt: null, posts: [] };
  }
};

const parsePayload = () => {
  const raw = process.env.REPORT_PAYLOAD;
  if (raw && raw !== "{}" && raw !== "null") {
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error("REPORT_PAYLOAD is not valid JSON");
    }
  }

  if (!process.env.INPUT_STATUS && !process.env.INPUT_TITLE) return null;

  return {
    status: process.env.INPUT_STATUS,
    title: process.env.INPUT_TITLE,
    passed: process.env.INPUT_PASSED,
    failed: process.env.INPUT_FAILED,
    skipped: process.env.INPUT_SKIPPED,
    durationMs: process.env.INPUT_DURATION_MS,
    runUrl: process.env.INPUT_RUN_URL,
    reportUrl: process.env.INPUT_REPORT_URL,
  };
};

const payload = parsePayload();
if (!payload) {
  console.error("No report payload. Set REPORT_PAYLOAD or INPUT_* env vars.");
  process.exit(1);
}

const now = new Date().toISOString();
const failed = Number(payload.failed) || 0;
const status = payload.status === "fail" || failed > 0 ? "fail" : "pass";
const post = {
  id: now.replace(/[:.]/g, "-"),
  title: payload.title || `Cart E2E · ${status.toUpperCase()} · ${now.slice(0, 16).replace("T", " ")}`,
  status,
  passed: Number(payload.passed) || 0,
  failed,
  skipped: Number(payload.skipped) || 0,
  durationMs: Number(payload.durationMs) || 0,
  createdAt: payload.createdAt || now,
  runUrl: payload.runUrl || "",
  reportUrl: payload.reportUrl || "",
};

const data = readJson();
data.updatedAt = now;
data.posts = [post, ...(data.posts || [])]
  .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  .slice(0, MAX_POSTS);

fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Appended report ${post.id} (${post.status})`);
