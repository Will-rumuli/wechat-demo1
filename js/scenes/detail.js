import { W, H, TOP, BOTTOM } from '../core/screen.js';
import {
  COLORS, drawBackdrop, text, wrapText, fillRound, strokeRound, roundRect
} from '../ui/theme.js';
import { unlock, playTap } from '../core/audio.js';
import { getScript } from '../data/scripts.js';
import { loadUser } from '../core/user.js';
import { initCloud, roomApi, roomErrorText } from '../core/cloud.js';
import { drawAvatar } from '../core/avatar.js';
import { inviteCardImage, prepareInviteCard } from '../core/shareCard.js';

const COVER_PALETTES = [
  ['#0C1420', '#1B2638', '#0A0F18'],
  ['#150F16', '#2A1822', '#0B0910'],
  ['#0C1516', '#17282A', '#081010'],
  ['#111018', '#251F2F', '#0A090F']
];

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function profileOf(user) {
  return {
    nickName: user.nickName,
    avatarUrl: user.avatarUrl || '',
    shortId: user.shortId
  };
}

export default class Detail {
  constructor(app, params) {
    this.app = app;
    this.params = params || {};
    this.caseId = this.params.caseId || 'case1';
    this.script = getScript(this.caseId);
    this.case = this.script.CASE;
    this.user = loadUser();
    this.time = 0;

    this.room = this.params.room || null;
    this.roomId = this.room ? this.room.roomId : (this.params.roomId || '');
    this.modal = false;
    this.busy = false;
    this.entered = false;
    this.pollT = 0;
    this.polling = false;
    this.netErr = false;
    this.toast = '';
    this.toastT = 0;

    this.seatRects = [];
    this.seatIndexByRect = [];

    if (this.params.autoJoin && this.roomId && this.user) {
      this.autoJoin();
    }
  }

  // ---------- 数据 ----------
  totalRounds() {
    return this.script.ACTS.reduce((sum, act) => sum + act.rounds, 0);
  }

  openMulti() {
    if (this.busy) return;
    if (!this.user) {
      this.app.go('login');
      return;
    }
    if (this.room && this.room.status === 'waiting' && this.room.caseId === this.caseId) {
      this.modal = true;
      return;
    }
    if (!initCloud()) {
      this.showToast('联机服务未配置，请先开通云开发并部署 room 云函数');
      return;
    }
    this.createRoom();
  }

  async createRoom() {
    this.busy = true;
    const res = await roomApi.create({
      caseId: this.caseId,
      title: this.case.title,
      maxSeats: this.script.ROLES.length,
      acts: this.script.ACTS.map((act) => act.rounds),
      roleIds: this.script.ROLES.map((role) => role.id),
      profile: profileOf(this.user)
    });
    this.busy = false;
    if (!res.ok) {
      this.showToast(roomErrorText(res));
      return;
    }
    this.room = res.room;
    this.roomId = res.room.roomId;
    this.modal = true;
    this.prepareShareCard();
  }

  async autoJoin() {
    if (this.busy) return;
    if (!initCloud()) {
      this.showToast('联机服务未配置，请先开通云开发并部署 room 云函数');
      return;
    }
    this.busy = true;
    const res = await roomApi.join(this.roomId, profileOf(this.user));
    this.busy = false;
    if (!res.ok) {
      this.showToast(roomErrorText(res));
      return;
    }
    this.room = res.room;
    this.caseId = res.room.caseId || this.caseId;
    this.script = getScript(this.caseId);
    this.case = this.script.CASE;
    this.modal = true;
    this.prepareShareCard();
    if (res.room.status === 'playing') this.enterGame();
  }

  async refresh() {
    if (!this.roomId || this.polling) return;
    this.polling = true;
    const res = await roomApi.state(this.roomId);
    this.polling = false;
    if (!res.ok) {
      if (res.error === 'gone') {
        this.modal = false;
        this.room = null;
        this.roomId = '';
        this.showToast('房间已解散');
      } else {
        this.netErr = true;
      }
      return;
    }
    this.netErr = false;
    this.room = res.room;
    this.prepareShareCard();
    if (this.room.status === 'playing') this.enterGame();
  }

  enterGame() {
    if (this.entered || !this.room || this.room.status !== 'playing') return;
    this.entered = true;
    playTap();
    const room = this.room;
    this.app.go('game', {
      caseId: room.caseId || this.caseId,
      mode: 'online',
      roomId: room.roomId,
      roleId: room.myRoleId,
      handIds: room.myClues || [],
      room
    });
  }

