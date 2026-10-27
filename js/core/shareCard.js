import { COLORS } from '../ui/theme.js';

// 微信分享封面固定按 5:4 裁剪，这里就按 1:1 像素绘制，避免二次放大发虚
const CARD_W = 500;
const CARD_H = 400;
const PAD = 40;
const FONT = '"PingFang SC", "Helvetica Neue", sans-serif';

const cache = new Map();
const building = new Set();

function keyOf(opts) {
  return `${opts.roomId || ''}|${opts.title || ''}|${opts.missing}|${opts.total}`;
}

export function missingText(missing) {
  if (missing <= 0) return '人齐了，就差你';
  return `还差 ${missing} 人`;
}

function wrapTitle(ctx, str, maxWidth, maxLines) {
  const chars = String(str).split('');
  const lines = [];
  let line = '';
  for (let i = 0; i < chars.length; i += 1) {
    const test = line + chars[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = chars[i];
      if (lines.length === maxLines) break;
    } else {
      line = test;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && chars.join('').length > lines.join('').length) {
    const last = lines[maxLines - 1];
    lines[maxLines - 1] = `${last.slice(0, Math.max(1, last.length - 1))}…`;
  }
  return lines;
}

// 导出给测试预览用；正式流程只走下面的 prepare/inviteCardImage
export function drawCard(ctx, opts) {
  const roomId = String(opts.roomId || '');

  const g = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  g.addColorStop(0, '#0A1018');
  g.addColorStop(0.55, '#141E2C');
  g.addColorStop(1, '#0A0E15');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // 斜向雨丝，营造悬疑夜雨氛围
  ctx.strokeStyle = 'rgba(138,147,163,0.12)';
  ctx.lineWidth = 1;
  let seed = 11;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = 0; i < 54; i += 1) {
    const x = Math.round(rnd() * (CARD_W + 40));
    const y = Math.round(rnd() * CARD_H);
    const len = 12 + Math.round(rnd() * 24);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 4, y + len);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(245,241,232,0.14)';
  ctx.lineWidth = 2;
  ctx.strokeRect(13, 13, CARD_W - 26, CARD_H - 26);

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.gray;
  ctx.font = `13px ${FONT}`;
  ctx.fillText('微信小游戏 · 悬疑剧本杀', PAD, 60);

  ctx.fillStyle = COLORS.paper;
  ctx.font = `bold 34px ${FONT}`;
  const lines = wrapTitle(ctx, opts.title || '', CARD_W - PAD * 2, 2);
  lines.forEach((line, i) => {
    ctx.fillText(line, PAD, 116 + i * 46);
  });

  const ruleY = 116 + (lines.length - 1) * 46 + 26;
  ctx.fillStyle = COLORS.red;
  ctx.fillRect(PAD, ruleY, 46, 3);

  const roomY = ruleY + 62;
  ctx.fillStyle = COLORS.gray;
  ctx.font = `13px ${FONT}`;
  ctx.fillText('房间号', PAD, roomY);

  ctx.fillStyle = COLORS.paper;
  ctx.font = `bold 30px ${FONT}`;
  let x = PAD + 72;
  roomId.split('').forEach((ch) => {
    ctx.fillText(ch, x, roomY);
    x += 32;
  });

  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.amber;
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillText(missingText(opts.missing), CARD_W - PAD, roomY);
  ctx.textAlign = 'left';

  ctx.fillStyle = 'rgba(245,241,232,0.45)';
  ctx.font = `15px ${FONT}`;
  ctx.fillText('是生是死，由你决定', PAD, CARD_H - 46);
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.gray;
  ctx.font = `13px ${FONT}`;
  ctx.fillText(`${opts.total || 0} 人本`, CARD_W - PAD, CARD_H - 46);
  ctx.textAlign = 'left';
}

function exportCard(canvas) {
  return new Promise((resolve) => {
    const done = (res) => resolve((res && res.tempFilePath) || '');
    const fail = () => resolve('');
    const opts = {
      x: 0, y: 0,
      width: CARD_W, height: CARD_H,
      destWidth: CARD_W, destHeight: CARD_H,
      fileType: 'png',
      success: done,
      fail
    };
    try {
      if (typeof canvas.toTempFilePath === 'function') {
        canvas.toTempFilePath(opts);
      } else if (typeof wx !== 'undefined' && wx.canvasToTempFilePath) {
        wx.canvasToTempFilePath({ ...opts, canvas });
      } else {
        resolve('');
      }
    } catch (e) {
      resolve('');
    }
  });
}

function build(opts) {
  return new Promise((resolve) => {
    let canvas = null;
    try {
      canvas = typeof wx !== 'undefined' && wx.createCanvas ? wx.createCanvas() : null;
    } catch (e) {
      canvas = null;
    }
    if (!canvas) {
      resolve('');
      return;
    }
    try {
      canvas.width = CARD_W;
      canvas.height = CARD_H;
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'alphabetic';
      drawCard(ctx, opts);
    } catch (e) {
      resolve('');
      return;
    }
    exportCard(canvas).then(resolve);
  });
}

// 已经生成好的封面路径；没有就返回空串，分享时退化为系统截图
export function inviteCardImage(opts) {
  return cache.get(keyOf(opts)) || '';
}

// 提前生成，避免用户点分享时才开始画图导致拿不到封面
export function prepareInviteCard(opts) {
  const key = keyOf(opts);
  if (cache.has(key) || building.has(key)) return;
  building.add(key);
  build(opts).then((path) => {
    building.delete(key);
    if (path) cache.set(key, path);
  }).catch(() => {
    building.delete(key);
  });
}
