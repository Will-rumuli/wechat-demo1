import { W, H, TOP, BOTTOM } from '../core/screen.js';
import {
  COLORS, drawBackdrop, text, wrapText, fillRound, strokeRound,
  measureLines, roundRect
} from '../ui/theme.js';
import { Button, ScrollView } from '../ui/widgets.js';
import { unlock, playTap, toggleMute, isMuted } from '../core/audio.js';
import { loadStats } from '../core/storage.js';
import { loadUser, localLogin, logout } from '../core/user.js';
import { drawAvatar } from '../core/avatar.js';
import { SCRIPTS } from '../data/scripts.js';

const PAD = 24;
const GAP = 12;

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

// 标题折行：把成对的引号/括号当成整体，避免引号被拆到两行
function titleTokens(str) {
  const tokens = [];
  for (const ch of String(str)) {
    const last = tokens[tokens.length - 1];
    if ('）】》”’。，！？、；：'.indexOf(ch) !== -1 && last) {
      tokens[tokens.length - 1] = last + ch;
    } else if (last && '（【《“‘'.indexOf(last.slice(-1)) !== -1) {
      tokens[tokens.length - 1] = last + ch;
    } else {
      tokens.push(ch);
    }
  }
  return tokens;
}

function titleWidth(str, size) {
  let total = 0;
  for (const ch of String(str)) {
    total += ch.codePointAt(0) > 0x2e80 ? size : size * 0.56;
  }
  return total;
}

function splitTitle(str, maxWidth, size) {
  const lines = [];
  let line = '';
  titleTokens(str).forEach((token) => {
    if (line && titleWidth(line + token, size) > maxWidth) {
      lines.push(line);
      line = token;
    } else {
      line += token;
    }
  });
  if (line) lines.push(line);
  if (lines.length > 2) {
    const rest = lines.slice(1).join('');
    let second = '';
    for (const ch of rest) {
      if (titleWidth(`${second}${ch}…`, size) > maxWidth) break;
      second += ch;
    }
    return [lines[0], `${second}…`];
  }
  return lines;
}