  async toggleReady() {
    if (this.busy || !this.room) return;
    this.busy = true;
    const next = !this.room.myReady;
    const res = await roomApi.ready(this.roomId, next);
    this.busy = false;
    if (!res.ok) {
      this.showToast(roomErrorText(res));
      return;
    }
    this.room = res.room;
  }

  async startGame() {
    if (this.busy || !this.room) return;
    const players = this.room.playerCount || 0;
    if (players < (this.room.maxSeats || 0)) {
      this.showToast('人数还没满，再等等');
      return;
    }
    const notReady = (this.room.seats || []).some((seat) => seat && !seat.ready);
    if (notReady) {
      this.showToast('还有成员没有准备');
      return;
    }
    this.busy = true;
    const res = await roomApi.start(this.roomId);
    this.busy = false;
    if (!res.ok) {
      this.showToast(roomErrorText(res));
      return;
    }
    this.room = res.room;
    this.enterGame();
  }

  async leaveRoom() {
    if (this.busy) return;
    const wasHost = !!(this.room && this.room.isHost);
    this.busy = true;
    await roomApi.leave(this.roomId);
    this.busy = false;
    this.modal = false;
    this.room = null;
    this.roomId = '';
    this.showToast(wasHost ? '队伍已解散' : '已退出房间');
    this.app.go('catalog');
  }

  sharePayload() {
    const total = (this.room && this.room.maxSeats) || this.script.ROLES.length;
    const players = (this.room && this.room.playerCount) || 0;
    return {
      roomId: this.roomId,
      title: this.case.title,
      total,
      missing: Math.max(0, total - players)
    };
  }

  prepareShareCard() {
    if (!this.roomId) return;
    try {
      prepareInviteCard(this.sharePayload());
    } catch (e) {
      // 生成失败时退回系统截图
    }
  }

  shareInfo() {
    if (!this.roomId) {
      return {
        title: `「${this.case.title}」是生是死，由你决定`,
        query: `caseId=${this.caseId}`
      };
    }
    const payload = this.sharePayload();
    const info = {
      title: payload.missing > 0
        ? `「${payload.title}」还差 ${payload.missing} 人 · 是生是死，由你决定`
        : `「${payload.title}」人齐了 · 是生是死，由你决定`,
      query: `roomId=${this.roomId}&caseId=${this.caseId}`
    };
    const cover = inviteCardImage(payload);
    if (cover) info.imageUrl = cover;
    return info;
  }

  invite() {
    playTap();
    if (!this.roomId) return;
    const info = this.shareInfo();
    try {
      if (wx.showShareMenu) {
        wx.showShareMenu({ withShareTicket: false, menus: ['shareAppMessage', 'shareTimeline'] });
      }
      wx.shareAppMessage(info);
    } catch (e) {
      this.showToast('请点右上角 ··· 转发给好友');
    }
    this.prepareShareCard();
  }

  showToast(msg) {
    this.toast = msg;
    this.toastT = 2.2;
  }

  // ---------- 输入 ----------
  update(dt) {
    this.time += dt;
    if (this.toastT > 0) this.toastT = Math.max(0, this.toastT - dt);
    if (this.modal && this.roomId) {
      this.pollT += dt;
      if (this.pollT >= 1.1) {
        this.pollT = 0;
        this.refresh();
      }
    }
  }

  tap(x, y) {
    unlock();
    if (this.modal) {
      this.tapModal(x, y);
      return;
    }
    if (x <= 58 && y >= TOP && y <= TOP + 52) {
      playTap();
      this.app.go('catalog');
      return;
    }
    const actions = this.actionRects();
    if (this.hit(actions.solo, x, y)) {
      playTap();
      this.app.go('role', { caseId: this.caseId });
      return;
    }
    if (this.hit(actions.multi, x, y)) {
      playTap();
      this.openMulti();
    }
  }

  tapModal(x, y) {
    const p = this.panelRect();
    if (x < p.x || x > p.x + p.w || y < p.y || y > p.y + p.h) return;

    for (let i = 0; i < this.seatRects.length; i += 1) {
      if (!this.hit(this.seatRects[i], x, y)) continue;
      if (!(this.room && this.room.seats && this.room.seats[i])) this.invite();
      return;
    }

    const buttons = this.footerButtons();
    if (this.hit(buttons.primary, x, y)) {
      playTap();
      if (this.room && this.room.isHost) this.startGame();
      else this.toggleReady();
      return;
    }
    if (this.hit(buttons.quit, x, y)) {
      playTap();
      this.leaveRoom();
    }
  }

