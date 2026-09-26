// リズム譜: 第1章のレッスンを「1枚の長い譜面」で表すための文字列表記と変換
//
// 1小節を空白区切りのトークンで書く。1トークン = 1つの音符か休符。
//   長さ : 1=全 / 2.=付点2分 / 2 / 4.=付点4分 / 4 / 8.=付点8分 / 8 / 16 / t8=3連8分(1/3拍) / t4=3連4分(2/3拍)
//   休符 : 先頭に r(例: r4, r8, rt8)
//   高さ : :R :3 :5 :7 :8 (その小節のコードのルート/3度/5度/7度/1オクターブ上のルート。省略時は R)
//   表情 : /a アクセント /s 短く /t 長く /g ゴースト(組み合わせ可: /as = 短く強く)
//   タイ : 末尾に _ を付けると次の音符とつながる(小節をまたいでもよい)
// 例: "r8 8 8 8:3 8:5/a 8 8 8/as"
//
// 各小節は必ず4拍ちょうど(テストで全レッスンを検証する)。

import { QUALITIES } from './chords';
import { mod12 } from './notes';
import type { NoteEvent } from './phrases';
import { chordAt, type Progression } from './progressions';

export interface RhythmToken {
  beats: number;
  rest: boolean;
  degree: 'R' | '3' | '5' | '7' | '8';
  accent: boolean;
  staccato: boolean;
  tenuto: boolean;
  ghost: boolean;
  tie: boolean;
}

const DURATIONS: Record<string, number> = {
  '1': 4, '2.': 3, '2': 2, '4.': 1.5, '4': 1, '8.': 0.75, '8': 0.5, '16': 0.25, t8: 1 / 3, t4: 2 / 3,
};

/** 1トークンを読む。書式が不正なら例外(データの誤りを早く見つけるため) */
export function parseToken(src: string): RhythmToken {
  const m = /^(r?)(t8|t4|2\.|4\.|8\.|1|2|4|8|16)(?::(R|3|5|7|8))?(?:\/([astg]+))?(_?)$/.exec(src);
  if (!m) throw new Error(`rhythm token: ${src}`);
  const arts = m[4] ?? '';
  return {
    beats: DURATIONS[m[2]],
    rest: m[1] === 'r',
    degree: (m[3] as RhythmToken['degree']) ?? 'R',
    accent: arts.includes('a'),
    staccato: arts.includes('s'),
    tenuto: arts.includes('t'),
    ghost: arts.includes('g'),
    tie: m[5] === '_',
  };
}

export function parseBar(bar: string): RhythmToken[] {
  return bar.trim().split(/\s+/).map(parseToken);
}

/** 小節の長さ(拍)。4になっていなければデータの誤り */
export function barBeats(bar: string): number {
  return parseBar(bar).reduce((sum, t) => sum + t.beats, 0);
}

/** 口ずさみ(スキャット)の音。表情と拍の位置から決める */
function scat(t: RhythmToken, start: number, lang: 'ja' | 'en'): string {
  const ja = lang === 'ja';
  const off = Math.abs(start - Math.round(start)) > 0.01;
  if (t.ghost) return ja ? '(ドゥ)' : '(doo)';
  if (t.staccato) return t.accent ? (ja ? 'バッ' : 'bap') : (ja ? 'ダッ' : 'dat');
  if (t.accent) return ja ? 'バ' : 'bah';
  if (t.beats >= 1) return ja ? 'ダー' : 'daah';
  return off ? (ja ? 'ダ' : 'dah') : (ja ? 'ドゥ' : 'doo');
}

/** 小節の並び(全小節)を実音の NoteEvent にする。高さはその時点のコードから決める */
export function rhythmNotes(bars: string[], progression: Progression, keyPc: number, lang: 'ja' | 'en'): NoteEvent[] {
  const notes: NoteEvent[] = [];
  let pos = 0;
  let pending: NoteEvent | null = null; // タイでつながっている途中の音
  bars.forEach((bar) => {
    for (const t of parseBar(bar)) {
      const start = pos;
      // 3連(1/3拍)の足し算で誤差がたまらないよう、1/12拍の格子に丸める
      pos = Math.round((pos + t.beats) * 12) / 12;
      if (t.rest) { pending = null; continue; }
      if (pending) {
        // タイの続き: 長さだけ足す(高さ・表情は最初の音のまま)
        pending.duration += t.beats;
        if (!t.tie) pending = null;
        continue;
      }
      const measure = Math.floor(start / 4 + 1e-6);
      const chord = chordAt(progression, measure, start - measure * 4);
      const chordIndex = progression.chords.indexOf(chord);
      const rootPc = mod12(keyPc + chord.rootOffset);
      let root = 48 + rootPc;
      while (root < 55) root += 12; // G3〜F#4 あたりに置く
      const tones = QUALITIES[chord.quality].tones;
      const offset = t.degree === 'R' ? 0 : t.degree === '8' ? 12 : tones[{ 3: 1, 5: 2, 7: 3 }[t.degree]];
      const note: NoteEvent = {
        midi: root + offset,
        start,
        duration: t.beats,
        // 普通の音は控えめにして、アクセントとゴーストの差が耳で分かるようにする
        velocity: t.ghost ? 0.25 : 0.6,
        chordIndex: Math.max(0, chordIndex),
        label: scat(t, start, lang),
      };
      if (t.staccato) note.articulation = 'staccato';
      else if (t.tenuto) note.articulation = 'tenuto';
      else if (t.accent) note.articulation = 'accent';
      if (t.accent && note.articulation !== 'accent') note.accent = true;
      if (t.ghost) note.ghost = true;
      notes.push(note);
      if (t.tie) pending = note;
    }
  });
  return notes;
}
