import { W, H, TOP } from '../core/screen.js';
import {
  COLORS, drawBackdrop, text, wrapText,
  fillRound, strokeRound
} from '../ui/theme.js';
import { playTap } from '../core/audio.js';
import { getScript } from '../data/scripts.js';

export default class Vote {
  constructor(app, params) {
    this.app = app;
    this.params = params || {};
    this.caseId = this.params.caseId || 'case1';
    this.keySpot = this.params.keySpot || '';
    this.script = getScript(this.caseId, this.keySpot);
    this.time = 0;
    this.index = 0;
    this.answers = [];
    this.locked = false;
    this.questions = this.script.QUESTIONS;
  }

  update(dt) {
    this.time += dt;
  }

  optionRect(i) {
    const current = this.questions[this.index];
    const n = current.options.length;
    const top = TOP + 168;
    const avail = Math.max(120, H - 72 - top);
    const gap = n >= 4 ? 10 : 12;
    const h = Math.min(54, Math.floor((avail - gap * (n - 1)) / n));
    const used = h * n + gap * (n - 1);
    const startY = top + Math.max(0, Math.floor((avail - used) / 2));
    return { x: 28, y: startY + i * (h + gap), w: W - 56, h };
  }

  tap(x, y) {
    if (this.locked) return;
    const current = this.questions[this.index];
    for (let i = 0; i < current.options.length; i += 1) {
      const r = this.optionRect(i);
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        playTap();
        this.answers.push(current.options[i].id);
        this.locked = true;
        setTimeout(() => {
          this.locked = false;
          if (this.index >= this.questions.length - 1) {
            this.app.go('result', {
              caseId: this.caseId,
              answers: this.answers.slice(),
              roleId: this.params.roleId,
              clueCount: this.params.clueCount || 0,
              handIds: this.params.handIds || [],
              mode: this.params.mode || 'solo',
              roomId: this.params.roomId || '',
              keyLiar: this.params.keyLiar || '',
              keySpot: this.params.keySpot || ''
            });
          } else {
            this.index += 1;
          }
        }, 180);
        return;
      }
    }
  }

  render(ctx) {
    drawBackdrop(ctx, this.time, 0.72);
    const current = this.questions[this.index];

    text(ctx, '最终投票', 28, TOP + 34, { size: 22, color: COLORS.paper, weight: 700 });
    text(ctx, `${this.index + 1} / ${this.questions.length}`, W - 28, TOP + 34, {
      size: 12, color: COLORS.gray, align: 'right'
    });

    for (let i = 0; i < this.questions.length; i += 1) {
      ctx.beginPath();
      ctx.arc(30 + i * 14, TOP + 52, 3, 0, Math.PI * 2);
      ctx.fillStyle = i <= this.index ? COLORS.amber : 'rgba(245,241,232,0.18)';
      ctx.fill();
    }

    wrapText(ctx, current.q, 28, TOP + 96, W - 56, 30, 2, {
      size: 24, color: COLORS.paper, weight: 700
    });
    text(ctx, current.hint, 28, TOP + 142, {
      size: 12, color: COLORS.gray, maxWidth: W - 56
    });

    current.options.forEach((opt, i) => {
      const r = this.optionRect(i);
      fillRound(ctx, r.x, r.y, r.w, r.h, 12, 'rgba(245,241,232,0.06)');
      strokeRound(ctx, r.x, r.y, r.w, r.h, 12, 'rgba(245,241,232,0.14)');
      text(ctx, opt.label, r.x + 20, r.y + r.h / 2 + 5, {
        size: 15, color: COLORS.paper, maxWidth: r.w - 56
      });
      text(ctx, '›', r.x + r.w - 18, r.y + r.h / 2 + 6, {
        size: 18, color: 'rgba(245,241,232,0.35)', align: 'right'
      });
    });

    text(ctx, '选择后不可更改。', W / 2, H - 48, {
      size: 11, color: 'rgba(138,147,163,0.75)', align: 'center', maxWidth: W - 48
    });
  }
}
