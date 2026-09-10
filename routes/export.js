const express = require('express');
const { pool } = require('../db/pool');

const router = express.Router();

// The Madden Companion App POSTs one export at a time (e.g. team stats,
// player stats, standings, rosters, schedules) with the export's type,
// platform, and league id passed as query string parameters and the data
// itself as the JSON body.
router.post('/madden-export', async (req, res) => {
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
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Failed to store export:', err);
    res.status(500).json({ error: 'Failed to store export.' });
  }
});

module.exports = router;
