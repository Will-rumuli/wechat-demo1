import { COLORS, fillRound, strokeRound, text } from './theme.js';

export class Button {
  constructor(opt) {
    this.x = opt.x;
    this.y = opt.y;
    this.w = opt.w;
    this.h = opt.h;
    this.label = opt.label || '';
    this.sub = opt.sub || '';
    this.kind = opt.kind || 'primary';
    this.onTap = opt.onTap || null;
    this.pressed = 0;
  }

  hit(px, py) {
    return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h;
  }

  tap(px, py) {
    if (this.hit(px, py) && this.onTap) {
      this.pressed = 0.12;
      this.onTap();
      return true;
    }
    return false;
  }

  update(dt) {
    if (this.pressed > 0) this.pressed = Math.max(0, this.pressed - dt);
  }

  draw(ctx, time = 0) {
    const y = this.y - (this.pressed > 0 ? 1 : 0);
    if (this.kind === 'primary') {
      fillRound(ctx, this.x, y, this.w, this.h, 12, COLORS.amber);
      text(ctx, this.label, this.x + this.w / 2, y + this.h / 2 + 5, {
        size: 16, color: '#12161F', align: 'center', weight: 600, maxWidth: this.w - 24
      });
    } else if (this.kind === 'danger') {
      fillRound(ctx, this.x, y, this.w, this.h, 12, 'rgba(192, 57, 43, 0.16)');
      strokeRound(ctx, this.x, y, this.w, this.h, 12, 'rgba(192, 57, 43, 0.6)');
      text(ctx, this.label, this.x + this.w / 2, y + this.h / 2 + 5, {
        size: 15, color: '#E28B80', align: 'center', weight: 500, maxWidth: this.w - 24
      });
    } else if (this.kind === 'ink') {
      strokeRound(ctx, this.x, y, this.w, this.h, 12, 'rgba(27,27,27,0.45)');
      text(ctx, this.label, this.x + this.w / 2, y + this.h / 2 + 5, {
        size: 15, color: COLORS.ink, align: 'center', weight: 500, maxWidth: this.w - 24
      });
    } else {
      const glow = 0.5 + Math.sin(time * 2) * 0.08;
      strokeRound(ctx, this.x, y, this.w, this.h, 12, `rgba(245, 241, 232, ${glow})`);
      text(ctx, this.label, this.x + this.w / 2, y + this.h / 2 + 5, {
        size: 15, color: COLORS.paper, align: 'center', weight: 500, maxWidth: this.w - 24
      });
    }
    if (this.sub) {
      text(ctx, this.sub, this.x + this.w / 2, y + this.h / 2 + 21, {
        size: 11, color: this.kind === 'primary' ? 'rgba(18,22,31,0.65)' : COLORS.gray,
        align: 'center', maxWidth: this.w - 24
      });
    }
  }
}

export function tag(ctx, label, x, y, color, padding = 6) {
  ctx.save();
  ctx.font = '500 11px "PingFang SC", sans-serif';
  const w = ctx.measureText(label).width + padding * 2;
  fillRound(ctx, x, y - 12, w, 19, 9, 'rgba(255,255,255,0.06)');
  strokeRound(ctx, x, y - 12, w, 19, 9, color + '99', 1);
  text(ctx, label, x + padding, y + 2, { size: 11, color });
  ctx.restore();
  return w;
}

export function divider(ctx, x1, y, x2, color = 'rgba(245,241,232,0.12)') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y + 0.5);
  ctx.lineTo(x2, y + 0.5);
  ctx.stroke();
  ctx.restore();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// 通用纵向滚动容器：拖动 + 松手惯性 + 边界回弹
export class ScrollView {
  constructor(opt) {
    this.x = opt.x;
    this.y = opt.y;
    this.w = opt.w;
    this.h = opt.h;
    this.contentH = 0;
    this.offset = 0;
    this.max = 0;
    this.dragging = false;
    this.lastY = 0;
    this.velocity = 0;
    this.stickBottom = true;
  }

  setContent(height) {
    this.contentH = height;
    this.max = Math.max(0, height - this.h);
    this.offset = clamp(this.offset, 0, this.max);
    if (this.stickBottom && !this.dragging) this.offset = this.max;
  }

  contains(x, y) {
    return x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h;
  }

  start(x, y) {
    if (!this.contains(x, y)) return false;
    this.dragging = true;
    this.lastY = y;
    this.velocity = 0;
    this.stickBottom = false;
    return true;
  }

  move(y) {
    if (!this.dragging) return;
    const dy = y - this.lastY;
    this.lastY = y;
    this.offset = clamp(this.offset - dy, 0, this.max);
    this.velocity = -dy;
  }

  end() {
    if (!this.dragging) return;
    this.dragging = false;
    this.stickBottom = this.offset >= this.max - 4;
  }

  update(dt) {
    if (this.dragging || Math.abs(this.velocity) < 0.2) return;
    this.offset = clamp(this.offset + this.velocity * 60 * dt, 0, this.max);
    this.velocity *= Math.pow(0.02, dt);
    if (Math.abs(this.velocity) < 0.2) this.velocity = 0;
  }

  drawBar(ctx) {
    if (this.max <= 0.5) return;
    const height = Math.max(24, this.h * this.h / this.contentH);
    const y = this.y + (this.h - height) * (this.offset / this.max);
    fillRound(ctx, this.x + this.w - 4, y, 3, height, 1.5, 'rgba(245,241,232,0.22)');
  }
}