export default class Catalog {
  constructor(app) {
    this.app = app;
    this.time = 0;
    this.compact = H < 640;
    this.stats = loadStats();
    // 静默登录可能还在路上，这里兜底一个本机账号，避免头像空白
    this.user = loadUser() || localLogin();
    this.help = false;
    this.toast = '';
    this.toastT = 0;
    this.touch = null;
    this.moved = 0;

    // 顶部右侧布局：避开微信胶囊按钮，图标与头像保持同一水平线
    let menu = null;
    try {
      if (wx.getMenuButtonBoundingClientRect) {
        const rect = wx.getMenuButtonBoundingClientRect();
        if (rect && rect.width > 0 && rect.height > 0) menu = rect;
      }
    } catch (e) {
      menu = null;
    }
    // 以胶囊按钮为基准计算安全顶边：部分机型 safeArea.top 为 0，会导致标题被刘海裁掉
    const hTop = Math.max(TOP, menu ? menu.top : 0);
    this.hTop = hTop;
    const capBottom = menu ? menu.top + menu.height : hTop + 38;
    // 保持原来靠右的位置，只把三者压到同一条水平线，并整体落在胶囊下方
    const cy = Math.round(capBottom + 20);
    const avatarX = W - 38;
    const muteX = W - 82;
    const helpX = W - 116;
    this.header = { cy, avatarX, muteX, helpX, iconR: 13, avatarR: 13, menu };
    this.textW = Math.min(W - PAD * 2, helpX - 16 - PAD);

    const cardW = Math.floor((W - PAD * 2 - GAP) / 2);
    this.cardW = cardW;

    const defs = SCRIPTS.map((script) => {
      const rounds = script.ACTS.reduce((sum, act) => sum + act.rounds, 0);
      return {
        id: script.CASE.id,
        seed: script.CASE.seed,
        title: script.CASE.title,
        open: script.CASE.open,
        ratio: script.CASE.ratio,
        meta: [
          `${script.ROLES.length} 人 · ${script.ACTS.length} 幕 ${rounds} 轮`,
          `${Object.keys(script.CLUES).length} 张线索`,
          `多结局 · ${script.CASE.duration}`
        ]
      };
    });
    defs.push(
      {
        seed: 3,
        title: '未命名',
        ratio: 0.68,
        meta: ['剧本筹备中', '敬请期待']
      },
      {
        seed: 4,
        title: '未命名',
        ratio: 0.9,
        meta: ['剧本筹备中', '敬请期待']
      }
    );

    // 两列瀑布流：每张卡放进当前较矮的一列
    this.cards = [];
    const colY = [0, 0];
    defs.forEach((def) => {
      const col = colY[0] <= colY[1] ? 0 : 1;
      const x = PAD + col * (cardW + GAP);
      const coverH = Math.round(cardW * def.ratio);
      const titleRows = splitTitle(def.title, cardW - 24, 15);
      const cardH = coverH + 50 + (titleRows.length - 1) * 18 + def.meta.length * 14;
      this.cards.push({ ...def, titleRows, x, y: colY[col], w: cardW, h: cardH, coverH });
      colY[col] += cardH + GAP;
    });
    this.contentH = Math.max(colY[0], colY[1]) + 36;

    // 顶部控件下移后，列表起点也要跟着让出位置，避免压住头像 ID
    const listTop = Math.max(this.hTop + (this.compact ? 88 : 96), cy + 40);
    this.listTop = listTop;
    this.view = new ScrollView({
      x: 0,
      y: listTop,
      w: W,
      h: Math.max(80, H - listTop - BOTTOM - 10)
    });
    this.view.stickBottom = false;

    this.rules = [
      '1. 你随机扮演邻居之一，只有你能看到自己的秘密。',
      '2. 每一轮选择一个地点调查，线索只进入你的手牌。',
      '3. 你可以把手牌公开到群聊，也可以选择隐瞒。',
      '4. 在每一幕结束前，尽可能找齐指向真相的线索。',
      '5. 最后投票：人在哪、谁在撒谎、你们怎么做。'
    ];

    // 头像菜单：退出登录
    this.account = false;
    const panelW = W - 56;
    const panelH = 274;
    const panelY = Math.round(Math.max(TOP + 8, (H - panelH) / 2));
    this.accountRect = { x: 28, y: panelY, w: panelW, h: panelH };
    const bx = 52;
    const bw = W - 104;
    this.logoutBtn = new Button({
      x: bx, y: panelY + 154, w: bw, h: 48,
      label: '退出登录',
      kind: 'danger',
      onTap: () => this.doLogout('已退出当前账号，下次进入需重新登录')
    });
    this.cancelBtn = new Button({
      x: bx, y: panelY + 214, w: bw, h: 44,
      label: '取消',
      kind: 'ghost',
      onTap: () => { this.account = false; }
    });

    // 弹窗尺寸按正文实际行数计算，避免固定比例下最后一条规则被裁掉
    this.helpLayout = false;
    this.helpCounts = [];
    this.helpRect = { x: 28, y: H * 0.16, w: W - 56, h: H * 0.58 };
    this.helpView = new ScrollView({
      x: 36,
      y: H * 0.16 + 62,
      w: W - 72,
      h: Math.max(60, H * 0.58 - 156)
    });
    this.helpView.stickBottom = false;
    this.closeHelp = new Button({
      x: W / 2 - 70,
      y: H * 0.16 + H * 0.58 - 60,
      w: 140,
      h: 44,
      label: '知道了',
      kind: 'ghost',
      onTap: () => { this.help = false; }
    });
  }

  layoutHelp(ctx) {
    if (this.helpLayout) return;
    const modalW = W - 56;
    const textW = modalW - 48;
    ctx.save();
    ctx.font = '13px "PingFang SC", sans-serif';
    this.helpCounts = this.rules.map((line) => measureLines(ctx, line, textW));
    ctx.restore();

    // 顶部留白要盖住首行汉字在基线上方的高度，否则会被裁剪区切掉上半截
    let bodyH = 20;
    this.helpCounts.forEach((n) => { bodyH += n * 19 + 10; });
    bodyH += 12;

    const capH = H - TOP - BOTTOM - 32;
    const modalH = Math.round(Math.min(bodyH + 164, capH));
    const modalY = Math.round(Math.max(TOP + 8, (H - modalH) / 2));

    this.helpRect = { x: 28, y: modalY, w: modalW, h: modalH };
    this.helpView = new ScrollView({
      x: 36,
      y: modalY + 62,
      w: modalW - 16,
      h: Math.max(60, modalH - 156)
    });
    this.helpView.stickBottom = false;
    this.closeHelp = new Button({
      x: W / 2 - 70,
      y: modalY + modalH - 60,
      w: 140,
      h: 44,
      label: '知道了',
      kind: 'ghost',
      onTap: () => { this.help = false; }
    });
    this.helpLayout = true;
  }

