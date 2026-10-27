// 头像绘制：优先加载微信头像，失败时用昵称首字生成程序化头像
const cache = {};
const PALETTE = ['#C0392B', '#7FB37F', '#7FB3D5', '#F2C14E', '#B07FD5', '#5DA9A0'];

function hash(str) {
  let h = 0;
  const value = String(str || '');
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) % 100000;
  }
  return h;
}

function getImage(url) {
  if (!url || typeof wx === 'undefined' || !wx.createImage) return null;
  if (cache[url]) return cache[url];
  try {
    const img = wx.createImage();
    img.src = url;
    cache[url] = img;
    return img;
  } catch (e) {
    return null;
  }
}

export function avatarColor(profile) {
  const seed = (profile && (profile.id || profile.shortId || profile.nickName)) || '';
  return PALETTE[hash(seed) % PALETTE.length];
}

export function drawAvatar(ctx, profile, x, y, r, opt = {}) {
  const p = profile || {};
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  const img = getImage(p.avatarUrl);
  if (img && img.width > 0) {
    ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = avatarColor(p);
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    const label = String(p.nickName || p.shortId || '?').slice(0, 1);
    ctx.fillStyle = 'rgba(18,22,31,0.88)';
    ctx.font = `600 ${Math.max(10, Math.round(r * 0.9))}px "PingFang SC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + 1);
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = opt.ring || 'rgba(242,193,78,0.55)';
  ctx.lineWidth = opt.lineWidth || 1.4;
  ctx.beginPath();
  ctx.arc(x, y, r + 0.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
