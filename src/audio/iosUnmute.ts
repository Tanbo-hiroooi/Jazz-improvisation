// iPhone / iPad では、Web Audio の音は「着信音と同じ扱い」になり、
// 消音スイッチ(マナーモード)がオンだとスピーカーから鳴らない(イヤホンでは鳴る)。
// 音楽アプリと同じ「メディア再生」として扱わせるための対策をまとめる。
//
// 1. Safari 17 以降: navigator.audioSession.type = 'playback' を指定する(標準の方法)。
// 2. それより古い iOS: 無音の <audio> をループ再生しておく。<audio> はメディア再生として
//    扱われるので、同じページの Web Audio も消音スイッチの影響を受けなくなる。
//    再生開始はユーザー操作の中でしか許されないので、再生ボタンの処理から毎回呼ぶ。

interface AudioSessionLike {
  type: string;
}

function audioSession(): AudioSessionLike | undefined {
  return (navigator as Navigator & { audioSession?: AudioSessionLike }).audioSession;
}

function isIOS(): boolean {
  const ua = navigator.userAgent;
  // iPadOS 13 以降は Mac と同じ UA なので、タッチ対応で見分ける
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** 0.5秒の無音 WAV(8kHz・8bit・モノラル)。外部ファイルを増やさないようにその場で作る */
function silentWavUrl(): string {
  const samples = 4000;
  const buf = new ArrayBuffer(44 + samples);
  const v = new DataView(buf);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + samples, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  str(36, 'data'); v.setUint32(40, samples, true);
  for (let i = 0; i < samples; i++) v.setUint8(44 + i, 128); // 8bit の無音は 128
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

let silentEl: HTMLAudioElement | null = null;

// 読み込み時点で指定しておく(AudioContext が動き出す前に決まっている方が確実)
try {
  const s = audioSession();
  if (s) s.type = 'playback';
} catch { /* 未対応のブラウザでは何もしない */ }

/** 再生ボタンなどユーザー操作の中で、最初の await より前に呼ぶ */
export function unmuteForSilentSwitch(): void {
  try {
    const s = audioSession();
    if (s) {
      if (s.type !== 'playback') s.type = 'playback';
      return;
    }
    if (!isIOS()) return;
    if (!silentEl) {
      silentEl = document.createElement('audio');
      silentEl.setAttribute('playsinline', '');
      silentEl.setAttribute('x-webkit-airplay', 'deny');
      silentEl.loop = true;
      silentEl.preload = 'auto';
      silentEl.src = silentWavUrl();
      // 画面を離れたら止める(ロック画面の再生中表示を残さない)。次の再生操作でまた始まる
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) silentEl?.pause();
      });
    }
    if (silentEl.paused) void silentEl.play().catch(() => { /* 失敗しても Web Audio 側は通常どおり */ });
  } catch { /* 対策が効かなくても再生自体は止めない */ }
}
