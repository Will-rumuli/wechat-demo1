import { W, H, BOTTOM, grain } from '../core/screen.js';
import { COLORS, text } from '../ui/theme.js';

function smooth(t) {
  const v = Math.max(0, Math.min(1, t));
  return v * v * (3 - 2 * v);
}

// 黑屏开场：白字浮现、停留、慢慢消散，然后进入剧本库
export default class Intro {
  constructor(app) {
    this.app = app;
    this.time = 0;
    this.done = false;
  }

  update(dt) {
    this.time += dt;
    if (!this.done && this.time >= 4.2) {
      this.done = true;
      this.finish();
    }
  }

  finish() {
    const invite = this.app.consumeInvite ? this.app.consumeInvite() : null;
    if (invite) {
      this.app.go('detail', {
        caseId: invite.caseId,
        roomId: invite.roomId,
        autoJoin: true
      });
      return;
    }
    this.app.go('catalog');
  }

  tap() {
    if (this.done) return;
    if (this.time < 2.6) this.time = 2.6;
  }

  render(ctx) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    const t = this.time;
    const fadeIn = smooth(t / 1.2);
    const fadeOut = t <= 2.6 ? 1 : Math.max(0, 1 - (t - 2.6) / 1.4);
    const alpha = fadeIn * fadeOut;
    const drift = t <= 2.6 ? 0 : -((t - 2.6) / 1.4) * 10;

    // 极淡的暖光，避免纯黑太死
    const glow = ctx.createRadialGradient(
      W / 2, H * 0.46, 8, W / 2, H * 0.46, Math.max(W, H) * 0.5
    );
    glow.addColorStop(0, `rgba(242,193,78,${0.055 * alpha})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    const size = W < 360 ? 25 : 31;
    const gap = size * 1.55;
    const scale = 0.985 + fadeIn * 0.015;

    ctx.save();
    ctx.translate(W / 2, H / 2 + drift);
    ctx.scale(scale, scale);
    text(ctx, '我们群里', 0, -gap / 2, {
      size, color: '#F5F1E8', align: 'center', weight: 600, alpha, maxWidth: W - 64
    });
    text(ctx, '少了一个人', 0, gap / 2, {
      size, color: '#F5F1E8', align: 'center', weight: 600, alpha, maxWidth: W - 64
    });

    const grow = smooth((t - 0.8) / 1.2);
    const lineW = Math.min(W * 0.3, 120) * grow;
    ctx.globalAlpha = alpha * 0.7;
    ctx.strokeStyle = COLORS.amber;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-lineW / 2, gap / 2 + 20);
    ctx.lineTo(lineW / 2, gap / 2 + 20);
    ctx.stroke();
    ctx.restore();

    const subAlpha = smooth((t - 1.4) / 0.9) * fadeOut;
    text(ctx, '微信群 · 7 号楼', W / 2, H / 2 - (W < 360 ? 92 : 108) + drift, {
      size: 10, color: 'rgba(138,147,163,0.9)', align: 'center', alpha: subAlpha,
      maxWidth: W - 64
    });

    const hintAlpha = smooth((t - 2.2) / 0.8) * fadeOut;
    text(ctx, '轻触继续', W / 2, H - BOTTOM - 48, {
      size: 10, color: 'rgba(245,241,232,0.5)', align: 'center', alpha: hintAlpha
    });

    grain(ctx, 0.04);
  }
}
