// リズム譜: 第1章・第2章のレッスンを「1枚の長い譜面」で表すための文字列表記と変換
//
// 1小節を空白区切りのトークンで書く。1トークン = 1つの音符か休符。
//   長さ : 1=全 / 2.=付点2分 / 2 / 4.=付点4分 / 4 / 8.=付点8分 / 8 / 16 / t8=3連8分(1/3拍) / t4=3連4分(2/3拍)
//   休符 : 先頭に r(例: r4, r8, rt8)
//   高さ : :R :3 :5 :7 :8 (その小節のコードのルート/3度/5度/7度/1オクターブ上のルート。省略時は R)
//          後ろに > を付けると「次の小節のコード」の音(食いで次のコードの3度を先取りする時: 8:3>_)
//          :C はコードの音(1・3・5・7)を縦に積んだ和音。:C3 / :C7 は「その音が答え」の和音
//          (答えの音だけを鳴らして光らせ、ほかの3音は見せるだけ)
//   表情 : /a アクセント /s 短く /t 長く /g ゴースト(組み合わせ可: /as = 短く強く)
//          /n は音符の下の文字(度数)を出さない(和音から自分で3度を見つける練習など)
//          /h は答えの音: ふだんは隠し、鳴らさず、再生がその音に来た瞬間だけ光って見える(記号だけで3度を探す練習)
//          :=F5 :=C#4 :=Eb4 は音名の直接指定(キーCで書く。レッスンのキーとブロックの移調で一緒に動く)。
//          コードの音以外(経過音・半音のアプローチ)を含むフレーズに使う
//   自分の番: 小節全体を own と書くと、空の小節(4拍)になり「自分で弾く小節」として色が付く
//   タイ : 末尾に _ を付けると次の音符とつながる(小節をまたいでもよい)
// 例: "r8 8 8 8:3 8:5/a 8 8 8/as"
//
// 各小節は必ず4拍ちょうど(テストで全レッスンを検証する)。

import { QUALITIES, degreeLabel, type Quality } from './chords';
import { mod12 } from './notes';
import type { NoteEvent } from './phrases';
import { chordAt, type Progression } from './progressions';

export interface RhythmToken {
  beats: number;
  rest: boolean;
  /** C = コードの音を縦に積んだ和音 */
  degree: 'R' | '3' | '5' | '7' | '8' | 'C';
  /** 音名の直接指定(キーCでのMIDI)。sharp は ♯ で書いた音(移調しても ♯ で書く) */
  abs?: { midi: number; sharp: boolean; flat: boolean };
  /** 自分で弾く小節(own) */
  own?: boolean;
  /** 和音(C)のうち答えの音。無ければ和音全体を鳴らす */
  target?: 'R' | '3' | '5' | '7';
  /** 答えの音(隠して、来た瞬間だけ光らせる) */
  hidden: boolean;
  /** 次の小節のコードの音にする(食いの先取り) */
  next: boolean;
  accent: boolean;
  staccato: boolean;
  tenuto: boolean;
  ghost: boolean;
  /** 音符の下の文字を出さない */
  noLabel: boolean;
  tie: boolean;
}

const DURATIONS: Record<string, number> = {
  '1': 4, '2.': 3, '2': 2, '4.': 1.5, '4': 1, '8.': 0.75, '8': 0.5, '16': 0.25, t8: 1 / 3, t4: 2 / 3,
};

/** 1トークンを読む。書式が不正なら例外(データの誤りを早く見つけるため) */
const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NO_FLAGS = { next: false, accent: false, staccato: false, tenuto: false, ghost: false, noLabel: false, hidden: false, tie: false };

