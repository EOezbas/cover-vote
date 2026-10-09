import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Optional shared password, set ROOM_CODE in Vercel env vars
export function checkCode(req, res) {
  const code = process.env.ROOM_CODE;
  if (code && req.headers["x-room-code"] !== code) {
    res.status(401).json({ error: "wrong_code" });
    return false;
  }
  return true;
}

export const clean = (s, n = 120) => String(s ?? "").trim().slice(0, n);
