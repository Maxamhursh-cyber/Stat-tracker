const teamColors = require('./teamColors');
const {
  STANDINGS_TYPES,
  ROSTER_TYPES,
  PASSING_TYPES,
  RUSHING_TYPES,
  RECEIVING_TYPES,
  DEFENSE_TYPES,
} = require('./exportTypes');
const {
  normalizeStandings,
  normalizeRoster,
  normalizePassing,
  normalizeRushing,
  normalizeReceiving,
  normalizeDefense,
  tacklesLeaders,
  sacksLeaders,
} = require('./normalize');

async function latestExportOfTypes(pool, types) {
  const { rows } = await pool.query(
    `SELECT export_type, payload, received_at
     FROM exports
     WHERE lower(export_type) = ANY($1)
     ORDER BY received_at DESC
     LIMIT 1`,
    [types]
  );
  return rows[0] || null;
}

async function buildDashboardData(pool) {
  const [standingsRow, rosterRow, passingRow, rushingRow, receivingRow, defenseRow] = await Promise.all([
    latestExportOfTypes(pool, STANDINGS_TYPES),
    latestExportOfTypes(pool, ROSTER_TYPES),
    latestExportOfTypes(pool, PASSING_TYPES),
    latestExportOfTypes(pool, RUSHING_TYPES),
    latestExportOfTypes(pool, RECEIVING_TYPES),
    latestExportOfTypes(pool, DEFENSE_TYPES),
  ]);

  const standings = standingsRow ? normalizeStandings(standingsRow.payload) : [];
  const roster = rosterRow ? normalizeRoster(rosterRow.payload) : [];
  const defenseNormalized = defenseRow ? normalizeDefense(defenseRow.payload) : [];

  const lastSynced = [standingsRow, rosterRow, passingRow, rushingRow, receivingRow, defenseRow]
    .filter(Boolean)
    .map((r) => r.received_at)
    .sort()
    .pop() || null;

  return {
    meta: {
      lastSynced,
      hasStandings: Boolean(standingsRow),
      hasRoster: Boolean(rosterRow),
    },
    standings,
    roster,
    leaders: {
      passing: passingRow ? normalizePassing(passingRow.payload) : [],
      rushing: rushingRow ? normalizeRushing(rushingRow.payload) : [],
      receiving: receivingRow ? normalizeReceiving(receivingRow.payload) : [],
      tackles: tacklesLeaders(defenseNormalized),
      sacks: sacksLeaders(defenseNormalized),
    },
    teamColors,
  };
}

module.exports = { buildDashboardData };
