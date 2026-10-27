import * as CASE1 from './case1.js';
import * as CASE2 from './case2.js';

export const SCRIPTS = [CASE1, CASE2];

export const SCRIPT_MAP = SCRIPTS.reduce((map, script) => {
  map[script.CASE.id] = script;
  return map;
}, {});

const cache = new Map();

function baseOf(id) {
  return SCRIPT_MAP[id] || CASE1;
}

// 每个剧本按“本局藏身点”派生一份数据：线索、真相、结局文案跟着变
function buildSpotScript(base, spot) {
  const clues = { ...base.CLUES };
  Object.keys(spot.patches || {}).forEach((id) => {
    if (clues[id]) clues[id] = { ...clues[id], ...spot.patches[id] };
  });
  (spot.extra || []).forEach((clue) => { clues[clue.id] = clue; });

  const truth = base.TRUTH.slice();
  Object.keys(spot.truthPatch || {}).forEach((index) => {
    truth[Number(index)] = spot.truthPatch[index];
  });

  const endings = { ...base.ENDINGS };
  Object.keys(spot.endings || {}).forEach((id) => {
    if (endings[id]) endings[id] = { ...endings[id], ...spot.endings[id] };
  });

  // 角色的秘密可能直接点出藏身点，需要跟着改
  const roles = base.ROLES.map((role) => (
    spot.roles && spot.roles[role.id] ? { ...role, ...spot.roles[role.id] } : role
  ));
  const roleMap = roles.reduce((map, role) => {
    map[role.id] = role;
    return map;
  }, {});

  const liarLines = { ...base.LIAR_LINES };
  Object.keys(spot.liarLines || {}).forEach((id) => {
    liarLines[id] = spot.liarLines[id];
  });

  const questions = base.QUESTIONS.map((q, i) => (i === 0 ? { ...q, answer: spot.id } : q));
  const hidden = base.HIDDEN && spot.hiddenClues
    ? { ...base.HIDDEN, clues: spot.hiddenClues }
    : base.HIDDEN;

  return {
    ...base,
    CLUES: clues,
    CLUE_LIST: Object.keys(clues).map((id) => clues[id]),
    ROLES: roles,
    ROLE_MAP: roleMap,
    LIAR_LINES: liarLines,
    QUESTIONS: questions,
    TRUTH: truth,
    ENDINGS: endings,
    HIDDEN: hidden,
    SPOT: spot
  };
}

export function getScript(id, spotId) {
  const base = baseOf(id);
  const spots = base.SPOTS || [];
  if (!spots.length) return base;
  const spot = spots.find((s) => s.id === spotId) || spots[0];
  const key = `${base.CASE.id}:${spot.id}`;
  if (cache.has(key)) return cache.get(key);
  const built = buildSpotScript(base, spot);
  cache.set(key, built);
  return built;
}

export function randomSpot(id) {
  const spots = baseOf(id).SPOTS || [];
  if (!spots.length) return '';
  return spots[Math.floor(Math.random() * spots.length)].id;
}
