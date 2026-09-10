const express = require('express');
const { pool } = require('../db/pool');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('dashboard');
});

// Raw view of every export received, useful for checking exactly what
// field names your league's Madden Companion App actually sends, so the
// mappings in lib/normalize.js can be adjusted if needed.
router.get('/raw', async (req, res) => {
  try {
    const latestByType = await pool.query(
      `SELECT DISTINCT ON (export_type)
         id, export_type, platform, league_id, payload, received_at
       FROM exports
       ORDER BY export_type, received_at DESC`
    );

    const recent = await pool.query(
      `SELECT id, export_type, platform, league_id, received_at
       FROM exports
       ORDER BY received_at DESC
       LIMIT 20`
    );

    res.render('raw', {
      latestByType: latestByType.rows,
      recent: recent.rows,
    });
  } catch (err) {
    console.error('Failed to load exports:', err);
    res.status(500).send('Failed to load data.');
  }
});

module.exports = router;
