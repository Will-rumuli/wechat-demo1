import { W, H, TOP } from '../core/screen.js';
import {
  COLORS, drawBackdrop, drawSilhouette, text, wrapText,
  fillRound, strokeRound, reliabilityColor
} from '../ui/theme.js';
import { Button, tag } from '../ui/widgets.js';
import { playTap } from '../core/audio.js';
import { getScript, randomSpot } from '../data/scripts.js';

export default class Role {
  constructor(app, params) {
    this.app = app;
    this.caseId = (params && params.caseId) || 'case1';
    // 本局藏身点在进入游戏前就定下来，角色页的初始线索文案才会跟着变
    this.keySpot = randomSpot(this.caseId);
    this.script = getScript(this.caseId, this.keySpot);
    this.time = 0;
    this.compact = H < 640;
    this.role = this.script.ROLES[Math.floor(Math.random() * this.script.ROLES.length)];
    this.clues = this.role.privateClues.map((id) => this.script.CLUES[id]).filter(Boolean);
    this.detail = null;

    this.startBtn = new Button({
      x: 32, y: H - 96, w: W - 64, h: 52,
      label: '我记住了，开始',
      onTap: () => {
        playTap();
        this.app.go('game', {
          caseId: this.caseId,
          roleId: this.role.id,
          keySpot: this.keySpot
        });
      }
    });

    this.closeBtn = new Button({
      x: W / 2 - 70, y: H - 100, w: 140, h: 44,
      label: '收起',
      kind: 'ink',
      onTap: () => { this.detail = null; }
    });
  }

  update(dt) {
    this.time += dt;
    this.startBtn.update(dt);
    this.closeBtn.update(dt);
  }

  tap(x, y) {
    if (this.detail) {
      this.closeBtn.tap(x, y);
      return;
    }
    if (this.startBtn.tap(x, y)) return;
    const panelY = TOP + H * (this.compact ? 0.34 : 0.375);
    const clueTop = panelY + (this.compact ? 182 : 192);
    const clueStep = this.compact ? 30 : 34;
    const clueH = this.compact ? 26 : 30;
    for (let i = 0; i < this.clues.length; i += 1) {
      const cy = clueTop + i * clueStep;
      const top = cy - (this.compact ? 18 : 20);
      if (x > 32 && x < W - 32 && y >= top && y <= top + clueH) {
        playTap();
        this.detail = this.clues[i];
        return;
      }
    }
  }

  render(ctx) {
    drawBackdrop(ctx, this.time, 0.62);

    text(ctx, '你的身份', 32, TOP + 30, { size: 12, color: COLORS.gray });
    text(ctx, '只有你能看到这张卡', 32, TOP + 54, {
      size: 18, color: COLORS.paper, weight: 600, maxWidth: W - 64
    });

    const compact = this.compact;
    if (!compact) {
      drawSilhouette(ctx, this.role.icon, W / 2, TOP + H * 0.155, 1.2, `${this.role.color}CC`);
    }

    const nameY = TOP + H * (compact ? 0.22 : 0.29);
    text(ctx, this.role.name, W / 2, nameY, {
      size: compact ? 24 : 28, color: COLORS.paper, align: 'center', weight: 700,
      maxWidth: W - 64
    });
    tag(ctx, this.role.job, W / 2 - 26, nameY + 22, this.role.color);
    text(ctx, this.role.tagline, W / 2, nameY + 44, {
      size: 12, color: COLORS.gray, align: 'center', maxWidth: W - 64
    });

    const panelY = TOP + H * (compact ? 0.34 : 0.375);
    fillRound(ctx, 24, panelY, W - 48, 100, 14, 'rgba(192,57,43,0.10)');
    strokeRound(ctx, 24, panelY, W - 48, 100, 14, 'rgba(192,57,43,0.45)');
    text(ctx, '你的秘密', 40, panelY + 26, { size: 11, color: '#E28B80' });
    wrapText(ctx, this.role.secret, 40, panelY + 50, W - 80, 19, 3, {
      size: 13, color: COLORS.paper
    });

    wrapText(ctx, `个人目标：${this.role.goal}`, 32, panelY + (compact ? 116 : 122), W - 64, 18, 2, {
      size: 12, color: 'rgba(245,241,232,0.6)'
    });

    text(ctx, `初始线索 · ${this.clues.length} 张（点击查看）`, 32, panelY + (compact ? 156 : 166), {
      size: 11, color: COLORS.gray, maxWidth: W - 64
    });

    const clueTop = panelY + (compact ? 182 : 192);
    const clueStep = compact ? 30 : 34;
    const clueH = compact ? 26 : 30;
    this.clues.forEach((clue, i) => {
      const cy = clueTop + i * clueStep;
      const top = cy - (compact ? 18 : 20);
      const baseline = top + (compact ? 16 : 20);
      fillRound(ctx, 32, top, W - 64, clueH, 8, 'rgba(245,241,232,0.06)');
      text(ctx, clue.title, 44, baseline, {
        size: 12, color: COLORS.paper, maxWidth: W - 120
      });
      text(ctx, clue.reliability, W - 46, baseline, {
        size: 10, color: reliabilityColor(clue.reliability), align: 'right'
      });
    });

    this.startBtn.draw(ctx, this.time);

    if (this.detail) this.drawDetail(ctx);
  }

  drawDetail(ctx) {
    const clue = this.detail;
    ctx.fillStyle = 'rgba(5,8,14,0.85)';
    ctx.fillRect(0, 0, W, H);

    const x = 28;
    const y = H * 0.2;
    const w = W - 56;
    const h = 300;
    fillRound(ctx, x, y, w, h, 16, COLORS.paper);

    text(ctx, clue.source, x + 24, y + 34, {
      size: 11, color: 'rgba(27,27,27,0.55)', maxWidth: w - 48
    });
    wrapText(ctx, clue.title, x + 24, y + 68, w - 120, 24, 2, {
      size: W < 360 ? 18 : 20, color: COLORS.ink, weight: 700
    });

    ctx.save();
    ctx.translate(x + w - 62, y + 62);
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

    wrapText(ctx, clue.text, x + 24, y + 124, w - 48, 24, 5, {
      size: 14, color: COLORS.ink
    });

    text(ctx, `# ${clue.tag}`, x + 24, y + h - 52, {
      size: 11, color: 'rgba(27,27,27,0.5)', maxWidth: w - 48
    });

    this.closeBtn.y = y + h - 46;
    this.closeBtn.x = x + w / 2 - 70;
    this.closeBtn.draw(ctx, this.time);
  }
}
