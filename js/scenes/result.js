import { W, H, TOP } from '../core/screen.js';
import {
  COLORS, drawBackdrop, text, wrapText, fillRound, strokeRound, measureLines
} from '../ui/theme.js';
import { playTap } from '../core/audio.js';
import { getScript, SCRIPTS } from '../data/scripts.js';
import { recordGame, loadStats, loadCaseStats } from '../core/storage.js';
import { roomApi } from '../core/cloud.js';
import { adsAvailable, showRewarded } from '../core/ads.js';
import { ScrollView } from '../ui/widgets.js';

const TOTAL_ENDINGS = SCRIPTS.reduce((sum, script) => sum + Object.keys(script.ENDINGS).length, 0);

export default class Result {
  constructor(app, params) {
    this.app = app;
    this.params = params || {};
    this.caseId = this.params.caseId || 'case1';
    this.keySpot = this.params.keySpot || '';
    this.script = getScript(this.caseId, this.keySpot);
    this.time = 0;
    this.page = 0;

    const questions = this.script.QUESTIONS;
    const answers = this.params.answers || [];
    this.q1 = answers[0];
    this.q2 = answers[1];
    this.q3 = answers[2] || questions[2].options[0].id;
    // 本局的关键说谎者由开局随机决定，不再固定为剧本默认值
    this.keyLiar = this.params.keyLiar || questions[1].answer;
    this.q1Correct = this.q1 === questions[0].answer;
    this.q2Correct = this.q2 === this.keyLiar;

    const hiddenCfg = this.script.HIDDEN;
    const handIds = this.params.handIds || [];
    const cluesOk = !hiddenCfg || hiddenCfg.clues.some((id) => handIds.indexOf(id) !== -1);
    this.hidden = !!hiddenCfg && this.q3 === hiddenCfg.q3
      && (!hiddenCfg.requireQ1 || this.q1Correct)
      && (!hiddenCfg.requireQ2 || this.q2Correct)
      && cluesOk;

    // 没找到人时，帮她/报警都会走向失败分支：人物可能活不下来
    const fateId = `${this.q3}${this.q1Correct ? '' : '_fail'}`;
    const endingId = this.hidden ? 'hidden' : (this.script.ENDINGS[fateId] ? fateId : this.q3);
    this.ending = this.script.ENDINGS[endingId]
      || this.script.ENDINGS.help
      || Object.values(this.script.ENDINGS)[0];

    // 真相里追加本局的关键谎言，保证不同局的答案不一样
    this.truth = this.script.TRUTH.slice();
    const lieNote = this.script.LIE_NOTE && this.script.LIE_NOTE[this.keyLiar];
    if (lieNote) this.truth.push(lieNote);

    this.truthUnlocked = false;
    this.adBusy = false;
    this.adHint = '';

    this.stats = recordGame(this.caseId, this.ending.id, this.params.clueCount || 0);
    this.allStats = loadStats();
    this.caseStats = loadCaseStats(this.caseId);

    this.truthView = new ScrollView({
      x: 0,
      y: TOP + 64,
      w: W,
      h: Math.max(80, H - 112 - (TOP + 64))
    });
    this.secretView = new ScrollView({
      x: 0,
      y: TOP + 64,
      w: W,
      h: Math.max(80, H - 136 - (TOP + 64))
    });
    this.truthView.stickBottom = false;
    this.secretView.stickBottom = false;
  }

  enter() {
    try {
      wx.showShareMenu({ withShareTicket: true });
    } catch (e) {
      // 忽略
    }
  }

  update(dt) {
    this.time += dt;
    this.truthView.update(dt);
    this.secretView.update(dt);
  }

  move(x, y) {
    const view = this.page === 1 ? this.truthView : (this.page === 2 ? this.secretView : null);
    if (!view) return;
    if (view.dragging) view.move(y);
    else view.start(x, y);
  }

  end() {
    this.truthView.end();
    this.secretView.end();
  }

  nextRect() {
    return this.primaryRect();
  }

  primaryRect() {
    const total = W - 48;
    const w = this.page < 2 ? Math.round(total * 0.66) : Math.floor((total - 16) / 3);
    return { x: 24, y: H - 88, w, h: 48 };
  }

  libraryRect() {
    const total = W - 48;
    if (this.page < 2) {
      const pw = Math.round(total * 0.66);
      return { x: 24 + pw + 8, y: H - 88, w: total - pw - 8, h: 48 };
    }
    const w = Math.floor((total - 16) / 3);
    return { x: 24 + w + 8, y: H - 88, w, h: 48 };
  }

  replayRect() {
    return this.primaryRect();
  }

  shareRect() {
    const total = W - 48;
    const w = Math.floor((total - 16) / 3);
    return { x: 24 + (w + 8) * 2, y: H - 88, w: total - (w + 8) * 2, h: 48 };
  }