  update(dt) {
    this.time += dt;
    this.view.update(dt);
    this.helpView.update(dt);
    this.logoutBtn.update(dt);
    this.cancelBtn.update(dt);
    if (this.toastT > 0) this.toastT = Math.max(0, this.toastT - dt);
  }

  doLogout(toast) {
    playTap();
    this.account = false;
    logout();
    this.app.go('login', { toast });
  }

  tap(x, y) {
    unlock();

    if (this.account) {
      if (this.logoutBtn.tap(x, y)) return;
      if (this.cancelBtn.tap(x, y)) return;
      const r = this.accountRect;
      const outside = x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h;
      if (outside) this.account = false;
      return;
    }

    const h = this.header;
    if (Math.abs(y - h.cy) <= 20) {
      if (Math.abs(x - h.avatarX) <= 18) {
        playTap();
        this.account = true;
        return;
      }
      if (Math.abs(x - h.muteX) <= 18) {
        toggleMute();
        return;
      }
      if (Math.abs(x - h.helpX) <= 18) {
        this.help = !this.help;
        if (this.help) {
          this.helpView.offset = 0;
          this.helpView.velocity = 0;
          this.view.velocity = 0;
        }
        return;
      }
    }

    if (this.help) {
      if (this.closeHelp.tap(x, y)) return;
      const r = this.helpRect;
      const outside = x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h;
      if (outside) this.help = false;
      return;
    }

    this.touch = { x, y };
    this.moved = 0;
    this.view.start(x, y);
  }

  move(x, y) {
    if (this.account) return;
    if (this.help) {
      if (this.helpView.dragging) this.helpView.move(y);
      else this.helpView.start(x, y);
      return;
    }
    if (!this.touch) return;
    this.moved = Math.max(this.moved, Math.abs(y - this.touch.y));
    this.view.move(y);
  }

  end() {
    if (this.account) return;
    if (this.help) {
      this.helpView.end();
      return;
    }
    this.view.end();
    const t = this.touch;
    this.touch = null;
    if (!t || this.moved > 8) return;
    const card = this.cardAt(t.x, t.y);
    if (card) this.openCard(card);
  }

  cardAt(x, y) {
    const top = this.view.y - this.view.offset;
    for (let i = 0; i < this.cards.length; i += 1) {
      const card = this.cards[i];
      const sy = top + card.y;
      if (x >= card.x && x <= card.x + card.w && y >= sy && y <= sy + card.h) {
        return card;
      }
    }
    return null;
  }

  openCard(card) {
    playTap();
    if (card.open && card.id) {
      this.app.go('detail', { caseId: card.id });
      return;
    }
    this.toast = '该剧本正在开发中，敬请期待';
    this.toastT = 1.8;
  }

  render(ctx) {
    drawBackdrop(ctx, this.time, 0.78);

    const headerH = this.listTop + 8;
    const hg = ctx.createLinearGradient(0, 0, 0, headerH);
    hg.addColorStop(0, 'rgba(6,10,17,0.92)');
    hg.addColorStop(1, 'rgba(6,10,17,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, W, headerH);

    this.drawHeader(ctx);
    this.drawList(ctx);

    if (this.toastT > 0) this.drawToast(ctx);
    if (this.help) this.drawHelp(ctx);
    if (this.account) this.drawAccount(ctx);
  }

  drawAccount(ctx) {
    const r = this.accountRect;
    ctx.fillStyle = 'rgba(5,8,14,0.82)';
    ctx.fillRect(0, 0, W, H);
    fillRound(ctx, r.x, r.y, r.w, r.h, 16, 'rgba(16,23,36,0.98)');
    strokeRound(ctx, r.x, r.y, r.w, r.h, 16, 'rgba(245,241,232,0.16)');

    const user = this.user || {};
    drawAvatar(ctx, user, W / 2, r.y + 62, 24);
    text(ctx, user.nickName || '未登录', W / 2, r.y + 112, {
      size: 18, color: COLORS.paper, align: 'center', weight: 600, maxWidth: r.w - 64
    });
    text(ctx, `${user.shortId || '--'} · ${user.local ? '本机登录' : '微信登录'}`, W / 2, r.y + 132, {
      size: 10, color: COLORS.gray, align: 'center', maxWidth: r.w - 64
    });

    this.logoutBtn.draw(ctx, this.time);
    this.cancelBtn.draw(ctx, this.time);
  }

  drawHeader(ctx) {
    const compact = this.compact;
    const textW = this.textW;
    const top = this.hTop;
    text(ctx, '我们群里少了一个人', PAD, top + 16, {
      size: 10, color: COLORS.amber, maxWidth: textW
    });
    text(ctx, '剧本库', PAD, top + (compact ? 44 : 50), {
      size: compact ? 24 : 28, color: COLORS.paper, weight: 700, maxWidth: textW
    });

    const unlocked = this.stats.endings.length;
    text(ctx, unlocked > 0 ? `已解锁 ${unlocked} 个结局` : '还没有解锁结局', PAD, top + (compact ? 64 : 70), {
      size: 10, color: COLORS.gray, maxWidth: textW
    });

    this.drawTopButtons(ctx);
  }

  drawTopButtons(ctx) {
    const { cy, avatarX, muteX, helpX, iconR, avatarR } = this.header;

    this.drawRoundIcon(ctx, helpX, cy, iconR, '?', 'rgba(245,241,232,0.76)');
    this.drawRoundIcon(
      ctx, muteX, cy, iconR, isMuted() ? '×' : '♪',
      isMuted() ? COLORS.gray : 'rgba(245,241,232,0.9)'
    );

    drawAvatar(ctx, this.user || {}, avatarX, cy, avatarR);
    if (this.user) {
      text(ctx, this.user.shortId, avatarX, cy + avatarR + 10, {
        size: 9, color: 'rgba(138,147,163,0.9)', align: 'center', maxWidth: 72
      });
    }
  }

  drawRoundIcon(ctx, x, cy, r, glyph, color) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(9,14,23,0.6)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(245,241,232,0.24)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    text(ctx, glyph, x, cy + 4, {
      size: 12, color, align: 'center'
    });
  }

