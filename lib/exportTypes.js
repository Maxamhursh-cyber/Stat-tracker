// The Madden Companion App's exact `type` values vary a bit by game year and
// by how the app is configured, so each category accepts a few common
// aliases (lowercase, matched against the `type` query param we stored).
// If your league's app sends a type not listed here, check the raw export
// at GET /raw and add it to the matching list below.
module.exports = {
  STANDINGS_TYPES: ['standings', 'leagueteams', 'teams', 'teaminfo'],
  ROSTER_TYPES: ['roster', 'weeklyroster', 'teamroster', 'players'],
  PASSING_TYPES: ['passingstats', 'weeklystatpassing', 'passing'],
  RUSHING_TYPES: ['rushingstats', 'weeklystatrushing', 'rushing'],
  RECEIVING_TYPES: ['receivingstats', 'weeklystatreceiving', 'receiving'],
  DEFENSE_TYPES: ['defensivestats', 'weeklystatdefense', 'defense'],
};