  hit(rect, x, y) {
    return !!rect && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  // ---------- 布局 ----------
  actionRects() {
    const y = H - BOTTOM - 82;
    const gap = 12;
    const w = Math.floor((W - 48 - gap) / 2);
    return {
      solo: { x: 24, y, w, h: 56 },
      multi: { x: 24 + w + gap, y, w, h: 56 }
    };
  }

  panelRect() {
    const h = Math.min(600, H - TOP - BOTTOM - 24);
    return {
      x: 16,
      y: Math.max(TOP + 8, Math.round((H - h) / 2)),
      w: W - 32,
      h
    };
  }

  seatLayout() {
    const p = this.panelRect();
    const n = (this.room && this.room.maxSeats) || this.script.ROLES.length;
    const gap = 10;
    const gridX = p.x + 16;
    const gridW = p.w - 32;
    const cw = Math.floor((gridW - gap) / 2);
    const rows = Math.ceil(n / 2);
    const top = p.y + 76;
    const footerTop = p.y + p.h - 124;
    const available = footerTop - 12 - top;
    const ch = Math.max(82, Math.min(116, Math.floor((available - gap * (rows - 1)) / rows)));

    this.seatRects = [];
    for (let i = 0; i < n; i += 1) {
      this.seatRects.push({
        x: gridX + (i % 2) * (cw + gap),
        y: top + Math.floor(i / 2) * (ch + gap),
        w: cw,
        h: ch
      });
    }
    return this.seatRects;
  }

  footerButtons() {
    const p = this.panelRect();
    return {
      primary: { x: p.x + 16, y: p.y + p.h - 104, w: p.w - 32, h: 46 },
      quit: { x: p.x + 16, y: p.y + p.h - 50, w: p.w - 32, h: 38 }
    };
  }

  // ---------- 渲染 ----------
  render(ctx) {
    drawBackdrop(ctx, this.time, 0.72);
    this.drawHeader(ctx);
    this.drawHero(ctx);
    this.drawSynopsis(ctx);
    this.drawActions(ctx);
    if (this.modal) this.drawModal(ctx);
    if (this.toastT > 0) this.drawToast(ctx);
  }

  drawHeader(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(245,241,232,0.72)';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(33, TOP + 12);
    ctx.lineTo(24, TOP + 21);
    ctx.lineTo(33, TOP + 30);
    ctx.stroke();
    ctx.restore();

    text(ctx, '剧本详情', 48, TOP + 26, {
      size: 14, color: COLORS.paper, weight: 600, maxWidth: W - 160
    });
    text(ctx, '单人 / 多人', W - 24, TOP + 26, {
      size: 10, color: 'rgba(138,147,163,0.9)', align: 'right'
    });
  }

  drawHero(ctx) {
    const top = TOP + 56;
    const coverW = Math.round(Math.min(142, (W - 48) * 0.42));
    const coverH = Math.round(coverW * 1.3);
    this.coverRect = { x: 24, y: top, w: coverW, h: coverH };
    this.drawCover(ctx, this.coverRect, this.case.seed || 1);

    const rx = 24 + coverW + 16;
    const rw = W - 24 - rx;
    const titleSize = W < 360 ? 18 : 21;
    const titleLines = wrapText(ctx, this.case.title, rx, top + titleSize + 4, rw, titleSize + 6, 3, {
      size: titleSize, color: COLORS.paper, weight: 700
    });

    let metaY = top + titleSize + 4 + titleLines * (titleSize + 6) + 12;
    const meta = [
      `${this.script.ROLES.length} 人 · ${this.script.ACTS.length} 幕 ${this.totalRounds()} 轮`,
      `${Object.keys(this.script.CLUES).length} 张线索`,
      `${Object.keys(this.script.ENDINGS).length} 个结局`,
      this.case.duration || ''
    ].filter(Boolean);
    meta.forEach((line, i) => {
      text(ctx, line, rx, metaY + i * 17, {
        size: 11, color: i === 0 ? 'rgba(242,193,78,0.9)' : 'rgba(245,241,232,0.6)',
        maxWidth: rw
      });
    });

    this.heroBottom = Math.max(top + coverH, metaY + meta.length * 17);
  }

  drawCover(ctx, rect, seed) {
    const { x, y, w, h } = rect;
    const pal = COVER_PALETTES[(seed - 1) % COVER_PALETTES.length];

    ctx.save();
    roundRect(ctx, x, y, w, h, 14);
    ctx.clip();

    const sky = ctx.createLinearGradient(x, y, x, y + h);
    sky.addColorStop(0, pal[0]);
    sky.addColorStop(0.6, pal[1]);
    sky.addColorStop(1, pal[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, w, h);

    const rnd = seeded(1200 + seed * 97);
    for (let i = 0; i < 4; i += 1) {
      const bw = w * (0.26 + rnd() * 0.16);
      const bh = h * (0.38 + rnd() * 0.34);
      const bx = x + (i * w) / 4 - w * 0.04;
      const by = y + h - bh;
      ctx.fillStyle = 'rgba(6,10,17,0.92)';
      ctx.fillRect(bx, by, bw, bh);

      for (let r = 0; r < 3; r += 1) {
        for (let c = 0; c < 2; c += 1) {
          const ww = bw * 0.18;
          const wh = bh * 0.1;
          const wx = bx + bw * 0.2 + c * bw * 0.34;
          const wy = by + bh * 0.18 + r * bh * 0.25;
          ctx.fillStyle = rnd() > 0.52
            ? `rgba(242,193,78,${0.22 + rnd() * 0.4})`
            : 'rgba(255,255,255,0.035)';
          ctx.fillRect(wx, wy, ww, wh);
        }
      }
    }

    ctx.strokeStyle = 'rgba(180,205,230,0.18)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 16; i += 1) {
      const rx = x + ((i * 37 + this.time * 26) % w);
      const ry = y + ((i * 53 + this.time * 150) % h);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 1.5, ry + 5 + (i % 4) * 2);
      ctx.stroke();
    }

    const fade = ctx.createLinearGradient(x, y + h * 0.55, x, y + h);
    fade.addColorStop(0, 'rgba(6,9,15,0)');
    fade.addColorStop(1, 'rgba(6,9,15,0.55)');
    ctx.fillStyle = fade;
    ctx.fillRect(x, y + h * 0.55, w, h * 0.45);
    ctx.restore();

    strokeRound(ctx, x, y, w, h, 14, 'rgba(242,193,78,0.28)');
    text(ctx, this.case.id === 'case2' ? '第二案' : '第一案', x + 12, y + 22, {
      size: 9, color: 'rgba(245,241,232,0.72)'
    });
  }

