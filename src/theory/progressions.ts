// コード進行の定義(キーに依存しない相対表現)

import type { Quality } from './chords';

export interface ChordEvent {
  /** 進行先頭からの小節番号(0始まり) */
  measure: number;
  /** 小節内の開始拍(0始まり) */
  beat: number;
  /** 持続拍数 */
  beats: number;
  /** キーのルートからの半音数 */
  rootOffset: number;
  quality: Quality;
}

export type ProgressionId =
  | 'ii-V-I'
  | 'minor-ii-V-I'
  | 'blues'
  | 'I-vi-ii-V'
  | 'iii-vi-ii-V'
  | 'autumn-leaves'
  | 'minor-blues'
  | 'custom';

export interface Progression {
  id: ProgressionId;
  label: string;
  labelEn: string;
  measures: number;
  chords: ChordEvent[];
  description: string;
  descriptionEn: string;
}

export const PROGRESSIONS: Progression[] = [
  {
    id: 'ii-V-I',
    label: 'ii-V-I 練習',
    labelEn: 'ii-V-I Practice',
    measures: 4,
    description:
      'ジャズで最も重要な進行。Dm7→G7→Cmaj7(キーCの場合)。3度と7度のガイドトーンが半音・全音でなめらかにつながるのを感じましょう。',
    descriptionEn: 'The most important progression in jazz: Dm7→G7→Cmaj7 (in C). Feel how the 3rds and 7ths connect smoothly by half and whole steps.',
    chords: [
      { measure: 0, beat: 0, beats: 4, rootOffset: 2, quality: 'm7' },
      { measure: 1, beat: 0, beats: 4, rootOffset: 7, quality: '7' },
      { measure: 2, beat: 0, beats: 4, rootOffset: 0, quality: 'maj7' },
      { measure: 3, beat: 0, beats: 4, rootOffset: 0, quality: 'maj7' },
    ],
  },
  {
    id: 'minor-ii-V-I',
    label: 'マイナー ii-V-I 練習',
    labelEn: 'Minor ii-V-I Practice',
    measures: 4,
    description:
      'マイナーキーのii-V-I。Dm7♭5→G7(♭9)→Cm7(キーCmの場合)。♭9の響きとマイナーへの解決を耳で覚えましょう。',
    descriptionEn: 'The minor-key ii-V-I: Dm7♭5→G7(♭9)→Cm7 (in Cm). Learn the ♭9 color and the resolution to minor by ear.',
    chords: [
      { measure: 0, beat: 0, beats: 4, rootOffset: 2, quality: 'm7b5' },
      { measure: 1, beat: 0, beats: 4, rootOffset: 7, quality: '7b9' },
      { measure: 2, beat: 0, beats: 4, rootOffset: 0, quality: 'm7' },
      { measure: 3, beat: 0, beats: 4, rootOffset: 0, quality: 'm7' },
    ],
  },
  {
    id: 'blues',
    label: 'ジャズブルース練習',
    labelEn: 'Jazz Blues (12 bars)',
    measures: 12,
    description:
      '12小節のジャズブルース(キーCの場合 C7 F7 C7 C7 | F7 F7 C7 A7 | Dm7 G7 C7-A7 Dm7-G7)。9〜10小節目のii-Vと、最後のターンアラウンドがポイントです。',
    descriptionEn: '12-bar jazz blues (in C: C7 F7 C7 C7 | F7 F7 C7 A7 | Dm7 G7 C7-A7 Dm7-G7). Focus on the ii-V in bars 9–10 and the final turnaround.',
    chords: [
      { measure: 0, beat: 0, beats: 4, rootOffset: 0, quality: '7' },
      { measure: 1, beat: 0, beats: 4, rootOffset: 5, quality: '7' },
      { measure: 2, beat: 0, beats: 4, rootOffset: 0, quality: '7' },
      { measure: 3, beat: 0, beats: 4, rootOffset: 0, quality: '7' },
      { measure: 4, beat: 0, beats: 4, rootOffset: 5, quality: '7' },
      { measure: 5, beat: 0, beats: 4, rootOffset: 5, quality: '7' },
      { measure: 6, beat: 0, beats: 4, rootOffset: 0, quality: '7' },
      { measure: 7, beat: 0, beats: 4, rootOffset: 9, quality: '7' },
      { measure: 8, beat: 0, beats: 4, rootOffset: 2, quality: 'm7' },
      { measure: 9, beat: 0, beats: 4, rootOffset: 7, quality: '7' },
      { measure: 10, beat: 0, beats: 2, rootOffset: 0, quality: '7' },
      { measure: 10, beat: 2, beats: 2, rootOffset: 9, quality: '7' },
      { measure: 11, beat: 0, beats: 2, rootOffset: 2, quality: 'm7' },
      { measure: 11, beat: 2, beats: 2, rootOffset: 7, quality: '7' },
    ],
  },
  {
    id: 'I-vi-ii-V',
    label: '循環進行(I-vi-ii-V)',
    labelEn: 'Turnaround (I-vi-ii-V)',
    measures: 4,
    description:
      '定番の循環進行。Cmaj7→Am7→Dm7→G7(キーCの場合)。無限にループできるので、コードが変わる瞬間に音を切り替える練習に最適です。',
    descriptionEn: 'The classic turnaround: Cmaj7→Am7→Dm7→G7 (in C). Loops forever — perfect for switching notes exactly when the chord changes.',
    chords: [
      { measure: 0, beat: 0, beats: 4, rootOffset: 0, quality: 'maj7' },
      { measure: 1, beat: 0, beats: 4, rootOffset: 9, quality: 'm7' },
      { measure: 2, beat: 0, beats: 4, rootOffset: 2, quality: 'm7' },
      { measure: 3, beat: 0, beats: 4, rootOffset: 7, quality: '7' },
    ],
  },
  {
    id: 'iii-vi-ii-V',
    label: '逆循環(iii-vi-ii-V)',
    labelEn: 'iii-vi-ii-V',
    measures: 4,
    description:
      'Em7→A7→Dm7→G7(キーCの場合)。マイナーコードとセブンスが交互に来るので、コードごとの3度の違いを聴き分ける練習になります。',
    descriptionEn: 'Em7→A7→Dm7→G7 (in C). Minor and dominant chords alternate, training your ear to hear each chord’s 3rd.',
    chords: [
      { measure: 0, beat: 0, beats: 4, rootOffset: 4, quality: 'm7' },
      { measure: 1, beat: 0, beats: 4, rootOffset: 9, quality: '7' },
      { measure: 2, beat: 0, beats: 4, rootOffset: 2, quality: 'm7' },
      { measure: 3, beat: 0, beats: 4, rootOffset: 7, quality: '7' },
    ],
  },
  {
    id: 'autumn-leaves',
    label: '枯葉進行(8小節)',
    labelEn: 'Autumn Leaves (8 bars)',
    measures: 8,
    description:
      'メジャーとマイナーのii-V-Iがつながった8小節。キーB♭にすると「枯葉」と同じ Cm7→F7→B♭maj7→E♭maj7→Am7♭5→D7(♭9)→Gm7 になります。',
    descriptionEn: 'Eight bars linking a major and a minor ii-V-I. In B♭ it matches “Autumn Leaves”: Cm7→F7→B♭maj7→E♭maj7→Am7♭5→D7(♭9)→Gm7.',
    chords: [
      { measure: 0, beat: 0, beats: 4, rootOffset: 2, quality: 'm7' },
      { measure: 1, beat: 0, beats: 4, rootOffset: 7, quality: '7' },
      { measure: 2, beat: 0, beats: 4, rootOffset: 0, quality: 'maj7' },
      { measure: 3, beat: 0, beats: 4, rootOffset: 5, quality: 'maj7' },
      { measure: 4, beat: 0, beats: 4, rootOffset: 11, quality: 'm7b5' },
      { measure: 5, beat: 0, beats: 4, rootOffset: 4, quality: '7b9' },
      { measure: 6, beat: 0, beats: 4, rootOffset: 9, quality: 'm7' },
      { measure: 7, beat: 0, beats: 4, rootOffset: 9, quality: 'm7' },
    ],
  },
  {
    id: 'minor-blues',
    label: 'マイナーブルース(12小節)',
    labelEn: 'Minor Blues (12 bars)',
    measures: 12,
    description:
      '12小節のマイナーブルース。Cm7を中心に、9小節目のA♭7→G7(♭9)の流れが最大の聴かせどころです(キーCの場合)。',
    descriptionEn: '12-bar minor blues around Cm7 (in C). The A♭7→G7(♭9) move in bar 9 is the highlight.',
    chords: [
      { measure: 0, beat: 0, beats: 4, rootOffset: 0, quality: 'm7' },
      { measure: 1, beat: 0, beats: 4, rootOffset: 0, quality: 'm7' },
      { measure: 2, beat: 0, beats: 4, rootOffset: 0, quality: 'm7' },
      { measure: 3, beat: 0, beats: 4, rootOffset: 0, quality: 'm7' },
      { measure: 4, beat: 0, beats: 4, rootOffset: 5, quality: 'm7' },
      { measure: 5, beat: 0, beats: 4, rootOffset: 5, quality: 'm7' },
      { measure: 6, beat: 0, beats: 4, rootOffset: 0, quality: 'm7' },
      { measure: 7, beat: 0, beats: 4, rootOffset: 0, quality: 'm7' },
      { measure: 8, beat: 0, beats: 4, rootOffset: 8, quality: '7' },
      { measure: 9, beat: 0, beats: 4, rootOffset: 7, quality: '7b9' },
      { measure: 10, beat: 0, beats: 4, rootOffset: 0, quality: 'm7' },
      { measure: 11, beat: 0, beats: 4, rootOffset: 7, quality: '7b9' },
    ],
  },
];

export function getProgression(id: ProgressionId): Progression {
  return PROGRESSIONS.find((p) => p.id === id)!;
}

/** 指定位置(小節・拍)で鳴っているコードイベントを返す */
export function chordAt(prog: Progression, measure: number, beat: number): ChordEvent {
  let current = prog.chords[0];
  for (const c of prog.chords) {
    if (c.measure < measure || (c.measure === measure && c.beat <= beat)) {
      current = c;
    }
  }
  return current;
}
