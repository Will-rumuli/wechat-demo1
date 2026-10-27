import { W, H, TOP } from '../core/screen.js';
import {
  COLORS, drawBackdrop, drawIcon, text, wrapText,
  fillRound, strokeRound, measureLines, reliabilityColor
} from '../ui/theme.js';
import { playTap, playClue } from '../core/audio.js';
import { getScript } from '../data/scripts.js';
import {
  createTeammates, pickLocation, shareMessage,
  idleMessage, reactionTo, accusation
} from '../ai/teammates.js';
import { ScrollView } from '../ui/widgets.js';
import { loadUser } from '../core/user.js';
import { roomApi, roomErrorText } from '../core/cloud.js';

function hashStr(str) {
  let h = 2166136261;
  const value = String(str || '');
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle(list, seed) {
  let s = (seed || 1) % 233280;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

const SEAT_COLORS = ['#F2C14E', '#7FB37F', '#7FB3D5', '#B07FD5', '#E28B80', '#5DA9A0'];

function splitLines(ctx, str, maxWidth) {
  const chars = String(str).split('');
  const lines = [];
  let line = '';
  for (let i = 0; i < chars.length; i += 1) {
    const test = line + chars[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = chars[i];
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export default class Game {
  constructor(app, params) {
    this.app = app;
    this.caseId = params.caseId || 'case1';
    this.mode = params.mode === 'online' ? 'online' : 'solo';
    this.online = this.mode === 'online';
    this.roomId = params.roomId || '';
    this.room = params.room || null;
    this.user = loadUser();
    // 本局的藏身点：单人由角色页传入，联机按房间号固定，保证所有玩家一致
    this.keySpot = this.resolveSpot(params.keySpot);
    this.script = getScript(this.caseId, this.keySpot);
    this.role = this.script.ROLE_MAP[params.roleId]
      || (this.room && this.room.myRoleId && this.script.ROLE_MAP[this.room.myRoleId])
      || this.script.ROLES[0];
    // 本局的关键说谎者：单人每局随机（排除自己），联机按房间号固定，保证所有玩家答案一致
    this.keyLiar = this.resolveKeyLiar(params.keyLiar);

    if (this.online) {
      this.bots = [];
      const ids = params.handIds || (this.room && this.room.myClues) || [];
      this.hand = ids.map((id) => this.script.CLUES[id]).filter(Boolean);
    } else {
      this.bots = createTeammates(this.script.ROLES, this.role.id);
      this.hand = this.role.privateClues.map((id) => this.script.CLUES[id]).filter(Boolean);
      this.bots.forEach((bot) => {
        bot.clues = bot.role.privateClues.map((id) => this.script.CLUES[id]).filter(Boolean);
      });
    }
    this.owned = new Set(this.hand.map((c) => c.id));
    this.botFound = new Set();

    this.actIndex = 0;
    this.round = 0;
    this.phase = 'action';
    this.chat = [];
    this.currentLocations = [];
    this.usedLocations = {};
    this.overlay = null;
    this.sharedThisRound = false;
    this.time = 0;
    this.clockT = 0;

    this.needInit = this.online;
    this.waiting = false;
    this.pollT = 0;
    this.polling = false;
    this.lastShared = 0;
    this.voted = false;
    this.toastMsg = '';
    this.toastT = 0;

    this.chatView = new ScrollView({
      x: 0,
      y: TOP + 62,
      w: W,
      h: Math.max(80, H - 252 - (TOP + 62))
    });
  }

  enter() {
    this.sys(this.script.CASE.group);
    this.script.CASE.opening.forEach((line) => this.sys(line));
    if (this.online) {
      this.sys('多人联机 · 全员结束本回合后统一推进');
      if (this.room) this.applyRoom(this.room, true);
      return;
    }
    const first = this.script.CASE.firstLine;
    const speaker = this.script.ROLE_MAP[first.roleId] || this.script.ROLES[0];
    this.say(speaker, first.text);
    this.startAct(0);
  }

  // ---------- 联机 ----------
  roomMyId() {
    return (this.room && this.room.myId) || (this.user && this.user.id) || '';
  }

  seatColor(id) {
    const seats = (this.room && this.room.seats) || [];
    const idx = seats.findIndex((seat) => seat && seat.id === id);
    return SEAT_COLORS[(idx < 0 ? 0 : idx) % SEAT_COLORS.length];
  }

  hasSharedRound() {
    if (!this.room) return false;
    const myId = this.roomMyId();
    return (this.room.shared || []).some(
      (entry) => entry.by === myId
        && entry.actIndex === this.actIndex
        && entry.round === this.round
    );
  }

  applyRoom(room, force) {
    if (!room) return;
    const prevAct = this.actIndex;
    const prevRound = this.round;
    this.room = room;

    if (room.myRoleId && this.script.ROLE_MAP[room.myRoleId] && this.role.id !== room.myRoleId) {
      this.role = this.script.ROLE_MAP[room.myRoleId];
    }
    (room.myClues || []).forEach((id) => {
      if (this.owned.has(id)) return;
      const clue = this.script.CLUES[id];
      if (!clue) return;
      this.hand.push(clue);
      this.owned.add(id);
    });

    if (room.status === 'voting') {
      this.goVote();
      return;
    }

    const changed = force || this.needInit
      || room.actIndex !== prevAct || room.round !== prevRound;
    if (changed) {
      this.needInit = false;
      this.actIndex = room.actIndex || 0;
      this.round = room.round || 0;
      this.phase = 'action';
      this.waiting = false;
      this.overlay = null;
      this.usedLocations = {};
      this.prepareRound();
      const act = this.script.ACTS[this.actIndex];
      if (act) this.sys(`【${act.title}】${act.hint}`);
      if (!force && (room.actIndex > prevAct || room.round > prevRound)) {
        this.sys('所有人已结束上一回合，继续调查。');
      }
    }

    this.syncShared(room);
  }

  syncShared(room) {
    const shared = room.shared || [];
    if (shared.length < this.lastShared) this.lastShared = 0;
    for (let i = this.lastShared; i < shared.length; i += 1) {
      const entry = shared[i];
      if (entry.by === this.roomMyId()) continue;
      const clue = this.script.CLUES[entry.clueId];
      if (!clue) continue;
      const seats = room.seats || [];
      const seat = seats.find((s) => s && s.id === entry.by);
      this.push({
        who: 'role',
        roleId: entry.by,
        name: (seat && seat.nickName) || entry.name || '邻居',
        color: this.seatColor(entry.by),
        text: `【${clue.title}】${clue.text}`
      });
    }
    this.lastShared = shared.length;
  }

  async refreshRoom() {
    if (this.polling || !this.roomId) return;
    this.polling = true;
    const res = await roomApi.state(this.roomId);
    this.polling = false;
    if (!res.ok) {
      if (res.error === 'gone') {
        this.showToast('房间已解散');
        this.app.go('catalog');
      }
      return;
    }
    this.applyRoom(res.room);
  }

  resolveSpot(fixed) {
    if (fixed) return fixed;
    const spots = getScript(this.caseId).SPOTS || [];
    if (!spots.length) return '';
    if (this.online && this.roomId) {
      let seed = 7;
      for (let i = 0; i < this.roomId.length; i += 1) {
        seed = (seed * 31 + this.roomId.charCodeAt(i)) % 9973;
      }
      return spots[seed % spots.length].id;
    }
    return spots[Math.floor(Math.random() * spots.length)].id;
  }

  resolveKeyLiar(fixed) {
    if (fixed) return fixed;
    const roles = this.script.ROLES;
    if (this.online && this.roomId) {
      let seed = 0;
      for (let i = 0; i < this.roomId.length; i += 1) {
        seed = (seed * 31 + this.roomId.charCodeAt(i)) % 9973;
      }
      return roles[seed % roles.length].id;
    }
    const pool = roles.filter((role) => role.id !== this.role.id);
    const list = pool.length ? pool : roles;
    return list[Math.floor(Math.random() * list.length)].id;
  }

  goVote() {
    if (this.voted) return;
    this.voted = true;
    const realClues = this.hand.filter((c) => c.id);
    this.app.go('vote', {
      caseId: this.caseId,
      roleId: this.role.id,
      clueCount: realClues.length,
      handIds: realClues.map((c) => c.id),
      mode: this.mode,
      roomId: this.roomId,
      keyLiar: this.keyLiar,
      keySpot: this.keySpot
    });
  }

  showToast(msg) {
    this.toastMsg = msg;
    this.toastT = 2;
  }

  // ---------- 流程 ----------
  startAct(index) {
    this.actIndex = index;
    this.round = 0;
    this.usedLocations = {};
    this.phase = 'action';
    const act = this.script.ACTS[index];
    this.sys(`【${act.title}】${act.hint}`);
    this.prepareRound();
  }

  prepareRound() {
    this.phase = 'action';
    this.sharedThisRound = false;
    const act = this.script.ACTS[this.actIndex];
    if (!act) return;
    if (this.online) {
      const seed = hashStr(`${this.roomId}-${this.actIndex}-${this.round}`);
      this.currentLocations = seededShuffle(act.locations, seed).slice(0, 4);
      this.sharedThisRound = this.hasSharedRound();
      return;
    }
    let fresh = act.locations.filter((id) => !this.usedLocations[id]);
    fresh = fresh.sort(() => Math.random() - 0.5);
    if (!fresh.length) fresh = act.locations.slice(0, 3);
    this.currentLocations = fresh.slice(0, 4);
  }

  investigate(locId) {
    if (this.phase !== 'action') return;
    this.usedLocations[locId] = true;
    playClue();
    const claimed = this.online && this.room ? (this.room.claimed || []) : [];
    const candidates = this.script.CLUE_LIST.filter(
      (c) => c.loc === locId
        && (!c.act || c.act === this.actIndex + 1)
        && !this.owned.has(c.id)
        && claimed.indexOf(c.id) === -1
    );
    const clue = candidates.length ? candidates[0] : { ...this.script.FILLER, id: null, loc: locId };
    this.overlay = { mode: 'pickup', clue };
  }

  finishPickup() {
    const ov = this.overlay;
    this.overlay = null;
    if (!ov) return;
    if (ov.clue && ov.clue.id) {
      this.hand.push(ov.clue);
      this.owned.add(ov.clue.id);
      if (this.online) {
        roomApi.setClue(this.roomId, ov.clue.id).then((res) => {
          if (res.ok) this.room = res.room;
        });
      }
    }
    if (this.online) {
      this.phase = 'discuss';
      this.sys('讨论阶段：可以公开一条线索，或者结束本轮等待其他人。');
      return;
    }
    this.runBots();
    this.phase = 'discuss';
    this.sys('讨论阶段：可以公开一条线索，或者直接进入下一轮。');
  }

  runBots() {
    const act = this.script.ACTS[this.actIndex];
    let budget = 2;
    const bots = this.bots.slice().sort(() => Math.random() - 0.5);

    bots.forEach((bot) => {
      const loc = pickLocation(bot, act.locations);
      bot.visited[loc] = true;
      const pool = this.script.CLUE_LIST.filter(
        (c) => c.loc === loc
          && (!c.act || c.act === this.actIndex + 1)
          && !this.botFound.has(c.id)
          && !this.owned.has(c.id)
      );
      let gained = null;
      if (pool.length && Math.random() < 0.8) {
        gained = pool[Math.floor(Math.random() * pool.length)];
        this.botFound.add(gained.id);
        bot.clues.push(gained);
      }
      if (budget <= 0) return;
      if (gained && !this.owned.has(gained.id) && Math.random() < 0.62) {
        this.say(bot.role, shareMessage(gained));
        this.owned.add(gained.id);
        budget -= 1;
      } else if (Math.random() < 0.45) {
        this.say(bot.role, idleMessage(this.script, this.actIndex + 1, this.round));
        budget -= 1;
      }
    });

    if (budget > 0 && this.actIndex >= 1 && Math.random() < 0.55) {
      const acc = accusation(this.bots);
      if (acc) this.say(this.script.ROLE_MAP[acc.roleId], acc.text);
    }
  }

  shareClue(clue) {
    if (this.sharedThisRound || !clue) {
      this.overlay = null;
      return;
    }
    this.sharedThisRound = true;
    clue.shared = true;
    this.overlay = null;
    playClue();
    this.me(`【${clue.title}】${clue.text}`);
    if (this.online) {
      roomApi.shareClue(this.roomId, clue.id).then((res) => {
        if (res.ok) {
          this.room = res.room;
          this.lastShared = (res.room.shared || []).length;
        } else if (res.error !== 'shared') {
          this.showToast(roomErrorText(res));
        }
      });
      return;
    }
    if (Math.random() < 0.85) {
      const r = reactionTo(this.script, clue.id, this.bots);
      this.say(this.script.ROLE_MAP[r.roleId], r.text);
    }
  }

  endRound() {
    if (this.online) {
      if (this.phase !== 'discuss' || this.waiting) return;
      this.waiting = true;
      this.phase = 'waiting';
      this.overlay = null;
      roomApi.endRound(this.roomId).then((res) => {
        if (!res.ok) {
          this.waiting = false;
          this.phase = 'discuss';
          this.showToast(roomErrorText(res));
          return;
        }
        this.applyRoom(res.room);
      });
      return;
    }
    if (this.phase !== 'discuss') return;
    const act = this.script.ACTS[this.actIndex];
    this.round += 1;
    if (this.round >= act.rounds) {
      this.phase = 'event';
      this.overlay = { mode: 'event', event: act.event };
    } else {
      this.prepareRound();
    }
  }

  nextAct() {
    this.overlay = null;
    if (this.actIndex >= this.script.ACTS.length - 1) {
      const realClues = this.hand.filter((c) => c.id).length;
      this.app.go('vote', {
        caseId: this.caseId,
        roleId: this.role.id,
        clueCount: realClues,
        handIds: this.hand.filter((c) => c.id).map((c) => c.id),
        mode: this.mode,
        roomId: this.roomId,
        keyLiar: this.keyLiar,
        keySpot: this.keySpot
      });
      return;
    }
    this.startAct(this.actIndex + 1);
  }

  // ---------- 聊天 ----------
  push(message) {
    const atBottom = this.chatView.offset >= this.chatView.max - 4;
    this.chat.push(message);
    if (this.chat.length > 80) this.chat.shift();
    this.chatView.stickBottom = atBottom;
  }

  sys(content) {
    this.push({ who: 'sys', text: content });
  }

  say(role, content) {
    this.push({ who: 'role', roleId: role.id, name: role.name, color: role.color, text: content });
  }

  me(content) {
    this.push({ who: 'me', text: content });
  }

  // ---------- 输入 ----------
  update(dt) {
    this.time += dt;
    this.chatView.update(dt);
    if (this.toastT > 0) this.toastT = Math.max(0, this.toastT - dt);
    if (this.online && this.roomId) {
      this.pollT += dt;
      if (this.pollT >= 1.2) {
        this.pollT = 0;
        this.refreshRoom();
      }
    }
  }

  move(x, y) {
    if (this.overlay) return;
    if (this.chatView.dragging) {
      this.chatView.move(y);
      return;
    }
    this.chatView.start(x, y);
  }

  end() {
    this.chatView.end();
  }

  tap(x, y) {
    if (this.overlay) {
      const card = this.cardRect();
      const buttons = this.overlayButtons(this.overlay.mode, card);
      for (let i = 0; i < buttons.length; i += 1) {
        const b = buttons[i];
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
          playTap();
          this.handleOverlay(b.key);
          return;
        }
      }
      return;
    }

    if (this.phase === 'waiting') return;

    if (this.phase === 'action') {
      const items = this.layoutLocations();
      for (let i = 0; i < items.length; i += 1) {
        const it = items[i];
        if (x >= it.x && x <= it.x + it.w && y >= it.y && y <= it.y + it.h) {
          playTap();
          this.investigate(it.id);
          return;
        }
      }
    } else if (this.phase === 'discuss') {
      const chips = this.layoutChips();
      for (let i = 0; i < chips.length; i += 1) {
        const c = chips[i];
        if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
          playTap();
          this.overlay = { mode: 'share', clue: c.clue };
          return;
        }
      }
      const btn = this.endButtonRect();
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        playTap();
        this.endRound();
      }
    }
  }

  handleOverlay(key) {
    if (key === 'pickup') this.finishPickup();
    else if (key === 'share') this.shareClue(this.overlay.clue);
    else if (key === 'cancel') this.overlay = null;
    else if (key === 'next') this.nextAct();
  }

  // ---------- 布局 ----------
  layoutLocations() {
    const gap = 12;
    const w = (W - 48 - gap) / 2;
    const h = 72;
    const startY = H - 198;
    return this.currentLocations.map((id, i) => ({
      id,
      x: 24 + (i % 2) * (w + gap),
      y: startY + Math.floor(i / 2) * (h + gap),
      w,
      h
    }));
  }

  layoutChips() {
    const list = this.hand.filter((c) => c.id && !c.shared).slice(-3).reverse();
    return list.map((clue, i) => ({
      clue,
      x: 24,
      y: H - 196 + i * 32,
      w: W - 48,
      h: 28
    }));
  }

  endButtonRect() {
    return { x: 24, y: H - 92, w: W - 48, h: 44 };
  }

  cardRect() {
    const h = Math.min(430, H * 0.62);
    return { x: 28, y: (H - h) / 2, w: W - 56, h };
  }

  overlayButtons(mode, card) {
    if (mode === 'pickup') {
      return [{
        key: 'pickup', x: card.x + 24, y: card.y + card.h - 64,
        w: card.w - 48, h: 44,
        label: this.overlay && this.overlay.clue && this.overlay.clue.id ? '收进手牌' : '继续'
      }];
    }
    if (mode === 'share') {
      return [
        { key: 'share', x: card.x + 24, y: card.y + card.h - 112, w: card.w - 48, h: 44, label: '公开到群聊' },
        { key: 'cancel', x: card.x + 24, y: card.y + card.h - 58, w: card.w - 48, h: 40, label: '再想想' }
      ];
    }
    return [{
      key: 'next', x: card.x + 24, y: card.y + card.h - 64,
      w: card.w - 48, h: 44, label: '继续'
    }];
  }

  // ---------- 渲染 ----------
  clockText() {
    const act = this.script.ACTS[this.actIndex];
    const total = ((act.start || 0) + this.round * (act.step || 30)) % (24 * 60);
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    return `${hours < 10 ? '0' : ''}${hours}:${minutes < 10 ? '0' : ''}${minutes}`;
  }

  render(ctx) {
    drawBackdrop(ctx, this.time, 0.58);
    const act = this.script.ACTS[this.actIndex];

    text(ctx, act.title, 20, TOP + 24, {
      size: 11, color: COLORS.amber, maxWidth: W * 0.48
    });
    text(ctx, this.clockText(), W - 20, TOP + 24, { size: 12, color: COLORS.gray, align: 'right' });
    if (this.online) {
      const room = this.room;
      const status = room
        ? `${room.playerCount || 0} 人联机 · ${room.endedCount || 0}/${room.playerCount || 0} 已结束`
        : '多人联机';
      text(ctx, status, W - 20, TOP + 42, {
        size: 10, color: 'rgba(138,147,163,0.8)', align: 'right', maxWidth: W * 0.6
      });
    } else {
      text(ctx, `${this.role.name} · ${this.role.job}`, W - 20, TOP + 42, {
        size: 10, color: 'rgba(138,147,163,0.8)', align: 'right', maxWidth: W * 0.5
      });
    }

    for (let i = 0; i < act.rounds; i += 1) {
      ctx.beginPath();
      ctx.arc(22 + i * 13, TOP + 42, 3, 0, Math.PI * 2);
      if (i < this.round) {
        ctx.fillStyle = 'rgba(242,193,78,0.75)';
        ctx.fill();
      } else if (i === this.round) {
        ctx.strokeStyle = COLORS.amber;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(245,241,232,0.18)';
        ctx.fill();
      }
    }

    this.drawChat(ctx);
    this.drawPanel(ctx);

    if (this.overlay) this.drawOverlay(ctx);
    if (this.toastT > 0) this.drawToast(ctx);
  }

  drawToast(ctx) {
    const alpha = Math.min(1, this.toastT / 0.25);
    ctx.save();
    ctx.font = '12px "PingFang SC", sans-serif';
    const w = Math.min(W - 48, ctx.measureText(this.toastMsg).width + 32);
    ctx.restore();
    const x = (W - w) / 2;
    const y = TOP + 64;
    fillRound(ctx, x, y, w, 36, 18, `rgba(12,18,28,${0.96 * alpha})`);
    strokeRound(ctx, x, y, w, 36, 18, `rgba(242,193,78,${0.4 * alpha})`);
    text(ctx, this.toastMsg, W / 2, y + 23, {
      size: 12, color: `rgba(245,241,232,${alpha})`, align: 'center', maxWidth: w - 24
    });
  }

  drawChat(ctx) {
    const view = this.chatView;
    const heights = this.chat.map((msg) => this.msgHeight(ctx, msg));
    let total = 8;
    for (let i = 0; i < heights.length; i += 1) total += heights[i] + 6;
    view.setContent(total);

    ctx.save();
    ctx.beginPath();
    ctx.rect(view.x, view.y, view.w, view.h);
    ctx.clip();
    const startPad = total < view.h ? view.h - total : 4;
    let y = view.y + startPad - view.offset;
    for (let i = 0; i < this.chat.length; i += 1) {
      const h = heights[i];
      if (y + h > view.y - 2 && y < view.y + view.h + 2) {
        this.drawMsg(ctx, this.chat[i], y, h);
      }
      y += h + 6;
    }
    ctx.restore();
    view.drawBar(ctx);
  }

  msgHeight(ctx, msg) {
    if (msg.who === 'sys') {
      ctx.save();
      ctx.font = '10px "PingFang SC", sans-serif';
      const lines = measureLines(ctx, msg.text, W - 80);
      ctx.restore();
      return 16 + lines * 15;
    }
    ctx.save();
    ctx.font = '13px "PingFang SC", sans-serif';
    const lines = measureLines(ctx, msg.text, W * 0.62 - 24);
    ctx.restore();
    return 18 + lines * 18 + 14;
  }

  drawMsg(ctx, msg, y, h) {
    if (msg.who === 'sys') {
      ctx.save();
      ctx.font = '10px "PingFang SC", sans-serif';
      const lines = splitLines(ctx, msg.text, W - 80);
      ctx.restore();
      lines.forEach((line, i) => {
        text(ctx, line, W / 2, y + 14 + i * 15, {
          size: 10, color: 'rgba(138,147,163,0.85)', align: 'center'
        });
      });
      return;
    }

    ctx.save();
    ctx.font = '13px "PingFang SC", sans-serif';
    const maxW = W * 0.62 - 24;
    const lines = splitLines(ctx, msg.text, maxW);
    const textW = Math.max(...lines.map((l) => ctx.measureText(l).width));
    ctx.restore();
    const bubbleW = Math.min(maxW + 24, textW + 24);
    const bubbleH = h - 18;

    if (msg.who === 'me') {
      const bx = W - 20 - bubbleW;
      const by = y + 18;
      fillRound(ctx, bx, by, bubbleW, bubbleH, 10, 'rgba(242,193,78,0.92)');
      text(ctx, '你', W - 20, y + 12, { size: 9, color: 'rgba(242,193,78,0.8)', align: 'right' });
      lines.forEach((line, i) => {
        text(ctx, line, bx + 12, by + 20 + i * 18, { size: 13, color: '#141922' });
      });
    } else {
      const ax = 20;
      const bx = 46;
      const by = y + 18;
      ctx.beginPath();
      ctx.arc(ax + 10, by + 10, 11, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fill();
      text(ctx, msg.name.slice(0, 1), ax + 10, by + 15, {
        size: 11, color: msg.color, align: 'center'
      });
      text(ctx, msg.name, bx, y + 12, { size: 9, color: msg.color });
      fillRound(ctx, bx, by, bubbleW, bubbleH, 10, 'rgba(245,241,232,0.10)');
      strokeRound(ctx, bx, by, bubbleW, bubbleH, 10, 'rgba(245,241,232,0.08)');
      lines.forEach((line, i) => {
        text(ctx, line, bx + 12, by + 20 + i * 18, { size: 13, color: 'rgba(245,241,232,0.9)' });
      });
    }
  }

  drawPanel(ctx) {
    fillRound(ctx, 0, H - 250, W, 260, 18, 'rgba(14,20,32,0.97)');
    ctx.fillStyle = 'rgba(14,20,32,0.97)';
    ctx.fillRect(0, H - 20, W, 20);

    ctx.save();
    ctx.strokeStyle = 'rgba(242,193,78,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H - 250.5);
    ctx.lineTo(W, H - 250.5);
    ctx.stroke();
    ctx.restore();

    if (this.phase === 'action') {
      const act = this.script.ACTS[this.actIndex];
      text(ctx, `第 ${this.round + 1}/${act.rounds} 轮 · 选择调查地点`, 24, H - 220, {
        size: 11, color: COLORS.gray, maxWidth: W - 48
      });
      const items = this.layoutLocations();
      items.forEach((item) => {
        const loc = this.script.LOCATIONS[item.id];
        fillRound(ctx, item.x, item.y, item.w, item.h, 12, 'rgba(255,255,255,0.05)');
        strokeRound(ctx, item.x, item.y, item.w, item.h, 12, 'rgba(245,241,232,0.12)');
        drawIcon(ctx, loc.icon, item.x + 22, item.y + 24, 18, COLORS.amber);
        text(ctx, loc.name, item.x + 42, item.y + 27, {
          size: 13, color: COLORS.paper, maxWidth: item.w - 68
        });
        text(ctx, loc.sub, item.x + 42, item.y + 46, {
          size: 10, color: COLORS.gray, maxWidth: item.w - 68
        });
        text(ctx, '›', item.x + item.w - 14, item.y + item.h / 2 + 5, {
          size: 18, color: 'rgba(245,241,232,0.3)', align: 'right'
        });
      });
    } else if (this.phase === 'discuss') {
      text(ctx, `讨论 · 手牌 ${this.hand.length} 条`, 24, H - 220, {
        size: 11, color: COLORS.gray, maxWidth: W - 48
      });
      const chips = this.layoutChips();
      if (!chips.length) {
        text(ctx, '没有可以公开的新线索。', 24, H - 176, {
          size: 12, color: 'rgba(245,241,232,0.45)', maxWidth: W - 48
        });
      }
      chips.forEach((chip) => {
        fillRound(ctx, chip.x, chip.y, chip.w, chip.h, 8, 'rgba(245,241,232,0.06)');
        text(ctx, chip.clue.title, chip.x + 12, chip.y + 18, {
          size: 11, color: COLORS.paper, maxWidth: chip.w - 96
        });
        text(ctx, `公开 · ${chip.clue.reliability}`, chip.x + chip.w - 12, chip.y + 18, {
          size: 10, color: reliabilityColor(chip.clue.reliability), align: 'right'
        });
      });
      const rest = this.hand.filter((c) => c.id && !c.shared).length - chips.length;
      if (rest > 0) {
        text(ctx, `还有 ${rest} 条未展示`, W - 24, H - 220, {
          size: 10, color: 'rgba(138,147,163,0.8)', align: 'right', maxWidth: W * 0.4
        });
      }
      const btn = this.endButtonRect();
      fillRound(ctx, btn.x, btn.y, btn.w, btn.h, 12, COLORS.amber);
      const label = this.online
        ? '结束本轮 · 等待全员'
        : (this.round + 1 >= this.script.ACTS[this.actIndex].rounds ? '结束本幕' : '结束本轮');
      text(ctx, label, W / 2, btn.y + 28, {
        size: 15, color: '#12161F', align: 'center', weight: 600
      });
    } else if (this.phase === 'waiting') {
      const room = this.room;
      const ended = room ? (room.endedCount || 0) : 0;
      const total = room ? (room.playerCount || 0) : 0;
      text(ctx, '已结束本回合', 24, H - 208, {
        size: 15, color: COLORS.paper, weight: 600, maxWidth: W - 48
      });
      text(ctx, `等待其他玩家 · ${ended}/${total} 已结束`, 24, H - 184, {
        size: 12, color: COLORS.gray, maxWidth: W - 48
      });
      text(ctx, '全员结束后自动进入下一回合', 24, H - 162, {
        size: 11, color: 'rgba(245,241,232,0.4)', maxWidth: W - 48
      });
      const dots = '·'.repeat(1 + (Math.floor(this.time * 2) % 3));
      text(ctx, dots, W - 32, H - 184, {
        size: 16, color: COLORS.amber, align: 'right'
      });
    }
  }

  drawOverlay(ctx) {
    ctx.fillStyle = 'rgba(5,8,14,0.86)';
    ctx.fillRect(0, 0, W, H);
    const card = this.cardRect();

    if (this.overlay.mode === 'event') {
      fillRound(ctx, card.x, card.y, card.w, card.h, 16, '#111A28');
      strokeRound(ctx, card.x, card.y, card.w, card.h, 16, 'rgba(242,193,78,0.4)');
      text(ctx, '公共事件', card.x + 24, card.y + 40, { size: 11, color: COLORS.amber });
      const eventTitleLines = wrapText(
        ctx, this.overlay.event.title, card.x + 24, card.y + 84, card.w - 48, 26, 2,
        { size: 20, color: COLORS.paper, weight: 700 }
      );
      wrapText(
        ctx, this.overlay.event.text, card.x + 24,
        card.y + 84 + eventTitleLines * 26 + 14,
        card.w - 48, 24, 5,
        { size: 14, color: 'rgba(245,241,232,0.8)' }
      );
    } else {
      const clue = this.overlay.clue;
      fillRound(ctx, card.x, card.y, card.w, card.h, 16, COLORS.paper);
      text(ctx, clue.source || '现场', card.x + 24, card.y + 34, {
        size: 11, color: 'rgba(27,27,27,0.55)', maxWidth: card.w - 48
      });
      wrapText(ctx, clue.title, card.x + 24, card.y + 68, card.w - 120, 24, 2, {
        size: W < 360 ? 18 : 20, color: COLORS.ink, weight: 700
      });

      if (clue.id) {
        ctx.save();
        ctx.translate(card.x + card.w - 62, card.y + 62);
        ctx.rotate(-0.18);
        ctx.strokeStyle = reliabilityColor(clue.reliability);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI * 2);
        ctx.stroke();
        text(ctx, clue.reliability, 0, 5, {
          size: 12, color: reliabilityColor(clue.reliability), align: 'center', weight: 600
        });
        ctx.restore();
      }

      wrapText(ctx, clue.text, card.x + 24, card.y + 124, card.w - 48, 24, 5, {
        size: 14, color: COLORS.ink
      });

      if (clue.tag) {
        text(ctx, `# ${clue.tag}`, card.x + 24, card.y + card.h - 84, {
          size: 11, color: 'rgba(27,27,27,0.5)', maxWidth: card.w - 48
        });
      }
    }

    const buttons = this.overlayButtons(this.overlay.mode, card);
    buttons.forEach((b) => {
      if (b.key === 'cancel') {
        strokeRound(ctx, b.x, b.y, b.w, b.h, 12, 'rgba(27,27,27,0.3)');
        text(ctx, b.label, b.x + b.w / 2, b.y + 25, {
          size: 14, color: 'rgba(27,27,27,0.7)', align: 'center'
        });
      } else {
        fillRound(ctx, b.x, b.y, b.w, b.h, 12, COLORS.amber);
        text(ctx, b.label, b.x + b.w / 2, b.y + 28, {
          size: 15, color: '#12161F', align: 'center', weight: 600
        });
      }
    });
  }
}
