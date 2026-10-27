// 音频：复用项目内资源，首次触摸后解锁播放
const bgm = wx.createInnerAudioContext();
bgm.src = 'audio/bgm.m4a';
bgm.loop = true;
bgm.volume = 0.34;

const tapSound = wx.createInnerAudioContext();
tapSound.src = 'audio/tap.m4a';
tapSound.volume = 0.3;

const clueSound = wx.createInnerAudioContext();
clueSound.src = 'audio/clue.m4a';
clueSound.volume = 0.45;

let unlocked = false;
let muted = false;

function safePlay(audio) {
  try {
    audio.stop();
    audio.play();
  } catch (e) {
    // 音频失败不影响游戏
  }
}

export function unlock() {
  if (unlocked) return;
  unlocked = true;
  if (!muted) safePlay(bgm);
}

export function playTap() {
  if (!muted) safePlay(tapSound);
}

export function playClue() {
  if (!muted) safePlay(clueSound);
}

export function toggleMute() {
  muted = !muted;
  if (muted) {
    try { bgm.pause(); } catch (e) {}
  } else if (unlocked) {
    safePlay(bgm);
  }
  return muted;
}

export function isMuted() {
  return muted;
}
