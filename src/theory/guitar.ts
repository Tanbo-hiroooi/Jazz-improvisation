// ギターTAB: チューニング定義と、実音MIDI列 → 弦・フレットへの変換
// 方針(MVP): 指定ポジション(フレット範囲)内で、前の音から近い弦・フレットを選ぶ

export type GuitarPosition = 'auto' | 'open' | '3' | '5' | '7' | '9';

export const GUITAR_POSITIONS: GuitarPosition[] = ['auto', 'open', '3', '5', '7', '9'];

export interface GuitarTuning {
  id: string;
  name: string;
  /** 1弦→6弦の開放弦MIDI(E4 B3 G3 D3 A2 E2) */
  strings: number[];
}

/** 将来のチューニング拡張を見据えてデータとして管理 */
export const STANDARD_TUNING: GuitarTuning = {
  id: 'standard',
  name: 'Standard (E A D G B E)',
  strings: [64, 59, 55, 50, 45, 40],
};

export interface TabPosition {
  /** 弦番号(1=最高音弦) */
  str: number;
  fret: number;
}

const MAX_FRET = 14;

/** ポジション → 使用フレット範囲 */
function fretWindow(position: GuitarPosition): [number, number] {
  switch (position) {
    case 'open': return [0, 4];
    case '3': return [3, 7];
    case '5': return [5, 9];
    case '7': return [7, 11];
    case '9': return [9, 13];
    default: return [0, MAX_FRET];
  }
}

function candidatesFor(midi: number, lo: number, hi: number, openStrings: boolean, tuning: GuitarTuning): TabPosition[] {
  const out: TabPosition[] = [];
  tuning.strings.forEach((open, i) => {
    const fret = midi - open;
    if (fret < 0 || fret > MAX_FRET) return;
    if (fret === 0 && !openStrings) return;
    // 開放弦は設定で許可されていればポジション外でも候補にする
    if (fret !== 0 && (fret < lo || fret > hi)) return;
    out.push({ str: i + 1, fret });
  });
  return out;
}

/**
 * 実音MIDIの並びをTAB(弦・フレット)へ変換する。
 * 1. 音域外はオクターブ移動で演奏可能域に収める
 * 2. ポジション範囲内の候補から、前の音に近い弦・フレットを選ぶ
 * 3. 範囲内に候補がなければ全フレットに広げる
 */
export function midiSeqToTab(
  midis: number[],
  position: GuitarPosition = 'auto',
  openStrings = true,
  tuning: GuitarTuning = STANDARD_TUNING,
): TabPosition[] {
  const [lo, hi] = fretWindow(position);
  const lowest = tuning.strings[tuning.strings.length - 1] + (openStrings ? 0 : 1);
  const highest = tuning.strings[0] + hi;
  // 前の音の初期値: ポジションの中心あたり
  let prev: TabPosition = { str: 3, fret: position === 'auto' || position === 'open' ? 2 : lo + 2 };

  return midis.map((rawMidi) => {
    let midi = rawMidi;
    while (midi < lowest) midi += 12;
    while (midi > highest && midi - 12 >= lowest) midi -= 12;

    let cands = candidatesFor(midi, lo, hi, openStrings, tuning);
    if (cands.length === 0) cands = candidatesFor(midi, 0, MAX_FRET, openStrings, tuning);
    if (cands.length === 0) {
      // 演奏不能(理論上ここには来ない): 1弦最終フレットに丸める
      return { str: 1, fret: Math.max(0, Math.min(MAX_FRET, midi - tuning.strings[0])) };
    }

    let best = cands[0];
    let bestScore = Infinity;
    for (const c of cands) {
      const score =
        Math.abs(c.fret - prev.fret) +
        0.7 * Math.abs(c.str - prev.str) +
        (c.fret === 0 && position !== 'open' && position !== 'auto' ? 3 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = c;
      }
    }
    prev = best;
    return best;
  });
}