  drawList(ctx) {
    const view = this.view;
    view.setContent(this.contentH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, view.y, W, view.h);
    ctx.clip();

    const top = view.y - view.offset;
    this.cards.forEach((card) => this.drawCard(ctx, card, top + card.y));

    text(ctx, '更多案件正在制作中', W / 2, top + this.contentH - 18, {
      size: 10, color: 'rgba(138,147,163,0.55)', align: 'center', maxWidth: W - 48
    });
    ctx.restore();
    view.drawBar(ctx);
  }

  drawCard(ctx, card, sy) {
    const { x, w, h, coverH, open } = card;

    fillRound(ctx, x, sy, w, h, 14, '#111A27');
    this.drawCover(ctx, card, sy);

    const label = open ? '可调查' : '开发中';
    ctx.save();
    ctx.font = '500 9px "PingFang SC", sans-serif';
    const badgeW = ctx.measureText(label).width + 14;
    ctx.restore();
    fillRound(ctx, x + 10, sy + 10, badgeW, 18, 9, open ? COLORS.amber : 'rgba(8,11,18,0.78)');
    text(ctx, label, x + 10 + badgeW / 2, sy + 23, {
      size: 9,
      color: open ? '#12161F' : 'rgba(245,241,232,0.68)',
      align: 'center',
      weight: 500
    });

    const titleTop = sy + coverH + 30;
    card.titleRows.forEach((line, i) => {
      text(ctx, line, x + 12, titleTop + i * 18, {
        size: 15,
        color: open ? COLORS.paper : 'rgba(245,241,232,0.45)',
        weight: 600,
        maxWidth: w - 24
      });
    });

    const metaTop = sy + coverH + 52 + (card.titleRows.length - 1) * 18;
    card.meta.forEach((line, i) => {
      text(ctx, line, x + 12, metaTop + i * 14, {
        size: 10,
        color: open ? 'rgba(245,241,232,0.62)' : 'rgba(245,241,232,0.3)',
        maxWidth: w - 24
      });
    });

    strokeRound(ctx, x, sy, w, h, 14, open ? 'rgba(242,193,78,0.28)' : 'rgba(245,241,232,0.07)');
  }

