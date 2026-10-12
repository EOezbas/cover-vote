# Cover Song Vote

Friends add songs (paste a Spotify/YouTube link, title and artist fill in automatically) and vote on each one: ▲ (+1), 0 (neutral) or ▼ (−1).

- Until you have voted on every song, the page shows only the songs you have not voted on, without their scores.
- Once every song has your vote, the full list opens, ranked by score. You can change your votes there.
- Adding a song counts as your +1 for it, so you never vote on your own songs.
- Only the person who added a song can remove it.

## Deploy to Vercel

1. Push this folder to a new GitHub repo.
2. vercel.com → **Add New → Project** → import the repo → **Deploy** (no settings needed).
3. In the project: **Storage → Create / Connect Database → Upstash (Redis)** → free plan → connect to this project.
4. **Deployments → ⋯ → Redeploy** so the database settings take effect.
5. Optional: **Settings → Environment Variables** → add `ROOM_CODE` (any password), then redeploy.
   Friends enter it once when they open the page. Without it, anyone with the URL can add and vote.

Share the `*.vercel.app` URL with your friends.
