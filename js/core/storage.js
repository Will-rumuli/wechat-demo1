// 本地存档：按剧本隔离的结局收集与开局次数。登录微信账号后同时同步到云端。
import { roomApi } from './cloud.js';
import { loadUser } from './user.js';

const KEY = 'wgq_stats_v2';

function emptyCase() {
  return { plays: 0, endings: [], bestClues: 0 };
}

function loadAll() {
  try {
    const raw = wx.getStorageSync(KEY);
    if (!raw) return { plays: 0, endings: [], bestClues: 0, cases: {} };
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return {
      plays: data.plays || 0,
      endings: Array.isArray(data.endings) ? data.endings : [],
      bestClues: data.bestClues || 0,
      cases: data.cases || {}
    };
  } catch (e) {
    return { plays: 0, endings: [], bestClues: 0, cases: {} };
  }
}

function saveAll(stats) {
  try {
    wx.setStorageSync(KEY, stats);
  } catch (e) {
    // 忽略存储失败
  }
}

function cloudUser() {
  const user = loadUser();
  if (!user || user.local || !user.id) return null;
  return user;
}

// 两份存档合并：次数取最大、结局取并集，换设备后不会互相覆盖
export function mergeStats(a, b) {
  const A = a || { plays: 0, endings: [], bestClues: 0, cases: {} };
  const B = b || { plays: 0, endings: [], bestClues: 0, cases: {} };
  const cases = {};
  const ids = new Set([...Object.keys(A.cases || {}), ...Object.keys(B.cases || {})]);
  ids.forEach((id) => {
    const x = (A.cases && A.cases[id]) || emptyCase();
    const y = (B.cases && B.cases[id]) || emptyCase();
    cases[id] = {
      plays: Math.max(x.plays || 0, y.plays || 0),
      bestClues: Math.max(x.bestClues || 0, y.bestClues || 0),
      endings: Array.from(new Set([...(x.endings || []), ...(y.endings || [])]))
    };
  });
  return {
    plays: Math.max(A.plays || 0, B.plays || 0),
    bestClues: Math.max(A.bestClues || 0, B.bestClues || 0),
    endings: Array.from(new Set([...(A.endings || []), ...(B.endings || [])])),
    cases
  };
}

function pushCloud(stats) {
  if (!cloudUser()) return;
  roomApi.writeSave(stats);
}

// 启动时拉取云存档并与本地合并，失败就继续用本地
export async function pullCloudStats() {
  if (!cloudUser()) return null;
  const res = await roomApi.loadSave();
  if (!res || !res.ok) return null;
  const local = loadAll();
  const merged = mergeStats(local, res.stats);
  saveAll(merged);
  pushCloud(merged);
  return merged;
}

export function loadStats() {
  return loadAll();
}

export function loadCaseStats(caseId) {
  const all = loadAll();
  return all.cases[caseId] || emptyCase();
}

export function recordGame(caseId, endingId, clueCount) {
  const all = loadAll();
  const current = all.cases[caseId] || emptyCase();

  all.plays += 1;
  current.plays += 1;
  all.bestClues = Math.max(all.bestClues, clueCount);
  current.bestClues = Math.max(current.bestClues, clueCount);

  if (endingId) {
    const key = `${caseId}:${endingId}`;
    if (all.endings.indexOf(key) === -1) all.endings.push(key);
    if (current.endings.indexOf(endingId) === -1) current.endings.push(endingId);
  }

  all.cases[caseId] = current;
  saveAll(all);
  pushCloud(all);
  return current;
}
