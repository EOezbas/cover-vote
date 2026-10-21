import { randomUUID } from "node:crypto";
import { redis, checkCode, clean } from "./_db.js";

export default async function handler(req, res) {
  if (!checkCode(req, res)) return;

  if (req.method === "GET") {
    const [songs, votes, voters] = await Promise.all([
      redis.hgetall("songs"),
      redis.hgetall("votes"),
      redis.hgetall("voters"),
    ]);
    // The person who added a song counts as +1 for it; songs added before this rule get that vote here
    const all = votes || {};
    const missing = {};
    for (const song of Object.values(songs || {})) {
      const key = `${song.id}|${song.addedBy}`;
      if (song.addedBy && song.addedBy !== "unknown" && !(key in all)) missing[key] = 1;
    }
    if (Object.keys(missing).length) {
      await redis.hset("votes", missing);
      Object.assign(all, missing);
    }
    res.setHeader("Cache-Control", "no-store");
    return res.json({
      songs: Object.values(songs || {}),
      votes: all,
      voters: voters || {},
    });
  }

  if (req.method === "POST") {
    const b = req.body || {};
    const title = clean(b.title);
    const artist = clean(b.artist);
    const link = clean(b.link, 300);
    const voter = clean(b.voter, 64);
    if (!title) return res.status(400).json({ error: "title_required" });
    if (!voter) return res.status(400).json({ error: "voter_required" });
    if (link && !/^https?:\/\//i.test(link)) return res.status(400).json({ error: "bad_link" });

    const song = { id: randomUUID(), title, artist, link, addedBy: voter, createdAt: Date.now() };
    await redis.hset("songs", { [song.id]: song });
    await redis.hset("votes", { [`${song.id}|${voter}`]: 1 });
    if (b.name) await redis.hset("voters", { [voter]: clean(b.name, 40) });
    return res.status(201).json(song);
  }

  if (req.method === "PATCH") {
    // Anyone can set or clear the key a song is played in
    const b = req.body || {};
    const id = clean(b.id, 64);
    const song = id && (await redis.hget("songs", id));
    if (!song) return res.status(404).json({ error: "not_found" });
    song.key = clean(b.key, 12);
    await redis.hset("songs", { [id]: song });
    return res.json(song);
  }

  if (req.method === "DELETE") {
    const id = clean(req.query.id, 64);
    const voter = clean(req.query.voter, 64);
    if (!id) return res.status(400).json({ error: "id_required" });
    const song = await redis.hget("songs", id);
    if (!song) return res.status(404).json({ error: "not_found" });
    // Only the person who added a song can remove it
    if (!voter || song.addedBy !== voter) return res.status(403).json({ error: "not_owner" });
    await redis.hdel("songs", id);
    const keys = (await redis.hkeys("votes")) || [];
    const stale = keys.filter((k) => k.startsWith(id + "|"));
    if (stale.length) await redis.hdel("votes", ...stale);
    return res.status(204).end();
  }

  res.setHeader("Allow", "GET, POST, PATCH, DELETE");
  res.status(405).end();
}
