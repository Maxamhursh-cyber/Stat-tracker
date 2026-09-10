# Madden Stat Tracker (Snap Count)

A Node/Express + Postgres server that receives exports from the Madden
Companion App and displays them on a league dashboard — standings by
division, weekly stat leaders, a searchable roster, and a record trend for
your team.

## How it works

The Madden Companion App (mobile app) can be pointed at a custom URL. It
POSTs each export (team stats, player stats, standings, rosters, schedules,
etc.) one at a time as a JSON body, with the export type, platform, and
league id included as query string parameters.

This server exposes one endpoint for that:

```
POST /api/madden-export?key=<secret>&type=<exportType>&platform=<ps4|xbox|...>&leagueId=<id>
```

Every export is stored as-is (raw JSON) in a Postgres `exports` table,
keyed by `export_type` and `received_at` — nothing is ever thrown away,
even if a mapping below turns out to need adjusting.

The `key` parameter must match the `EXPORT_API_KEY` environment variable.
This is a shared secret — since the endpoint is a public URL once deployed,
without it anyone on the internet could post fake data into your database.

### The dashboard (`GET /`)

On each page load, the dashboard fetches `GET /api/dashboard-data`, which
takes the *latest* export of each relevant type (standings, roster, and the
four weekly stat categories) and normalizes it into the shapes the UI
expects — see `lib/normalize.js`. It also fetches `GET /api/dashboard-history`,
a running log of team records appended every time a standings export
arrives (`standings_snapshots` table), which powers the "Trend" tab once
you pick your team from the dropdown there (stored in your browser, not the
database).

**Field-name note:** the Madden Companion App's export format isn't
officially documented and has varied across game years, so the field names
in `lib/normalize.js` and the `*_TYPES` aliases in `lib/exportTypes.js` are
a best-effort mapping, not a guarantee. If a section of the dashboard stays
empty after a real export comes in, check `GET /raw` to see exactly what
field names and `type` values your league's app is actually sending, then
adjust those two files to match.

## Local development

1. Install dependencies:

   ```
   npm install
   ```

2. Copy `.env.example` to `.env` and set `DATABASE_URL` to a local Postgres
   instance (set `DATABASE_SSL=false` if it isn't configured with SSL):

   ```
   cp .env.example .env
   ```

3. Start the server (it creates the `exports` table on boot if it doesn't
   exist):

   ```
   npm start
   ```

4. Set `EXPORT_API_KEY` in `.env` to any string, e.g. `local-test-key`.

5. Visit `http://localhost:3000` and post some sample data, e.g.:

   ```
   curl -X POST "http://localhost:3000/api/madden-export?key=local-test-key&type=leagueteams&platform=ps4&leagueId=123" \
     -H "Content-Type: application/json" \
     -d '{"leagueTeamInfoList": [{"teamName": "Steelers", "cityName": "Pittsburgh", "wins": 10, "losses": 3}]}'
   ```

   Refresh the dashboard and the Standings tab should show it. `GET /raw`
   shows every export received, exactly as stored, which is useful for
   checking real field names once you connect the actual Madden Companion App.

## Deploying (free): Render + Neon

Render's own free Postgres database gets deleted after 30 days, so this
setup uses [Neon](https://neon.tech) for the database instead — it has a
free tier with no expiration for a project this size — and Render's free
web service for hosting the app. Both cost nothing to run.

### 1. Create a free Neon database

1. Sign up at [neon.tech](https://neon.tech) (GitHub sign-in is easiest).
2. Create a new project. Neon gives you a connection string that looks like
   `postgresql://user:password@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require` —
   copy it, you'll need it in step 2 below.

### 2. Deploy the web service on Render

This repo includes a `render.yaml` Blueprint for the web service (it no
longer provisions a database — that's Neon now).

1. Push this repo to GitHub (already done if you're reading this from the
   repo).
2. In the [Render dashboard](https://dashboard.render.com), choose
   **New > Blueprint** and point it at this repo. Render reads `render.yaml`.
3. When prompted for the `DATABASE_URL` environment variable, paste in the
   Neon connection string from step 1. (If it doesn't prompt, you can set it
   afterward: open the web service → **Environment** → add `DATABASE_URL`.)
4. Apply/create. Wait for the first deploy to finish (Render shows
   build/deploy logs live) — look for `Madden stat tracker listening on
   port ...` in the logs.
5. Open the web service → **Environment**, and copy the auto-generated
   value of `EXPORT_API_KEY`.
6. In the Madden Companion App, set the export URL to:

   ```
   https://<your-render-service>.onrender.com/api/madden-export?key=<the key you copied>
   ```

   The app appends its own `&type=...&platform=...` parameters to whatever
   URL you give it, so this works as-is.
7. Visit `https://<your-render-service>.onrender.com` in a browser to see
   the latest data after your next export.

**Note on the free web service:** Render spins it down after 15 minutes of
no traffic and takes ~30-60 seconds to wake back up on the next request —
so the first page load (or the first export) after a quiet period may be
slow. That's normal on the free tier, not a bug.

## Project structure

```
server.js              # app entry point, wires up middleware + routes
db/pool.js              # Postgres connection pool + schema init
db/schema.sql            # exports + standings_snapshots table definitions
routes/export.js          # POST /api/madden-export
routes/dashboard.js        # GET /api/dashboard-data, /api/dashboard-history
routes/pages.js            # GET / (dashboard) and GET /raw (raw export viewer)
lib/normalize.js           # maps raw Madden export fields to the dashboard's shape
lib/exportTypes.js          # which `type` values count as standings/roster/etc.
lib/dashboardData.js         # queries Postgres + assembles the dashboard payload
lib/teamColors.js            # static NFL team color lookup
views/dashboard.ejs           # dashboard page shell
views/raw.ejs                 # raw export viewer
public/dashboard.css           # dashboard styling
public/dashboard.js            # dashboard client-side rendering
render.yaml                    # Render Blueprint (web service + Postgres)
```
