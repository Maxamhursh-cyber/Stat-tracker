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

## Deploying to Render

This repo includes a `render.yaml` Blueprint that provisions:

- A free Postgres database (`madden-stat-tracker-db`)
- A free web service (`madden-stat-tracker`) wired to that database via the
  `DATABASE_URL` environment variable, with a random `EXPORT_API_KEY`
  generated automatically

To deploy (no coding required, just clicking through Render's dashboard):

1. Push this repo to GitHub (already done if you're reading this from the
   repo).
2. In the [Render dashboard](https://dashboard.render.com), choose
   **New > Blueprint** and point it at this repo. Render reads `render.yaml`
   and provisions both the web service and the database automatically.
3. Wait for the first deploy to finish (Render shows build/deploy logs
   live).
4. In the Render dashboard, open the web service, go to **Environment**,
   and copy the auto-generated value of `EXPORT_API_KEY`.
5. In the Madden Companion App, set the export URL to:

   ```
   https://<your-render-service>.onrender.com/api/madden-export?key=<the key you copied>
   ```

   The app appends its own `&type=...&platform=...` parameters to whatever
   URL you give it, so this works as-is.
6. Visit `https://<your-render-service>.onrender.com` in a browser to see
   the latest data after your next export.

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
