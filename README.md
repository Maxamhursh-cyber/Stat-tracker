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
POST /api/madden-export?type=<exportType>&platform=<ps4|xbox|...>&leagueId=<id>
```

Every export is stored as-is (raw JSON) in a Postgres `exports` table,
keyed by `export_type` and `received_at`. The home page (`GET /`) shows the
most recent export received for each type, plus a table of recent activity.

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

4. Visit `http://localhost:3000` and test the export endpoint, e.g.:

   ```
   curl -X POST "http://localhost:3000/api/madden-export?type=teamstats&platform=ps4&leagueId=123" \
     -H "Content-Type: application/json" \
     -d '{"teamStats": [{"teamName": "Steelers", "wins": 10}]}'
   ```

## Deploying to Render

This repo includes a `render.yaml` Blueprint that provisions:

- A free Postgres database (`madden-stat-tracker-db`)
- A free web service (`madden-stat-tracker`) wired to that database via the
  `DATABASE_URL` environment variable

To deploy:

1. Push this repo to GitHub.
2. In the Render dashboard, choose **New > Blueprint** and point it at the
   repo. Render will read `render.yaml` and provision both resources.
3. Once deployed, set the Madden Companion App's export URL to
   `https://<your-render-service>.onrender.com/api/madden-export`.

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
