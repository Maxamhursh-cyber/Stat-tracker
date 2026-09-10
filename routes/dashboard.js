const express = require('express');
const { pool } = require('../db/pool');
const { buildDashboardData } = require('../lib/dashboardData');

const router = express.Router();

router.get('/dashboard-data', async (req, res) => {
  try {
    const data = await buildDashboardData(pool);
    res.json(data);
  } catch (err) {
    console.error('Failed to build dashboard data:', err);
    res.status(500).json({ error: 'Failed to load dashboard data.' });
  }
});

router.get('/dashboard-history', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT standings, received_at
       FROM standings_snapshots
       ORDER BY received_at DESC
       LIMIT 30`
    );
    res.json(rows.reverse());
  } catch (err) {
    console.error('Failed to load standings history:', err);
    res.status(500).json({ error: 'Failed to load history.' });
  }
});

module.exports = router;
