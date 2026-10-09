import { checkCode } from "./_db.js";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

export default async function handler(req, res) {
  if (!checkCode(req, res)) return;

  let u;
  try {
    u = new URL(String(req.query.url || ""));
    if (!/^https?:$/.test(u.protocol)) throw new Error();
  } catch {
    return res.status(400).json({ error: "bad_url" });
  }

  const host = u.hostname.replace(/^(www|m|music)\./, "");
  let out = { title: "", artist: "" };
  try {
    if (host === "open.spotify.com") out = await spotify(u.href);
    else if (host === "youtube.com" || host === "youtu.be") out = await youtube(u.href);
    else out = await generic(u.href);
  } catch {
    // fall through with empty result
  }

  res.setHeader("Cache-Control", "s-maxage=86400");
  res.json(out);
}

async function page(url) {
  const r = await fetch(url, { headers: { "user-agent": UA, "accept-language": "en" }, redirect: "follow" });
  return r.text();
}

function decode(s) {
  return s
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));
}

function meta(html, attr, key) {
  const a = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']*)["']`, "i");
  const b = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${key}["']`, "i");
  const m = html.match(a) || html.match(b);
  return m ? decode(m[1]).trim() : "";
}

async function spotify(url) {
  const html = await page(url);
  const title = meta(html, "property", "og:title");
  // og:description looks like "Artist · Album · Song · Year"
  const desc = meta(html, "property", "og:description");
  const artist = meta(html, "name", "music:musician_description") || desc.split(" · ")[0] || "";
  return { title, artist };
}

async function youtube(url) {
  const r = await fetch("https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent(url));
  if (!r.ok) return { title: "", artist: "" };
  const j = await r.json();
  const raw = (j.title || "").replace(/\s*[\(\[][^\)\]]*(official|video|audio|lyric|visuali|remaster|live|hd|4k)[^\)\]]*[\)\]]/gi, "").trim();
  const m = raw.match(/^(.+?)\s+[-–—|]\s+(.+)$/);
  if (m) return { artist: m[1].trim(), title: m[2].trim() };
  const artist = (j.author_name || "").replace(/\s*-\s*Topic$/i, "").replace(/VEVO$/i, "").trim();
  return { title: raw, artist };
}

async function generic(url) {
  const html = await page(url);
  return { title: meta(html, "property", "og:title"), artist: "" };
}