  drawCover(ctx, card, sy) {
    const { x, w, h, coverH, seed, open } = card;
    const pal = COVER_PALETTES[(seed - 1) % COVER_PALETTES.length];

    ctx.save();
    roundRect(ctx, x, sy, w, h, 14);
    ctx.clip();

    const sky = ctx.createLinearGradient(x, sy, x, sy + coverH);
    sky.addColorStop(0, pal[0]);
    sky.addColorStop(0.6, pal[1]);
    sky.addColorStop(1, pal[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(x, sy, w, coverH);

    const rnd = seeded(1200 + seed * 97);
    const count = 4;
    let mark = null;
    for (let i = 0; i < count; i += 1) {
      const bw = w * (0.26 + rnd() * 0.16);
      const bh = coverH * (0.38 + rnd() * 0.34);
      const bx = x + (i * w) / count - w * 0.04;
      const by = sy + coverH - bh;
      ctx.fillStyle = 'rgba(6,10,17,0.92)';
      ctx.fillRect(bx, by, bw, bh);

      for (let r = 0; r < 3; r += 1) {
        for (let c = 0; c < 2; c += 1) {
          const ww = bw * 0.18;
          const wh = bh * 0.1;
          const wx = bx + bw * 0.2 + c * bw * 0.34;
          const wy = by + bh * 0.18 + r * bh * 0.25;
          const lit = rnd() > 0.52;
          ctx.fillStyle = lit
            ? `rgba(242,193,78,${0.22 + rnd() * 0.4})`
            : 'rgba(255,255,255,0.035)';
          ctx.fillRect(wx, wy, ww, wh);
          if (open && i === 2 && r === 1 && c === 0) mark = { wx, wy, ww, wh };
        }
      }
    }

    if (mark) {
      ctx.fillStyle = 'rgba(242,193,78,0.95)';
      ctx.fillRect(mark.wx, mark.wy, mark.ww, mark.wh);
      ctx.strokeStyle = 'rgba(192,57,43,0.9)';
      ctx.lineWidth = 1;
      ctx.strokeRect(mark.wx - 2, mark.wy - 2, mark.ww + 4, mark.wh + 4);
    }

    if (open) {
      ctx.strokeStyle = 'rgba(180,205,230,0.18)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 16; i += 1) {
        const rx = x + ((i * 37 + this.time * 26) % w);
        const ry = sy + ((i * 53 + this.time * 150) % coverH);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 1.5, ry + 5 + (i % 4) * 2);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = 'rgba(5,8,14,0.42)';
      ctx.fillRect(x, sy, w, coverH);
    }

    const fade = ctx.createLinearGradient(x, sy + coverH * 0.55, x, sy + coverH);
    fade.addColorStop(0, 'rgba(6,9,15,0)');
    fade.addColorStop(1, 'rgba(6,9,15,0.55)');
    ctx.fillStyle = fade;
    ctx.fillRect(x, sy + coverH * 0.55, w, coverH * 0.45);

    ctx.restore();
  }

  drawToast(ctx) {
    const alpha = Math.min(1, this.toastT / 0.25);
    ctx.save();
    ctx.font = '12px "PingFang SC", sans-serif';
    const w = Math.min(W - 48, ctx.measureText(this.toast).width + 32);
    ctx.restore();
    const x = (W - w) / 2;
    const y = H - BOTTOM - 58;
    fillRound(ctx, x, y, w, 36, 18, `rgba(12,18,28,${0.94 * alpha})`);
    strokeRound(ctx, x, y, w, 36, 18, `rgba(245,241,232,${0.16 * alpha})`);
    text(ctx, this.toast, W / 2, y + 23, {
      size: 12,
      color: `rgba(245,241,232,${alpha})`,
      align: 'center',
      maxWidth: w - 24
    });
  }

  drawHelp(ctx) {
    this.layoutHelp(ctx);
    ctx.fillStyle = 'rgba(5,8,14,0.82)';
    ctx.fillRect(0, 0, W, H);

    const { x, y, w, h } = this.helpRect;
    fillRound(ctx, x, y, w, h, 18, '#121A28');
    strokeRound(ctx, x, y, w, h, 18, 'rgba(242,193,78,0.35)');

    text(ctx, '怎么玩', x + 24, y + 44, { size: 22, color: COLORS.paper, weight: 700 });

    const view = this.helpView;
    const textW = w - 48;
    const counts = this.helpCounts;

    let contentH = 20;
    counts.forEach((n) => { contentH += n * 19 + 10; });
    contentH += 12;
    view.setContent(contentH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(view.x, view.y, view.w, view.h);
    ctx.clip();
    let ry = view.y + 20 - view.offset;
    this.rules.forEach((line, i) => {
      wrapText(ctx, line, x + 24, ry, textW, 19, 3, {
        size: 13, color: 'rgba(245,241,232,0.78)'
      });
      ry += counts[i] * 19 + 10;
    });
    ctx.restore();
    view.drawBar(ctx);

    // 结语固定在滚区下方，避免内容超长时被裁掉
    text(ctx, '没有标准答案，只有你们的选择。', x + 24, y + h - 78, {
      size: 12, color: COLORS.amber, maxWidth: textW
    });

    this.closeHelp.draw(ctx, this.time);
  }
}
