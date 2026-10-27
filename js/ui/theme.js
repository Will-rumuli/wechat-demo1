import { W, H, grain } from '../core/screen.js';

export const COLORS = {
  night: '#0E1420',
  night2: '#151D2C',
  amber: '#F2C14E',
  red: '#C0392B',
  paper: '#F5F1E8',
  ink: '#1B1B1B',
  gray: '#8A93A3',
  green: '#7FB37F',
  blue: '#7FB3D5'
};

export function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function fillRound(ctx, x, y, w, h, r, color) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
}

export function strokeRound(ctx, x, y, w, h, r, color, lineWidth = 1) {
  roundRect(ctx, x, y, w, h, r);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

export function fontOf(opt = {}) {
  const size = opt.size || 14;
  return `${opt.weight || 400} ${size}px "PingFang SC", "Helvetica Neue", sans-serif`;
}

// 单行截断：超宽时以省略号收尾，避免文字冲出控件
export function ellipsis(ctx, str, maxWidth) {
  const value = String(str);
  if (maxWidth <= 0) return '';
  if (ctx.measureText(value).width <= maxWidth) return value;
  const mark = '…';
  let out = '';
  for (let i = 0; i < value.length; i += 1) {
    const test = value.slice(0, i + 1) + mark;
    if (ctx.measureText(test).width > maxWidth) break;
    out = value.slice(0, i + 1);
  }
  return out + mark;
}

export function text(ctx, str, x, y, opt = {}) {
  ctx.save();
  ctx.font = fontOf(opt);
  ctx.fillStyle = opt.color || COLORS.paper;
  ctx.textAlign = opt.align || 'left';
  ctx.textBaseline = opt.baseline || 'alphabetic';
  ctx.globalAlpha = opt.alpha == null ? 1 : opt.alpha;
  const value = opt.maxWidth ? ellipsis(ctx, str, opt.maxWidth) : String(str);
  ctx.fillText(value, x, y);
  ctx.restore();
}

// 中文断行：行首不出现收尾标点，行尾不留下开引号/括号
const NO_LINE_START = '，。、！？；：）】》”』…,.!?;:)]}';
const NO_LINE_END = '（【《“‘『([{';

function breakLines(ctx, str, maxWidth) {
  const chars = String(str).split('');
  const lines = [];
  let line = '';
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    const test = line + ch;
    if (line && ctx.measureText(test).width > maxWidth) {
      if (NO_LINE_START.indexOf(ch) !== -1) {
        lines.push(test);
        line = '';
        continue;
      }
      let carry = '';
      while (line && NO_LINE_END.indexOf(line.slice(-1)) !== -1) {
        carry = line.slice(-1) + carry;
        line = line.slice(0, -1);
      }
      lines.push(line);
      line = carry + ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function wrapText(ctx, str, x, y, maxWidth, lineHeight, maxLines = 99, opt = {}) {
  ctx.save();
  ctx.font = fontOf(opt);
  let lines = breakLines(ctx, str, maxWidth);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = ellipsis(ctx, `${lines[maxLines - 1]}…`, maxWidth);
  }
  ctx.restore();
  for (let i = 0; i < lines.length; i += 1) {
    text(ctx, lines[i], x, y + i * lineHeight, opt);
  }
  return lines.length;
}

// 传入 opt 时按 opt 的字号测量；不传则沿用调用方已设置的 ctx.font
export function measureLines(ctx, str, maxWidth, opt) {
  ctx.save();
  if (opt) ctx.font = fontOf(opt);
  const count = breakLines(ctx, str, maxWidth).length;
  ctx.restore();
  return count;
}

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// 夜景：楼体剪影 + 亮窗 + 雨 + 暗角
export function drawBackdrop(ctx, time, dim = 0) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0A0F18');
  sky.addColorStop(0.55, '#111A29');
  sky.addColorStop(1, '#0B111C');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // 远处楼群
  const rnd = seeded(20261021);
  ctx.fillStyle = 'rgba(10, 16, 26, 0.85)';
  for (let i = 0; i < 7; i += 1) {
    const bw = 40 + rnd() * 55;
    const bh = 120 + rnd() * 200;
    const bx = i * (W / 6) - 10;
    ctx.fillRect(bx, H - bh - 60, bw, bh + 60);
  }

  // 主楼
  const bx = W * 0.44;
  const bw = W * 0.44;
  const by = H * 0.16;
  const bh = H * 0.74;
  ctx.fillStyle = '#0C121D';
  ctx.fillRect(bx, by, bw, bh);

  // 楼体轮廓光
  ctx.strokeStyle = 'rgba(242, 193, 78, 0.18)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, by + 0.5, bw, bh);

  // 窗户
  const cols = 4;
  const rows = 9;
  const padX = 16;
  const padY = 20;
  const gapX = (bw - padX * 2) / cols;
  const gapY = (bh - padY * 2) / rows;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const wx = bx + padX + c * gapX + 6;
      const wy = by + padY + r * gapY + 8;
      const ww = gapX - 14;
      const wh = gapY - 16;
      const is403 = r === rows - 3 && c === 0;
      const lit = is403 || rnd() > 0.55;
      if (lit) {
        const flicker = 0.72 + Math.sin(time * 1.7 + r * 2 + c) * 0.08;
        ctx.fillStyle = is403
          ? `rgba(242, 193, 78, ${flicker})`
          : `rgba(226, 176, 96, ${0.28 + rnd() * 0.34})`;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      }
      ctx.fillRect(wx, wy, ww, wh);
      if (is403) {
        ctx.strokeStyle = 'rgba(192, 57, 43, 0.9)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(wx - 2, wy - 2, ww + 4, wh + 4);
      }
    }
  }

  // 雨
  ctx.strokeStyle = 'rgba(180, 205, 230, 0.16)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 60; i += 1) {
    const rr = seeded(i * 977 + 13);
    const rx = (rr() * W + time * 40) % W;
    const ry = (rr() * H + time * 420) % H;
    const len = 8 + rr() * 14;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx - 2.5, ry + len);
    ctx.stroke();
  }

  // 地面反光
  const ground = ctx.createLinearGradient(0, H * 0.82, 0, H);
  ground.addColorStop(0, 'rgba(242, 193, 78, 0)');
  ground.addColorStop(1, 'rgba(242, 193, 78, 0.06)');
  ctx.fillStyle = ground;
  ctx.fillRect(0, H * 0.82, W, H * 0.18);

  if (dim > 0) {
    ctx.fillStyle = `rgba(8, 12, 20, ${dim})`;
    ctx.fillRect(0, 0, W, H);
  }

  // 暗角
  const vg = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.2, W / 2, H * 0.45, H * 0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  grain(ctx, 0.16);
}