export function parseToken(src: string): RhythmToken {
  if (src === 'own') return { ...NO_FLAGS, beats: 4, rest: true, degree: 'R', own: true };
  // 音名の直接指定
  const am = /^(t8|t4|2\.|4\.|8\.|1|2|4|8|16):=([A-G])(#|b)?(\d)(?:\/([astg]+))?(_?)$/.exec(src);
  if (am) {
    const arts = am[5] ?? '';
    return {
      ...NO_FLAGS, beats: DURATIONS[am[1]], rest: false, degree: 'R',
      abs: { midi: 12 * (Number(am[4]) + 1) + LETTER_PC[am[2]] + (am[3] === '#' ? 1 : am[3] === 'b' ? -1 : 0), sharp: am[3] === '#', flat: am[3] === 'b' },
      accent: arts.includes('a'), staccato: arts.includes('s'), tenuto: arts.includes('t'), ghost: arts.includes('g'),
      tie: am[6] === '_',
    };
  }
  const m = /^(r?)(t8|t4|2\.|4\.|8\.|1|2|4|8|16)(?::(R|3|5|7|8|C)(R|3|5|7)?(>?))?(?:\/([astgnh]+))?(_?)$/.exec(src);
  if (!m) throw new Error(`rhythm token: ${src}`);
  const arts = m[6] ?? '';
  // 和音のタイ・隠した和音は表せない。答えの指定は和音だけ(書き間違いを早く見つける)
  if (m[3] === 'C' && (m[7] === '_' || arts.includes('h'))) throw new Error(`rhythm token: ${src}`);
  if (m[4] && m[3] !== 'C') throw new Error(`rhythm token: ${src}`);
  return {
    beats: DURATIONS[m[2]],
    rest: m[1] === 'r',
    degree: (m[3] as RhythmToken['degree']) ?? 'R',
    target: (m[4] as RhythmToken['target']) || undefined,
    hidden: arts.includes('h'),
    next: m[5] === '>',
    accent: arts.includes('a'),
    staccato: arts.includes('s'),
    tenuto: arts.includes('t'),
    ghost: arts.includes('g'),
    noLabel: arts.includes('n'),
    tie: m[7] === '_',
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

const DEGREE_INDEX = { R: 0, 3: 1, 5: 2, 7: 3, 8: 0 } as const;

/** 音符の下に出す短い度数(1 / 3 / ♭3 / 5 / ♭7 …)。コードの種類どおりの表記にする */
function degreeText(degree: Exclude<RhythmToken['degree'], 'C'>, quality: Quality): string {
  if (degree === 'R' || degree === '8') return '1';
  return QUALITIES[quality].toneDegrees[DEGREE_INDEX[degree]].replace(/(st|nd|rd|th)$/, '');
}

/**
 * 小節の並び(全小節)を実音の NoteEvent にする。高さはその時点のコードから決める。
 * labels: 音符の下に出す文字。'scat' = 口ずさみ(第1章)、'degree' = 度数(第2章)
 */
/** 「自分で弾く小節」(own)の小節番号 */
export function ownMeasures(bars: string[]): number[] {
  return bars.flatMap((bar, i) => (bar.trim() === 'own' ? [i] : []));
}

/** 小節ごとの追加情報(キーが途中で変わるフレーズ譜用) */
export interface BarKeys {
  /** その小節の移調(半音)。進行のコードも同じだけ移調されていること */
  shift: number[];
  /** その小節のキーで、ふつうの音を♭で書くか */
  flats: boolean[];
}

export function rhythmNotes(
  bars: string[], progression: Progression, keyPc: number, lang: 'ja' | 'en', labels: 'scat' | 'degree' = 'scat',
  barKeys?: BarKeys,
): NoteEvent[] {
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
      // > 付きは次の小節の頭のコード(フォームの最後なら先頭へ戻る)
      const chord = t.next
        ? chordAt(progression, (measure + 1) % progression.measures, 0)
        : chordAt(progression, measure, start - measure * 4);
      const chordIndex = progression.chords.indexOf(chord);
      const rootPc = mod12(keyPc + chord.rootOffset);
      let root = 48 + rootPc;
      while (root < 55) root += 12; // G3〜F#4 あたりに置く
      const tones = QUALITIES[chord.quality].tones;
      if (t.abs) {
        // 音名の直接指定: キーCの音を、レッスンのキー+ブロックの移調だけ動かす(-5〜+6半音に収めて音域を保つ)
        let tr = mod12(keyPc + (barKeys?.shift[measure] ?? 0));
        if (tr > 6) tr -= 12;
        const midi = t.abs.midi + tr;
        const note: NoteEvent = {
          midi, start, duration: t.beats, velocity: t.ghost ? 0.25 : 0.6, chordIndex: Math.max(0, chordIndex),
          // ♯で書いた半音のアプローチには度数を付けない(「♭13」などと出ると紛らわしい)
          label: t.abs.sharp ? '' : labels === 'degree' ? degreeLabel(mod12(midi), rootPc, chord.quality).replace(/(st|nd|rd|th)$/, '').replace(/^Root$|^R$/, '1') : scat(t, start, lang),
        };
        // ♯で書いた音(半音下からのアプローチ)は移調しても♯、♭で書いた音は♭。ふつうの音はそのキーの書き方に従う
        if (t.abs.sharp) note.flats = false;
        else if (t.abs.flat) note.flats = true;
        else if (barKeys) note.flats = barKeys.flats[measure];
        if (t.staccato) note.articulation = 'staccato';
        else if (t.tenuto) note.articulation = 'tenuto';
        else if (t.accent) note.articulation = 'accent';
        if (t.accent && note.articulation !== 'accent') note.accent = true;
        if (t.ghost) note.ghost = true;
        notes.push(note);
        if (t.tie) pending = note;
        continue;
      }
      const labelFor = (d: Exclude<RhythmToken['degree'], 'C'>) =>
        t.noLabel ? '' : labels === 'degree' ? degreeText(d, chord.quality) : scat(t, start, lang);
      if (t.degree === 'C') {
        // 縦に積んだ和音: 1・3・5・7 を同じ時刻・同じ長さで並べる(譜面では1つの和音として描く)。
        // 答え(target)があれば、その音だけを鳴らして光らせ、ほかの3音は見せるだけにする
        (['R', '3', '5', '7'] as const).forEach((d, i) => {
          const tone: NoteEvent = {
            midi: root + tones[i], start, duration: t.beats, velocity: t.target ? 0.6 : 0.45,
            chordIndex: Math.max(0, chordIndex), label: labelFor(d),
          };
          if (t.target && t.target !== d) tone.silent = true;
          if (barKeys) tone.flats = barKeys.flats[measure];
          notes.push(tone);
        });
        continue;
      }
      const offset = t.degree === 'R' ? 0 : t.degree === '8' ? 12 : tones[{ 3: 1, 5: 2, 7: 3 }[t.degree]];
      const note: NoteEvent = {
        midi: root + offset,
        start,
        duration: t.beats,
        // 普通の音は控えめにして、アクセントとゴーストの差が耳で分かるようにする
        velocity: t.ghost ? 0.25 : 0.6,
        chordIndex: Math.max(0, chordIndex),
        // 答えの音は文字も出さない(小節にはコード記号だけが見える)
        label: t.hidden ? '' : labelFor(t.degree),
      };
      if (t.hidden) note.hidden = true;
      // キーが途中で変わる譜面では、その小節のキーの書き方に合わせる(キーFで B♭ を A♯ と書かない)
      if (barKeys) note.flats = barKeys.flats[measure];
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
