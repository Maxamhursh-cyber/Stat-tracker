// Reads the first present field from a list of candidate field-name/paths.
// Madden Companion App exports don't have a single documented schema, so
// normalizers use this to tolerate a few likely field-name variants
// instead of assuming one exact shape.
function pick(obj, candidates, fallback) {
  for (const path of candidates) {
    const val = path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
    if (val !== undefined && val !== null && val !== '') return val;
  }
  return fallback;
}

// Madden exports typically wrap a list as { "<someKey>": [...] }. Since the
// wrapper key itself varies (teamStats, leagueTeamInfoList, playerStats...),
// this just finds the first array-valued property instead of assuming a name.
function extractArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    for (const val of Object.values(payload)) {
      if (Array.isArray(val)) return val;
    }
  }
  return [];
}

module.exports = { pick, extractArray };
