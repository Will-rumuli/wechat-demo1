// 房间服务：创建、加入、准备、开局与全员同步推进
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const COL = 'rooms';
const SAVE_COL = 'saves';
const USER_COL = 'users';

function digits(n) {
  let out = '';
  for (let i = 0; i < n; i += 1) out += Math.floor(Math.random() * 10);
  return out;
}

// 注册或取回用户资料：昵称与展示 ID 先查库去重，撞了就重新生成
async function registerUser(openid) {
  const col = db.collection(USER_COL);
  try {
    const res = await col.doc(openid).get();
    if (res.data && res.data.nickName && res.data.shortId) {
      return { nickName: res.data.nickName, shortId: res.data.shortId };
    }
  } catch (e) {
    // 首次登录还没有记录
  }

  for (let i = 0; i < 20; i += 1) {
    const nickName = `邻居${digits(4)}`;
    const shortId = `#${digits(6)}`;
    try {
      const dup = await col.where(db.command.or([{ nickName }, { shortId }])).count();
      if (dup.total > 0) continue;
      await col.doc(openid).set({ data: { nickName, shortId, createdAt: Date.now() } });
      return { nickName, shortId };
    } catch (e) {
      // 并发撞名或唯一索引冲突，换一组再试
    }
  }
  return null;
}

// 云存档：按 openid 存一份统计，换设备或清缓存后能找回
async function loadSave(openid) {
  try {
    const res = await db.collection(SAVE_COL).doc(openid).get();
    return { ok: true, stats: (res.data && res.data.stats) || null };
  } catch (e) {
    // 没有记录或集合还没建，都当作空存档
    return { ok: true, stats: null };
  }
}

async function writeSave(openid, stats) {
  if (!stats || typeof stats !== 'object') return fail('server');
  try {
    await db.collection(SAVE_COL).doc(openid).set({
      data: { stats, updatedAt: Date.now() }
    });
    return { ok: true };
  } catch (e) {
    return fail('server');
  }
}

function normalizeProfile(profile, fallbackId) {
  const p = profile || {};
  return {
    id: fallbackId,
    nickName: String(p.nickName || '邻居').slice(0, 12),
    avatarUrl: p.avatarUrl || '',
    shortId: p.shortId || '#0000'
  };
}

function makeSeat(openid, profile) {
  const p = normalizeProfile(profile, openid);
  return {
    id: openid,
    nickName: p.nickName,
    avatarUrl: p.avatarUrl,
    shortId: p.shortId,
    ready: false,
    roleId: null,
    clues: [],
    sharedKey: ''
  };
}

async function getRoom(roomId) {
  if (!roomId) return null;
  try {
    const res = await db.collection(COL).doc(String(roomId)).get();
    return res.data || null;
  } catch (e) {
    return null;
  }
}

async function saveRoom(room) {
  const data = { ...room };
  delete data._id;
  data.updatedAt = Date.now();
  await db.collection(COL).doc(room._id).update({ data });
  return room;
}

function sanitize(room, openid) {
  const seats = (room.seats || []).map((s) => (s ? {
    id: s.id,
    nickName: s.nickName,
    avatarUrl: s.avatarUrl || '',
    shortId: s.shortId,
    ready: !!s.ready,
    roleId: s.roleId || null,
    clueCount: (s.clues || []).length,
    host: s.id === room.hostId
  } : null));
  const me = (room.seats || []).find((s) => s && s.id === openid);
  return {
    roomId: room._id,
    caseId: room.caseId,
    title: room.title,
    hostId: room.hostId,
    status: room.status,
    maxSeats: room.maxSeats,
    acts: room.acts || [],
    actIndex: room.actIndex || 0,
    round: room.round || 0,
    seats,
    myId: openid,
    isHost: room.hostId === openid,
    myRoleId: me ? me.roleId : null,
    myClues: me ? (me.clues || []) : [],
    myReady: me ? !!me.ready : false,
    shared: room.shared || [],
    claimed: (room.claimed || []).map((c) => c.clueId),
    endedCount: (room.ended || []).length,
    playerCount: seats.filter(Boolean).length
  };
}

