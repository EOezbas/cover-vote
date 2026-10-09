"""Copies songs, votes and names from one cover-vote deployment to another through the public API.

Usage: python3 migrate.py OLD_URL NEW_URL [ROOM_CODE]
Songs get new ids; who added them, who voted what and everyone's names are kept.
"""
import json
import sys
import urllib.request


def call(base, path, code, body=None, method="GET"):
    req = urllib.request.Request(base.rstrip("/") + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"content-type": "application/json", "x-room-code": code})
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def main():
    old, new = sys.argv[1], sys.argv[2]
    code = sys.argv[3] if len(sys.argv) > 3 else ""
    src = call(old, "/api/songs", code)
    names = src.get("voters") or {}
    existing = {(s["title"].lower(), (s.get("artist") or "").lower()) for s in call(new, "/api/songs", code)["songs"]}
    id_map = {}
    for s in sorted(src["songs"], key=lambda s: s.get("createdAt") or 0):
        if (s["title"].lower(), (s.get("artist") or "").lower()) in existing:
            print("skip (already there):", s["title"])
            continue
        owner = s.get("addedBy") or "unknown"
        made = call(new, "/api/songs", code, {"title": s["title"], "artist": s.get("artist", ""),
                                              "link": s.get("link", ""), "voter": owner,
                                              "name": names.get(owner, "")}, "POST")
        id_map[s["id"]] = made["id"]
        print("song:", s["title"])
    n = 0
    for key, value in (src.get("votes") or {}).items():
        sid, voter = key.split("|", 1)
        if sid in id_map:
            call(new, "/api/vote", code, {"songId": id_map[sid], "voter": voter,
                                          "name": names.get(voter, ""), "value": int(value)}, "POST")
            n += 1
    print(f"{len(id_map)} songs and {n} votes copied")


main()