  drawSynopsis(ctx) {
    const actions = this.actionRects();
    let top = this.heroBottom + 20;
    const cardH = Math.max(104, actions.solo.y - 30 - top);
    if (top + cardH > actions.solo.y - 22) {
      top = Math.max(this.heroBottom + 12, actions.solo.y - 22 - cardH);
    }

    fillRound(ctx, 24, top, W - 48, cardH, 14, 'rgba(245,241,232,0.045)');
    strokeRound(ctx, 24, top, W - 48, cardH, 14, 'rgba(245,241,232,0.09)');

    text(ctx, '案件简介', 40, top + 26, {
      size: 10, color: COLORS.amber, maxWidth: W - 80
    });

    const maxLines = Math.max(2, Math.min(7, Math.floor((cardH - 74) / 19)));
    wrapText(ctx, this.case.synopsis || '这个案子的卷宗还在整理中。', 40, top + 49, W - 80, 19, maxLines, {
      size: 12, color: 'rgba(245,241,232,0.78)'
    });

    const tags = (this.case.tags || ['本格推理', '群聊叙事', '多结局']).slice(0, 3);
    let tx = 40;
    const ty = top + cardH - 14;
    tags.forEach((label) => {
      const tw = 12 + label.length * 10;
      fillRound(ctx, tx, ty - 13, tw, 18, 9, 'rgba(242,193,78,0.1)');
      text(ctx, label, tx + 6, ty, { size: 9, color: 'rgba(242,193,78,0.9)' });
      tx += tw + 6;
    });
  }