// 角色剪影：扁平 + 标志物
export function drawSilhouette(ctx, icon, x, y, scale, accent) {
  const s = scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);

  // 身体
  ctx.fillStyle = '#0A0E15';
  ctx.beginPath();
  ctx.moveTo(-34, 60);
  ctx.quadraticCurveTo(-30, 12, -16, 6);
  ctx.lineTo(16, 6);
  ctx.quadraticCurveTo(30, 12, 34, 60);
  ctx.closePath();
  ctx.fill();

  // 头
  ctx.beginPath();
  ctx.arc(0, -14, 17, 0, Math.PI * 2);
  ctx.fill();

  // 轮廓光
  ctx.strokeStyle = accent || 'rgba(242, 193, 78, 0.55)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(-3, -16, 16, Math.PI * 0.95, Math.PI * 1.75);
  ctx.stroke();

  if (icon === 'flashlight') {
    ctx.fillStyle = '#0A0E15';
    ctx.fillRect(-19, -30, 38, 6);
    ctx.fillRect(-10, -35, 20, 6);
    ctx.strokeStyle = 'rgba(242, 193, 78, 0.75)';
    ctx.beginPath();
    ctx.moveTo(30, 6);
    ctx.lineTo(74, -8);
    ctx.moveTo(30, 18);
    ctx.lineTo(74, 20);
    ctx.stroke();
  } else if (icon === 'umbrella') {
    ctx.strokeStyle = accent || 'rgba(192, 57, 43, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -12, 38, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(0, 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-6, 30, 6, 0, Math.PI);
    ctx.stroke();
  } else if (icon === 'helmet') {
    ctx.fillStyle = '#0A0E15';
    ctx.beginPath();
    ctx.arc(0, -20, 21, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-23, -20, 46, 4);
    ctx.strokeStyle = accent || 'rgba(127, 179, 213, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-16, -18);
    ctx.lineTo(14, -18);
    ctx.stroke();
  } else if (icon === 'cart') {
    ctx.strokeStyle = accent || 'rgba(155, 193, 165, 0.85)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-46, 18, 26, 26);
    ctx.beginPath();
    ctx.moveTo(-46, 18);
    ctx.lineTo(-33, 2);
    ctx.lineTo(-20, 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-40, 48, 4, 0, Math.PI * 2);
    ctx.arc(-26, 48, 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawIcon(ctx, name, x, y, size, color) {
  const s = size / 24;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (name === 'door') {
    ctx.strokeRect(-7, -9, 14, 19);
    ctx.beginPath();
    ctx.arc(3, 1, 1.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (name === 'lift') {
    ctx.strokeRect(-8, -10, 16, 21);
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(0, 11);
    ctx.moveTo(-3, -5);
    ctx.lineTo(0, -8);
    ctx.lineTo(3, -5);
    ctx.moveTo(-3, 6);
    ctx.lineTo(0, 9);
    ctx.lineTo(3, 6);
    ctx.stroke();
  } else if (name === 'chat') {
    ctx.strokeRect(-9, -8, 18, 13);
    ctx.beginPath();
    ctx.moveTo(-3, 5);
    ctx.lineTo(-5, 10);
    ctx.lineTo(2, 5);
    ctx.stroke();
  } else if (name === 'trash') {
    ctx.beginPath();
    ctx.moveTo(-7, -6);
    ctx.lineTo(7, -6);
    ctx.lineTo(5, 10);
    ctx.lineTo(-5, 10);
    ctx.closePath();
    ctx.moveTo(-9, -8);
    ctx.lineTo(9, -8);
    ctx.moveTo(-3, -11);
    ctx.lineTo(3, -11);
    ctx.stroke();
  } else if (name === 'roof') {
    ctx.beginPath();
    ctx.moveTo(-10, 4);
    ctx.lineTo(0, -6);
    ctx.lineTo(10, 4);
    ctx.moveTo(-7, 4);
    ctx.lineTo(-7, 10);
    ctx.lineTo(7, 10);
    ctx.lineTo(7, 4);
    ctx.moveTo(4, -6);
    ctx.lineTo(4, -12);
    ctx.stroke();
  } else if (name === 'car') {
    ctx.beginPath();
    ctx.moveTo(-11, 4);
    ctx.lineTo(-8, -3);
    ctx.lineTo(2, -6);
    ctx.lineTo(9, -1);
    ctx.lineTo(11, 4);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-6, 6, 2.4, 0, Math.PI * 2);
    ctx.arc(6, 6, 2.4, 0, Math.PI * 2);
    ctx.stroke();
  } else if (name === 'box') {
    ctx.strokeRect(-8, -6, 16, 14);
    ctx.beginPath();
    ctx.moveTo(-8, -1);
    ctx.lineTo(8, -1);
    ctx.moveTo(0, -6);
    ctx.lineTo(0, -1);
    ctx.stroke();
  } else if (name === 'paper') {
    ctx.strokeRect(-7, -10, 14, 20);
    ctx.beginPath();
    ctx.moveTo(-4, -4);
    ctx.lineTo(4, -4);
    ctx.moveTo(-4, 0);
    ctx.lineTo(4, 0);
    ctx.moveTo(-4, 4);
    ctx.lineTo(1, 4);
    ctx.stroke();
  } else if (name === 'phone') {
    ctx.strokeRect(-6, -10, 12, 20);
    ctx.beginPath();
    ctx.arc(0, 7, 1, 0, Math.PI * 2);
    ctx.stroke();
  } else if (name === 'storage') {
    ctx.strokeRect(-9, -9, 18, 18);
    ctx.beginPath();
    ctx.moveTo(-9, -3);
    ctx.lineTo(9, -3);
    ctx.moveTo(-9, 3);
    ctx.lineTo(9, 3);
    ctx.stroke();
  } else if (name === 'camera') {
    ctx.strokeRect(-9, -5, 18, 12);
    ctx.beginPath();
    ctx.arc(0, 1, 3.4, 0, Math.PI * 2);
    ctx.moveTo(-4, -8);
    ctx.lineTo(4, -8);
    ctx.stroke();
  } else if (name === 'screen') {
    ctx.strokeRect(-9, -8, 18, 13);
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(0, 9);
    ctx.moveTo(-4, 10);
    ctx.lineTo(4, 10);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function reliabilityColor(label) {
  if (label === '确定') return COLORS.green;
  if (label === '可疑') return COLORS.amber;
  if (label === '误导') return COLORS.red;
  return COLORS.gray;
}
