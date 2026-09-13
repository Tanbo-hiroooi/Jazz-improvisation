// スウィング設定(リズムパターンの再生に適用)

/** スウィングの強さ: ウラ拍(8分)を何拍ぶん遅らせるか */
export interface SwingOption {
  id: string;
  label: string;
  labelEn: string;
  offset: number;
}

export const SWING_OPTIONS: SwingOption[] = [
  { id: 'none', label: 'なし', labelEn: 'None', offset: 0 },
  { id: 'light', label: '軽め', labelEn: 'Light', offset: 0.09 },
  { id: 'standard', label: '標準(三連)', labelEn: 'Standard (triplet)', offset: 1 / 6 },
  { id: 'hard', label: '強め', labelEn: 'Hard', offset: 0.25 },
];

/** スウィング適用の入出力(拍単位。engine の timedNotes と同じ形) */
export interface SwingNote { start: number; duration: number }

/**
 * スウィングをかける。ウラ拍(x.5)の音を sw 拍遅らせ、その8分の音価を詰める。
 * オモテ拍の8分(音価0.5)はウラ拍まで伸ばして「タータ」にする。
 *
 * ただし**16分が入っている拍はイーブンのまま**にする。
 * 16分の2つ目(x.5)まで遅らせると3つ目(x.75)とぶつかり、「タタタタ」が崩れるため
 * (2026-09-13 オーナー指摘: 音を確認で16分のタイミングがおかしい)。
 * 拍の判定は、その拍に開始または終了が16分の位置(x.25 / x.75)にある音があるかどうか。
 * 再生とハイライトの両方がこの結果を使う(ズレ防止)。
 */
export function swingNotes<T extends SwingNote>(notes: T[], sw: number): T[] {
  if (sw <= 0) return notes.map((n) => ({ ...n }));
  const TICKS = 12;
  const evenBeats = new Set<number>();
  for (const n of notes) {
    const s = Math.round(n.start * TICKS);
    const e = Math.round((n.start + n.duration) * TICKS);
    for (const t of [s, e]) {
      const rel = ((t % TICKS) + TICKS) % TICKS;
      if (rel === 3 || rel === 9) evenBeats.add(Math.floor(t / TICKS));
    }
  }
  const isOffbeat = (b: number) => Math.abs((b % 1) - 0.5) < 0.02;
  const isOnbeat = (b: number) => b % 1 < 0.02 || b % 1 > 0.98;
  return notes.map((n) => {
    let start = n.start;
    let duration = n.duration;
    if (!evenBeats.has(Math.floor(start + 0.02))) {
      if (isOffbeat(start)) {
        start += sw;
        if (Math.abs(duration - 0.5) < 0.02) duration = Math.max(0.2, duration - sw);
      } else if (isOnbeat(start) && Math.abs(duration - 0.5) < 0.02) {
        duration += sw;
      }
    }
    return { ...n, start, duration };
  });
}
