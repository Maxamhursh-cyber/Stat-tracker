# Madden Stat Tracker

A minimal Node/Express + Postgres server that receives exports from the
Madden Companion App and displays the latest data on a simple web page.

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
keyed by `export_type` and `received_at`. The home page (`GET /`) shows the
most recent export received for each type, plus a table of recent activity.

The `key` parameter must match the `EXPORT_API_KEY` environment variable.
This is a shared secret — since the endpoint is a public URL once deployed,
without it anyone on the internet could post fake data into your database.

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

5. Visit `http://localhost:3000` and test the export endpoint, e.g.:

   ```
   curl -X POST "http://localhost:3000/api/madden-export?key=local-test-key&type=teamstats&platform=ps4&leagueId=123" \
     -H "Content-Type: application/json" \
     -d '{"teamStats": [{"teamName": "Steelers", "wins": 10}]}'
   ```

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
server.js          # app entry point, wires up middleware + routes
db/pool.js          # Postgres connection pool + schema init
db/schema.sql        # exports table definition
routes/export.js      # POST /api/madden-export
routes/pages.js       # GET / (latest data page)
views/index.ejs       # HTML template for the home page
public/style.css      # styling
render.yaml           # Render Blueprint (web service + Postgres)
```