  drawActions(ctx) {
    const rects = this.actionRects();
    const solo = rects.solo;
    fillRound(ctx, solo.x, solo.y, solo.w, solo.h, 14, COLORS.amber);
    text(ctx, '单人游戏', solo.x + solo.w / 2, solo.y + 26, {
      size: 16, color: '#12161F', align: 'center', weight: 700
    });
    text(ctx, '随机扮演一名邻居', solo.x + solo.w / 2, solo.y + 44, {
      size: 9, color: 'rgba(18,22,31,0.62)', align: 'center', maxWidth: solo.w - 16
    });

    const multi = rects.multi;
    fillRound(ctx, multi.x, multi.y, multi.w, multi.h, 14, 'rgba(242,193,78,0.08)');
    strokeRound(ctx, multi.x, multi.y, multi.w, multi.h, 14, 'rgba(242,193,78,0.62)');
    text(ctx, '多人游戏', multi.x + multi.w / 2, multi.y + 26, {
      size: 16, color: COLORS.amber, align: 'center', weight: 700
    });
    text(ctx, `${this.script.ROLES.length} 人组队 · 好友联机`, multi.x + multi.w / 2, multi.y + 44, {
      size: 9, color: 'rgba(242,193,78,0.66)', align: 'center', maxWidth: multi.w - 16
    });

    text(ctx, '单人可随时开始 · 多人需人满并全员准备', W / 2, solo.y - 12, {
      size: 9, color: 'rgba(138,147,163,0.75)', align: 'center', maxWidth: W - 48
    });
  }

  // ---------- 组队弹层 ----------
  drawModal(ctx) {
    ctx.fillStyle = 'rgba(5,8,14,0.84)';
    ctx.fillRect(0, 0, W, H);

    const p = this.panelRect();
    fillRound(ctx, p.x, p.y, p.w, p.h, 20, '#101827');
    strokeRound(ctx, p.x, p.y, p.w, p.h, 20, 'rgba(242,193,78,0.32)');

    const room = this.room || {};
    text(ctx, room.isHost ? '组队中 · 你是房主' : '组队中', p.x + 20, p.y + 34, {
      size: 19, color: COLORS.paper, weight: 700, maxWidth: p.w - 120
    });
    text(ctx, `房间号 ${this.roomId || '—'}`, p.x + p.w - 20, p.y + 33, {
      size: 10, color: COLORS.amber, align: 'right', maxWidth: 110
    });
    text(ctx, `${room.playerCount || 0} / ${room.maxSeats || this.script.ROLES.length} 人 · 点击空位邀请好友`, p.x + 20, p.y + 54, {
      size: 10, color: 'rgba(138,147,163,0.92)', maxWidth: p.w - 40
    });

    this.drawSeats(ctx);

    const buttons = this.footerButtons();
    const isHost = !!room.isHost;
    const full = (room.playerCount || 0) >= (room.maxSeats || 0);
    const allReady = full && (room.seats || []).every((seat) => !seat || seat.ready);

    let hint = '';
    if (isHost) {
      hint = allReady ? '全员已准备，可以开始' : (full ? '等待成员准备' : '邀请好友补满席位');
    } else {
      hint = room.myReady ? '已准备，等待房主开始' : '点击准备，等待房主开始';
    }
    if (this.netErr) hint = '网络不稳定，正在重连…';
    text(ctx, hint, p.x + p.w / 2, buttons.primary.y - 12, {
      size: 10, color: this.netErr ? '#E28B80' : 'rgba(138,147,163,0.9)',
      align: 'center', maxWidth: p.w - 40
    });

    if (isHost) {
      const enabled = full && allReady && !this.busy;
      if (enabled) {
        fillRound(ctx, buttons.primary.x, buttons.primary.y, buttons.primary.w, buttons.primary.h, 12, COLORS.amber);
        text(ctx, this.busy ? '正在开始…' : '开始游戏', W / 2, buttons.primary.y + 29, {
          size: 16, color: '#12161F', align: 'center', weight: 700
        });
      } else {
        fillRound(ctx, buttons.primary.x, buttons.primary.y, buttons.primary.w, buttons.primary.h, 12, 'rgba(245,241,232,0.09)');
        text(ctx, '开始游戏', W / 2, buttons.primary.y + 29, {
          size: 16, color: 'rgba(245,241,232,0.35)', align: 'center', weight: 600
        });
      }
    } else if (room.myReady) {
      fillRound(ctx, buttons.primary.x, buttons.primary.y, buttons.primary.w, buttons.primary.h, 12, 'rgba(127,179,127,0.2)');
      strokeRound(ctx, buttons.primary.x, buttons.primary.y, buttons.primary.w, buttons.primary.h, 12, 'rgba(127,179,127,0.7)');
      text(ctx, '已准备', W / 2, buttons.primary.y + 29, {
        size: 16, color: COLORS.green, align: 'center', weight: 700
      });
    } else {
      fillRound(ctx, buttons.primary.x, buttons.primary.y, buttons.primary.w, buttons.primary.h, 12, COLORS.amber);
      text(ctx, '准备', W / 2, buttons.primary.y + 29, {
        size: 16, color: '#12161F', align: 'center', weight: 700
      });
    }

    strokeRound(ctx, buttons.quit.x, buttons.quit.y, buttons.quit.w, buttons.quit.h, 11, 'rgba(245,241,232,0.24)');
    text(ctx, isHost ? '退出并解散队伍' : '退出房间', W / 2, buttons.quit.y + 24, {
      size: 12, color: 'rgba(245,241,232,0.66)', align: 'center'
    });
  }

