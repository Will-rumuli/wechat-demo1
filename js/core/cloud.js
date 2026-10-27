// 云开发调用层：房间的创建、加入、准备、开局与同步都走这里
import { CLOUD_ENV } from '../config.js';

let inited = false;
let ready = false;
// 填了环境 ID 却调不通时，会退回账号的默认环境重试一次
let envId = CLOUD_ENV;

export function initCloud() {
  if (inited) return ready;
  inited = true;
  try {
    if (typeof wx === 'undefined' || !wx.cloud) {
      ready = false;
      return ready;
    }
    const opt = { traceUser: true };
    if (envId) opt.env = envId;
    wx.cloud.init(opt);
    ready = true;
  } catch (e) {
    ready = false;
  }
  return ready;
}

export function cloudReady() {
  return inited ? ready : initCloud();
}

async function invoke(action, data) {
  if (!cloudReady()) return { ok: false, error: 'cloud' };
  try {
    const res = await wx.cloud.callFunction({
      name: 'room',
      data: { action, ...data }
    });
    return (res && res.result) || { ok: false, error: 'empty' };
  } catch (e) {
    return { ok: false, error: 'network', message: e && e.errMsg };
  }
}

export async function callRoom(action, data = {}) {
  const first = await invoke(action, data);
  if (first.ok || !envId) return first;
  if (first.error !== 'network' && first.error !== 'cloud') return first;
  // 环境 ID 写错时 callFunction 会直接抛错，这里换默认环境再试一次
  envId = '';
  inited = false;
  ready = false;
  const second = await invoke(action, data);
  return second;
}

export const roomApi = {
  whoami: () => callRoom('whoami'),
  loadSave: () => callRoom('loadSave'),
  writeSave: (stats) => callRoom('writeSave', { stats }),
  create: (payload) => callRoom('create', payload),
  join: (roomId, profile) => callRoom('join', { roomId, profile }),
  state: (roomId) => callRoom('state', { roomId }),
  leave: (roomId) => callRoom('leave', { roomId }),
  ready: (roomId, value) => callRoom('ready', { roomId, ready: value }),
  start: (roomId) => callRoom('start', { roomId }),
  setClue: (roomId, clueId) => callRoom('setClue', { roomId, clueId }),
  shareClue: (roomId, clueId) => callRoom('shareClue', { roomId, clueId }),
  endRound: (roomId) => callRoom('endRound', { roomId })
};

export function roomErrorText(res) {
  const map = {
    cloud: '联机服务未配置，请先开通云开发并部署 room 云函数',
    network: '网络不稳定，请稍后再试',
    empty: '服务没有返回数据，请稍后再试',
    full: '房间已满',
    started: '该房间已经开始游戏',
    gone: '房间不存在或已解散',
    denied: '你不在这个房间里',
    host: '只有房主可以操作',
    ready: '还有成员没有准备',
    notfull: '人数还没满，再等等',
    clue: '这条线索不在你的手牌里',
    shared: '本轮已经公开过线索了',
    server: '服务开小差了，请稍后再试'
  };
  return map[(res && res.error) || ''] || '操作失败，请稍后再试';
}