function fail(error) {
  return { ok: false, error };
}

function seatIndex(room, openid) {
  return (room.seats || []).findIndex((s) => s && s.id === openid);
}

function shuffle(list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

async function createRoom(event, openid) {
  const maxSeats = Math.max(2, Math.min(8, Number(event.maxSeats) || 4));
  const acts = Array.isArray(event.acts) && event.acts.length
    ? event.acts.map((n) => Math.max(1, Number(n) || 1))
    : [3];
  const roleIds = Array.isArray(event.roleIds) ? event.roleIds.filter(Boolean) : [];

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = String(100000 + Math.floor(Math.random() * 900000));
    const exists = await getRoom(code);
    if (exists) continue;

    const seats = new Array(maxSeats).fill(null);
    seats[0] = makeSeat(openid, event.profile);
    // 房主没有准备按钮，默认视为已准备
    seats[0].ready = true;

    const room = {
      _id: code,
      caseId: event.caseId || 'case1',
      title: event.title || '',
      hostId: openid,
      status: 'waiting',
      maxSeats,
      acts,
      roleIds,
      actIndex: 0,
      round: 0,
      seats,
      shared: [],
      claimed: [],
      ended: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await db.collection(COL).add({ data: room });
    return { ok: true, room: sanitize(room, openid) };
  }
  return fail('server');
}

async function joinRoom(event, openid) {
  const room = await getRoom(event.roomId);
  if (!room) return fail('gone');
  if (room.status !== 'waiting') return fail('started');

  const seats = room.seats || [];
  const mine = seats.findIndex((s) => s && s.id === openid);
  if (mine >= 0) {
    const profile = normalizeProfile(event.profile, openid);
    seats[mine].nickName = profile.nickName;
    seats[mine].avatarUrl = profile.avatarUrl;
    seats[mine].shortId = profile.shortId;
    await saveRoom(room);
    return { ok: true, room: sanitize(room, openid), rejoined: true };
  }

  const empty = seats.findIndex((s) => !s);
  if (empty < 0) return fail('full');
  seats[empty] = makeSeat(openid, event.profile);
  room.seats = seats;
  await saveRoom(room);
  return { ok: true, room: sanitize(room, openid) };
}

async function leaveRoom(event, openid) {
  const room = await getRoom(event.roomId);
  if (!room) return { ok: true };

  if (room.hostId === openid) {
    try {
      await db.collection(COL).doc(room._id).remove();
    } catch (e) {
      // 已删除视为成功
    }
    return { ok: true, closed: true };
  }

  const seats = room.seats || [];
  const idx = seats.findIndex((s) => s && s.id === openid);
  if (idx < 0) return { ok: true };
  seats[idx] = null;
  room.seats = seats;
  room.ended = (room.ended || []).filter((id) => id !== openid);
  await saveRoom(room);
  return { ok: true, room: sanitize(room, openid) };
}

async function setReady(event, openid) {
  const room = await getRoom(event.roomId);
  if (!room) return fail('gone');
  if (room.status !== 'waiting') return fail('started');
  const idx = seatIndex(room, openid);
  if (idx < 0) return fail('denied');
  room.seats[idx].ready = !!event.ready;
  await saveRoom(room);
  return { ok: true, room: sanitize(room, openid) };
}

async function startGame(event, openid) {
  const room = await getRoom(event.roomId);
  if (!room) return fail('gone');
  if (room.hostId !== openid) return fail('host');
  if (room.status !== 'waiting') return fail('started');

  const seats = room.seats || [];
  const players = seats.filter(Boolean);
  if (players.length < room.maxSeats) return fail('notfull');
  if (players.some((s) => !s.ready)) return fail('ready');

  const ids = shuffle(room.roleIds && room.roleIds.length
    ? room.roleIds
    : players.map((_, i) => `role${i}`));
  seats.forEach((s, i) => {
    if (!s) return;
    s.roleId = ids[i % ids.length];
    s.ready = s.id === room.hostId;
    s.clues = [];
    s.sharedKey = '';
  });

  room.status = 'playing';
  room.actIndex = 0;
  room.round = 0;
  room.shared = [];
  room.claimed = [];
  room.ended = [];
  await saveRoom(room);
  return { ok: true, room: sanitize(room, openid) };
}

async function setClue(event, openid) {
  const room = await getRoom(event.roomId);
  if (!room) return fail('gone');
  if (room.status !== 'playing') return fail('started');
  const idx = seatIndex(room, openid);
  if (idx < 0) return fail('denied');

  const clueId = String(event.clueId || '');
  if (!clueId) return fail('server');
  const seat = room.seats[idx];
  if (!seat.clues.includes(clueId)) seat.clues.push(clueId);
  if (!(room.claimed || []).some((c) => c.clueId === clueId)) {
    room.claimed = (room.claimed || []).concat([{
      clueId, by: openid, actIndex: room.actIndex, round: room.round
    }]);
  }
  await saveRoom(room);
  return { ok: true, room: sanitize(room, openid) };
}

async function shareClue(event, openid) {
  const room = await getRoom(event.roomId);
  if (!room) return fail('gone');
  if (room.status !== 'playing') return fail('started');
  const idx = seatIndex(room, openid);
  if (idx < 0) return fail('denied');

  const clueId = String(event.clueId || '');
  const seat = room.seats[idx];
  if (!clueId || !seat.clues.includes(clueId)) return fail('clue');

  const key = `${room.actIndex}-${room.round}`;
  if (seat.sharedKey === key) return fail('shared');
  seat.sharedKey = key;

  room.shared = (room.shared || []).concat([{
    clueId,
    by: openid,
    name: seat.nickName,
    actIndex: room.actIndex,
    round: room.round
  }]);
  await saveRoom(room);
  return { ok: true, room: sanitize(room, openid) };
}

async function endRound(event, openid) {
  const room = await getRoom(event.roomId);
  if (!room) return fail('gone');
  if (room.status !== 'playing') return fail('started');
  const idx = seatIndex(room, openid);
  if (idx < 0) return fail('denied');

  if (!room.ended.includes(openid)) room.ended.push(openid);
  const players = (room.seats || []).filter(Boolean).length;

  if (players > 0 && room.ended.length >= players) {
    const acts = room.acts || [];
    let actIndex = room.actIndex || 0;
    let round = (room.round || 0) + 1;
    if (round >= (acts[actIndex] || 1)) {
      round = 0;
      actIndex += 1;
    }
    room.actIndex = actIndex;
    room.round = round;
    room.ended = [];
    if (actIndex >= acts.length) {
      room.status = 'voting';
    }
  }

  await saveRoom(room);
  return { ok: true, room: sanitize(room, openid) };
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const openid = OPENID || (event.profile && event.profile.id) || '';
  if (!openid) return fail('denied');

  try {
    switch (event.action) {
      case 'whoami': {
        const profile = await registerUser(openid);
        if (!profile) return fail('server');
        return { ok: true, openid, nickName: profile.nickName, shortId: profile.shortId };
      }
      case 'loadSave':
        return await loadSave(openid);
      case 'writeSave':
        return await writeSave(openid, event.stats);
      case 'create':
        return await createRoom(event, openid);
      case 'join':
        return await joinRoom(event, openid);
      case 'state': {
        const room = await getRoom(event.roomId);
        if (!room) return fail('gone');
        return { ok: true, room: sanitize(room, openid) };
      }
      case 'leave':
        return await leaveRoom(event, openid);
      case 'ready':
        return await setReady(event, openid);
      case 'start':
        return await startGame(event, openid);
      case 'setClue':
        return await setClue(event, openid);
      case 'shareClue':
        return await shareClue(event, openid);
      case 'endRound':
        return await endRound(event, openid);
      default:
        return fail('server');
    }
  } catch (e) {
    return fail('server');
  }
};
