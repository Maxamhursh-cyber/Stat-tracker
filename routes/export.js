const express = require('express');
const { pool } = require('../db/pool');
const { STANDINGS_TYPES } = require('../lib/exportTypes');
const { normalizeStandings } = require('../lib/normalize');

const router = express.Router();

// Requires a `key` query parameter matching EXPORT_API_KEY, so this public
// URL can't be spammed by strangers. The key is baked into the export URL
// you paste into the Madden Companion App, e.g.:
//   https://your-app.onrender.com/api/madden-export?key=SECRET
// The app then appends its own params (&type=...&platform=...) to that.
function requireApiKey(req, res, next) {
  const expectedKey = process.env.EXPORT_API_KEY;
  if (!expectedKey) {
    console.warn('EXPORT_API_KEY is not set; export endpoint is unprotected.');
    return next();
  }
  if (req.query.key !== expectedKey) {
    return res.status(401).json({ error: 'Missing or invalid key.' });
  }
  next();
}

// The Madden Companion App POSTs one export at a time (e.g. team stats,
// player stats, standings, rosters, schedules) with the export's type,
// platform, and league id passed as query string parameters and the data
// itself as the JSON body.
router.post('/madden-export', requireApiKey, async (req, res) => {
  const exportType = (req.query.type || req.query.stage || 'unknown').toString();
  const platform = req.query.platform ? req.query.platform.toString() : null;
  const leagueId = req.query.leagueId ? req.query.leagueId.toString() : null;
  const payload = req.body;

  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'Expected a JSON body.' });
  }

  try {
    await pool.query(
      `INSERT INTO exports (export_type, platform, league_id, payload)
       VALUES ($1, $2, $3, $4)`,
      [exportType, platform, leagueId, payload]
    );

    if (STANDINGS_TYPES.includes(exportType.toLowerCase())) {
      const standings = normalizeStandings(payload);
      if (standings.length > 0) {
        await pool.query(`INSERT INTO standings_snapshots (standings) VALUES ($1)`, [
          JSON.stringify(standings),
        ]);
      }
    }

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Failed to store export:', err);
    res.status(500).json({ error: 'Failed to store export.' });
  }
});

module.exports = router;