  hit(rect, x, y) {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  tap(x, y) {
    const library = this.libraryRect();
    if (this.hit(library, x, y)) {
      playTap();
      this.exitRoom();
      this.app.go('catalog');
      return;
    }

    if (this.page < 2) {
      const r = this.nextRect();
      if (this.hit(r, x, y)) {
        playTap();
        if (this.page === 0) {
          this.unlockTruth();
        } else {
          this.page = 2;
          this.secretView.offset = 0;
          this.secretView.velocity = 0;
        }
      }
      return;
    }

    const replay = this.replayRect();
    if (this.hit(replay, x, y)) {
      playTap();
      this.exitRoom();
      if (this.params.mode === 'online') {
        this.app.go('detail', { caseId: this.caseId });
      } else {
        this.app.go('role', { caseId: this.caseId });
      }
      return;
    }
    const share = this.shareRect();
    if (this.hit(share, x, y)) {
      playTap();
      this.share();
    }
  }

  // 真相用激励视频解锁；未配置广告位时直接放行，避免开发环境卡死
  unlockTruth() {
    if (this.truthUnlocked || this.adBusy) return;
    if (!adsAvailable()) {
      this.truthUnlocked = true;
      this.toTruthPage();
      return;
    }
    this.adBusy = true;
    this.adHint = '';
    showRewarded().then((done) => {
      this.adBusy = false;
      if (done) {
        this.truthUnlocked = true;
        this.toTruthPage();
      } else {
        this.adHint = '广告没有看完，暂时无法查看真相';
      }
    });
  }

  toTruthPage() {
    this.page = 1;
    this.truthView.offset = 0;
    this.truthView.velocity = 0;
  }

  exitRoom() {
    if (this.params.mode !== 'online' || !this.params.roomId) return;
    roomApi.leave(this.params.roomId);
  }

  share() {
    try {
      wx.shareAppMessage({
        title: `我在《我们群里少了一个人》里打出了「${this.ending.title}」`
      });
    } catch (e) {
      // 忽略分享失败
    }
  }

  render(ctx) {
    drawBackdrop(ctx, this.time, 0.7);
    if (this.page === 0) this.renderEnding(ctx);
    else if (this.page === 1) this.renderTruth(ctx);
    else this.renderSecrets(ctx);
  }

  drawLibraryButton(ctx) {
    const r = this.libraryRect();
    strokeRound(ctx, r.x, r.y, r.w, r.h, 12, 'rgba(245,241,232,0.4)');
    text(ctx, '返回剧本库', r.x + r.w / 2, r.y + 30, {
      size: 13, color: COLORS.paper, align: 'center', maxWidth: r.w - 8
    });
  }

  renderEnding(ctx) {
    const score = (this.q1Correct ? 1 : 0) + (this.q2Correct ? 1 : 0);

    text(ctx, `结算 · 第 ${this.stats.plays} 次调查`, 24, TOP + 30, {
      size: 11, color: COLORS.gray, maxWidth: W * 0.55
    });
    text(ctx, `${this.allStats.endings.length} / ${TOTAL_ENDINGS} 结局`, W - 24, TOP + 30, {
      size: 11, color: COLORS.amber, align: 'right', maxWidth: W * 0.35
    });

    wrapText(ctx, this.ending.title, 24, TOP + 84, W - 48, 30, 2, {
      size: 23, color: COLORS.amber, weight: 700
    });

    text(ctx, `情绪：${this.ending.mood}`, 24, TOP + 152, {
      size: 11, color: 'rgba(245,241,232,0.55)', maxWidth: W - 48
    });

    wrapText(ctx, this.ending.text, 24, TOP + 182, W - 48, 22, H < 620 ? 4 : 6, {
      size: 13, color: 'rgba(245,241,232,0.85)'
    });

    const cardY = Math.min(H - 199, Math.max(H * 0.62, TOP + 330));
    fillRound(ctx, 24, cardY, W - 48, 96, 14, 'rgba(245,241,232,0.05)');
    strokeRound(ctx, 24, cardY, W - 48, 96, 14, 'rgba(245,241,232,0.1)');
    const cols = [
      { value: `${score}/2`, label: '推理得分' },
      { value: `${this.params.clueCount || 0}`, label: '掌握线索' },
      { value: `${this.caseStats.endings.length}/${Object.keys(this.script.ENDINGS).length}`, label: '收集结局' }
    ];
    cols.forEach((col, i) => {
      const cx = 24 + (W - 48) * (i + 0.5) / 3;
      const cw = (W - 48) / 3 - 12;
      text(ctx, col.value, cx, cardY + 44, {
        size: 20, color: COLORS.paper, align: 'center', weight: 600, maxWidth: cw
      });
      text(ctx, col.label, cx, cardY + 68, {
        size: 10, color: COLORS.gray, align: 'center', maxWidth: cw
      });
    });

    if (this.hidden) {
      text(ctx, '你解锁了隐藏结局。', W / 2, cardY + 88, {
        size: 11, color: COLORS.amber, align: 'center', maxWidth: W - 72
      });
    }

    const r = this.nextRect();
    fillRound(ctx, r.x, r.y, r.w, r.h, 12, COLORS.amber);
    const label = this.adBusy ? '广告加载中…' : (this.truthUnlocked ? '查看真相' : '查看真相');
    text(ctx, label, r.x + r.w / 2, r.y + 30, {
      size: 15, color: '#12161F', align: 'center', weight: 600, maxWidth: r.w - 20
    });
    if (this.adHint) {
      text(ctx, this.adHint, W / 2, r.y - 12, {
        size: 10, color: '#E28B80', align: 'center', maxWidth: W - 48
      });
    }
    this.drawLibraryButton(ctx);
  }

  renderTruth(ctx) {
    text(ctx, '真相', 24, TOP + 34, { size: 22, color: COLORS.paper, weight: 700, maxWidth: W * 0.4 });
    text(ctx, '剧透警告 · 你已经完成本局', W - 24, TOP + 34, {
      size: 10, color: COLORS.gray, align: 'right', maxWidth: W * 0.55
    });

    const view = this.truthView;
    const lh = H < 700 ? 19 : 21;
    const gap = H < 700 ? 10 : 16;
    ctx.save();
    ctx.font = '13px "PingFang SC", sans-serif';
    const paragraphs = this.truth;
    const counts = paragraphs.map((paragraph) => measureLines(ctx, paragraph, W - 76));
    ctx.restore();

    let contentH = 18;
    counts.forEach((n) => { contentH += n * lh + gap; });
    view.setContent(contentH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(view.x, view.y, view.w, view.h);
    ctx.clip();
    let y = view.y + 14 - view.offset;
    paragraphs.forEach((paragraph, i) => {
      text(ctx, `0${i + 1}`, 24, y, { size: 11, color: COLORS.amber });
      wrapText(ctx, paragraph, 52, y, W - 76, lh, 5, {
        size: 13, color: 'rgba(245,241,232,0.85)'
      });
      y += counts[i] * lh + gap;
    });
    ctx.restore();
    view.drawBar(ctx);

    text(ctx, `你的判断：${this.q1Correct ? '位置正确' : '位置判断错误'} · ${this.q2Correct ? '识破了说谎者' : '被谎言带偏了'}`, 24, H - 100, {
      size: 11,
      color: this.q1Correct && this.q2Correct ? COLORS.green : COLORS.gray,
      maxWidth: W - 48
    });

    const r = this.nextRect();
    fillRound(ctx, r.x, r.y, r.w, r.h, 12, COLORS.amber);
    text(ctx, '查看所有人的秘密', r.x + r.w / 2, r.y + 30, {
      size: 15, color: '#12161F', align: 'center', weight: 600
    });
    this.drawLibraryButton(ctx);
  }

  renderSecrets(ctx) {
    text(ctx, `${this.script.ROLES.length} 个人的秘密`, 24, TOP + 34, {
      size: 22, color: COLORS.paper, weight: 700, maxWidth: W - 48
    });
    text(ctx, '今晚没有一个人是干净的。', 24, TOP + 58, {
      size: 11, color: COLORS.gray, maxWidth: W - 48
    });

    const view = this.secretView;
    const lh = H < 700 ? 16 : 19;
    const gap = H < 700 ? 8 : 14;
    const header = H < 700 ? 20 : 24;
    ctx.save();
    ctx.font = '12px "PingFang SC", sans-serif';
    const roles = this.script.ROLES;
    const counts = roles.map((role) => measureLines(ctx, role.secret, W - 76));
    ctx.restore();

    let contentH = 16;
    counts.forEach((n) => { contentH += header + n * lh + gap; });
    view.setContent(contentH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(view.x, view.y, view.w, view.h);
    ctx.clip();
    let y = view.y + 12 - view.offset;
    roles.forEach((role, i) => {
      text(ctx, role.name, 24, y, { size: 13, color: role.color, weight: 600 });
      text(ctx, role.job, 24 + 52, y, {
        size: 10, color: COLORS.gray, maxWidth: W - 130
      });
      wrapText(ctx, role.secret, 52, y + header, W - 76, lh, 3, {
        size: 12, color: 'rgba(245,241,232,0.78)'
      });
      y += header + counts[i] * lh + gap;
    });
    ctx.restore();
    view.drawBar(ctx);

    const good = this.ending.id === 'help' || this.ending.id === 'hidden';
    const bad = this.ending.id === 'property' || this.ending.id === 'silence'
      || /_fail$/.test(this.ending.id);
    text(ctx, this.ending.footer || this.ending.title, 24, H - 118, {
      size: 11,
      color: good ? COLORS.green : (bad ? '#E28B80' : COLORS.gray),
      maxWidth: W - 48
    });

    const replay = this.replayRect();
    fillRound(ctx, replay.x, replay.y, replay.w, replay.h, 12, COLORS.amber);
    text(ctx, '再玩一次', replay.x + replay.w / 2, replay.y + 30, {
      size: 15, color: '#12161F', align: 'center', weight: 600
    });

    const share = this.shareRect();
    strokeRound(ctx, share.x, share.y, share.w, share.h, 12, 'rgba(245,241,232,0.4)');
    text(ctx, '分享战报', share.x + share.w / 2, share.y + 30, {
      size: 13, color: COLORS.paper, align: 'center', maxWidth: share.w - 8
    });
    this.drawLibraryButton(ctx);
  }
}
