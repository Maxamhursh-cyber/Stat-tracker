const { pick, extractArray } = require('./pick');

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeStandings(payload) {
  return extractArray(payload).map((item) => {
    const wins = num(pick(item, ['wins', 'stats.wins', 'totalWins'], 0));
    const losses = num(pick(item, ['losses', 'stats.losses', 'totalLosses'], 0));
    const ties = num(pick(item, ['ties', 'stats.ties', 'totalTies'], 0));
    const games = wins + losses + ties;
    return {
      team: pick(item, ['teamName', 'nickName', 'name'], 'Unknown'),
      city: pick(item, ['cityName', 'city'], ''),
      abbr: String(pick(item, ['abbrName', 'teamAbbr', 'abbr'], '')).toUpperCase(),
      conf: pick(item, ['conferenceName', 'confName', 'conf'], ''),
      div: pick(item, ['divName', 'divisionName', 'div'], ''),
      wins,
      losses,
      ties,
      winPct: games > 0 ? wins / games : 0,
      ptsFor: num(pick(item, ['ptsFor', 'pointsFor', 'stats.ptsFor'], 0)),
      ptsAgainst: num(pick(item, ['ptsAgainst', 'pointsAgainst', 'stats.ptsAgainst'], 0)),
      ovr: num(pick(item, ['teamOvr', 'ovrRating', 'ovr'], 0)),
      streak: pick(item, ['streak', 'teamStreak'], ''),
      seed: num(pick(item, ['seed', 'rank', 'playoffSeed'], 0), null),
    };
  });
}

function normalizeRoster(payload) {
  return extractArray(payload).map((item) => ({
    name: pick(item, ['fullName', 'name', 'playerName'], 'Unknown'),
    pos: pick(item, ['position', 'pos'], ''),
    team: pick(item, ['teamName', 'team'], ''),
    ovr: num(pick(item, ['playerBestOvr', 'overall', 'ovr'], 0)),
    age: num(pick(item, ['age'], 0)),
    dev: pick(item, ['devTrait', 'dev'], 'Normal'),
    injured: Boolean(pick(item, ['isInjured', 'injured'], false)),
    injWeeks: num(pick(item, ['injuryWeeksLeft', 'injWeeks'], 0)),
    capHit: num(pick(item, ['capHit'], 0)),
    id: pick(item, ['rosterId', 'id'], null),
  }));
}

function playerBase(item) {
  return {
    name: pick(item, ['fullName', 'name', 'playerName'], 'Unknown'),
    team: pick(item, ['teamName', 'team'], ''),
    pos: pick(item, ['position', 'pos'], ''),
  };
}

function normalizePassing(payload, limit = 10) {
  return extractArray(payload)
    .map((item) => ({
      ...playerBase(item),
      passYds: num(pick(item, ['passYds', 'passingYards'], 0)),
      passTDs: num(pick(item, ['passTDs', 'passingTDs'], 0)),
      passInts: num(pick(item, ['passInts', 'interceptions'], 0)),
    }))
    .sort((a, b) => b.passYds - a.passYds)
    .slice(0, limit);
}

function normalizeRushing(payload, limit = 10) {
  return extractArray(payload)
    .map((item) => ({
      ...playerBase(item),
      rushYds: num(pick(item, ['rushYds', 'rushingYards'], 0)),
      rushTDs: num(pick(item, ['rushTDs', 'rushingTDs'], 0)),
      rushAtt: num(pick(item, ['rushAtt', 'rushAttempts'], 0)),
    }))
    .sort((a, b) => b.rushYds - a.rushYds)
    .slice(0, limit);
}

function normalizeReceiving(payload, limit = 10) {
  return extractArray(payload)
    .map((item) => ({
      ...playerBase(item),
      recYds: num(pick(item, ['recYds', 'receivingYards'], 0)),
      recTDs: num(pick(item, ['recTDs', 'receivingTDs'], 0)),
      recCatches: num(pick(item, ['recCatches', 'receptions'], 0)),
    }))
    .sort((a, b) => b.recYds - a.recYds)
    .slice(0, limit);
}

function normalizeDefense(payload) {
  return extractArray(payload).map((item) => ({
    ...playerBase(item),
    defTotalTackles: num(pick(item, ['defTotalTackles', 'tackles'], 0)),
    defSacks: num(pick(item, ['defSacks', 'sacks'], 0)),
    defInts: num(pick(item, ['defInts', 'interceptions'], 0)),
    defForcedFum: num(pick(item, ['defForcedFum', 'forcedFumbles'], 0)),
  }));
}

function tacklesLeaders(defenseNormalized, limit = 10) {
  return [...defenseNormalized].sort((a, b) => b.defTotalTackles - a.defTotalTackles).slice(0, limit);
}

function sacksLeaders(defenseNormalized, limit = 10) {
  return [...defenseNormalized].sort((a, b) => b.defSacks - a.defSacks).slice(0, limit);
}

module.exports = {
  normalizeStandings,
  normalizeRoster,
  normalizePassing,
  normalizeRushing,
  normalizeReceiving,
  normalizeDefense,
  tacklesLeaders,
  sacksLeaders,
};
