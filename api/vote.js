import { redis, checkCode, clean } from "./_db.js";

export default async function handler(req, res) {
  if (!checkCode(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  const b = req.body || {};
  const songId = clean(b.songId, 64);
  const voter = clean(b.voter, 64);
  const value = Number(b.value);
  // 1 up, -1 down, 0 neutral; a neutral vote still counts as having voted
  if (!songId || !voter || ![1, -1, 0].includes(value)) {
    return res.status(400).json({ error: "bad_request" });
  }
  if (!(await redis.hexists("songs", songId))) return res.status(404).json({ error: "not_found" });

  await redis.hset("votes", { [`${songId}|${voter}`]: value });
  if (b.name) await redis.hset("voters", { [voter]: clean(b.name, 40) });

  res.status(204).end();
}