  drawSeats(ctx) {
    const rects = this.seatLayout();
    const seats = (this.room && this.room.seats) || [];
    rects.forEach((rect, i) => {
      const seat = seats[i] || null;
      if (seat) {
        fillRound(ctx, rect.x, rect.y, rect.w, rect.h, 14, 'rgba(245,241,232,0.06)');
        strokeRound(ctx, rect.x, rect.y, rect.w, rect.h, 14, seat.ready ? 'rgba(127,179,127,0.45)' : 'rgba(245,241,232,0.12)');

        const cx = rect.x + rect.w / 2;
        const cy = rect.y + Math.min(36, rect.h * 0.34);
        drawAvatar(ctx, seat, cx, cy, Math.min(19, rect.h * 0.2), {
          ring: seat.host ? 'rgba(242,193,78,0.8)' : 'rgba(245,241,232,0.3)'
        });

        text(ctx, seat.nickName, cx, rect.y + rect.h - 25, {
          size: 12, color: COLORS.paper, align: 'center', weight: 500, maxWidth: rect.w - 16
        });
        text(ctx, seat.shortId || '', cx, rect.y + rect.h - 10, {
          size: 9, color: 'rgba(138,147,163,0.85)', align: 'center', maxWidth: rect.w - 16
        });

        if (seat.host) {
          fillRound(ctx, rect.x + 7, rect.y + 7, 30, 16, 8, 'rgba(242,193,78,0.9)');
          text(ctx, '房主', rect.x + 22, rect.y + 18, {
            size: 8, color: '#12161F', align: 'center', weight: 600
          });
        }
        if (seat.ready) {
          fillRound(ctx, rect.x + rect.w - 42, rect.y + 7, 35, 16, 8, 'rgba(127,179,127,0.22)');
          text(ctx, '已准备', rect.x + rect.w - 24.5, rect.y + 18, {
            size: 8, color: COLORS.green, align: 'center'
          });
        }
      } else {
        fillRound(ctx, rect.x, rect.y, rect.w, rect.h, 14, 'rgba(245,241,232,0.02)');
        ctx.save();
        ctx.strokeStyle = 'rgba(242,193,78,0.36)';
        ctx.lineWidth = 1.2;
        if (ctx.setLineDash) ctx.setLineDash([4, 4]);
        roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 14);
        ctx.stroke();
        ctx.restore();

        const cx = rect.x + rect.w / 2;
        const cy = rect.y + Math.min(36, rect.h * 0.36);
        ctx.save();
        ctx.strokeStyle = 'rgba(242,193,78,0.5)';
        ctx.lineWidth = 1.2;
        if (ctx.setLineDash) ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(cx, cy, Math.min(18, rect.h * 0.19), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        text(ctx, '+', cx, cy + 7, {
          size: 22, color: 'rgba(242,193,78,0.8)', align: 'center'
        });
        text(ctx, '邀请好友', cx, rect.y + rect.h - 16, {
          size: 9, color: 'rgba(245,241,232,0.45)', align: 'center', maxWidth: rect.w - 12
        });
      }
    });
  }

  drawToast(ctx) {
    const alpha = Math.min(1, this.toastT / 0.25);
    ctx.save();
    ctx.font = '12px "PingFang SC", sans-serif';
    const w = Math.min(W - 48, ctx.measureText(this.toast).width + 32);
    ctx.restore();
    const x = (W - w) / 2;
    const y = TOP + 66;
    fillRound(ctx, x, y, w, 36, 18, `rgba(12,18,28,${0.96 * alpha})`);
    strokeRound(ctx, x, y, w, 36, 18, `rgba(242,193,78,${0.4 * alpha})`);
    text(ctx, this.toast, W / 2, y + 23, {
      size: 12, color: `rgba(245,241,232,${alpha})`, align: 'center', maxWidth: w - 24
    });
  }
}
