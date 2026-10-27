// 画布、输入与主循环
const info = wx.getSystemInfoSync();

export const W = info.windowWidth;
export const H = info.windowHeight;
export const DPR = Math.min(info.pixelRatio || 2, 3);
export const TOP = info.safeArea ? Math.max(info.safeArea.top, 24) : 24;
export const BOTTOM = info.safeArea ? Math.max(0, H - info.safeArea.bottom) : 0;

export const canvas = wx.createCanvas();
export const ctx = canvas.getContext('2d');

canvas.width = Math.floor(W * DPR);
canvas.height = Math.floor(H * DPR);
ctx.scale(DPR, DPR);

// 离屏画布：一次性噪点纹理，避免每帧重算
export const offscreen = wx.createCanvas();
const offscreenCtx = offscreen.getContext('2d');
offscreen.width = 180;
offscreen.height = 320;
const noiseData = offscreenCtx.createImageData(180, 320);
for (let i = 0; i < noiseData.data.length; i += 4) {
  const v = 120 + Math.random() * 135;
  noiseData.data[i] = v;
  noiseData.data[i + 1] = v;
  noiseData.data[i + 2] = v;
  noiseData.data[i + 3] = Math.random() * 26;
}
offscreenCtx.putImageData(noiseData, 0, 0);

export function grain(target, alpha = 0.18) {
  target.save();
  target.globalAlpha = alpha;
  target.drawImage(offscreen, 0, 0, 180, 320, 0, 0, W, H);
  target.restore();
}

export function onTap(handler) {
  wx.onTouchStart((e) => {
    const touch = e.touches && e.touches[0];
    if (touch) handler(touch.clientX, touch.clientY);
  });
}

export function onTouchMove(handler) {
  wx.onTouchMove((e) => {
    const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    if (touch) handler(touch.clientX, touch.clientY);
  });
}

export function onTouchEnd(handler) {
  wx.onTouchEnd(() => handler());
}

export function startLoop(update, render) {
  let last = Date.now();
  const frame = () => {
    const now = Date.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    update(dt);
    ctx.save();
    render(ctx);
    ctx.restore();
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(frame);
    } else {
      setTimeout(frame, 16);
    }
  };
  requestAnimationFrame(frame);
}

try {
  wx.setKeepScreenOn({ keepScreenOn: true });
} catch (e) {
  // 忽略不支持的环境
}
