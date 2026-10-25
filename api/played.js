import { redis, checkCode, clean } from "./_db.js";

// Called by the Telegram bot after a rehearsal: { id, date } logs a play, { id, done } moves a song to the repertoire
export default async function handler(req, res) {
  if (!checkCode(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }
  const secret = process.env.BOT_SECRET;
  if (!secret || req.headers["x-bot-secret"] !== secret) return res.status(403).json({ error: "forbidden" });

  const b = req.body || {};
  const id = clean(b.id, 64);
  const song = id && (await redis.hget("songs", id));
  if (!song) return res.status(404).json({ error: "not_found" });
  const date = clean(b.date, 10);
  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "bad_date" });
    song.played = [...new Set([...(song.played || []), date])].sort();
  }
  if (typeof b.done === "boolean") song.done = b.done;
  await redis.hset("songs", { [id]: song });
  return res.json(song);
}
