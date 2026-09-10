-- Stores every export the Madden Companion App sends us, as raw JSON.
-- The companion app POSTs one export at a time (team stats, player stats,
-- standings, rosters, schedules, ...) identified by the `type` query param,
-- so we just keep every payload and let the app read back whatever is
-- newest per type.
CREATE TABLE IF NOT EXISTS exports (
  id SERIAL PRIMARY KEY,
  export_type TEXT NOT NULL,
  platform TEXT,
  league_id TEXT,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exports_type_received_at_idx
  ON exports (export_type, received_at DESC);
