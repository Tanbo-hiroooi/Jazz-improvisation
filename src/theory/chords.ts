// コードの構成音・ガイドトーン・スケール・度数の定義

import { mod12, pcName } from './notes';

export type Quality = 'maj7' | 'm7' | '7' | 'm7b5' | '7b9';

export interface QualityDef {
  suffix: string;
  /** ルートからの半音数: [Root, 3rd, 5th, 7th] */
  tones: number[];
  /** ガイドトーン(3度と7度) */
  guide: number[];
  toneDegrees: string[];
  scaleLabel: string;
  scaleLabelEn: string;
  /** おすすめスケールの構成(ルートからの半音数) */
  scale: number[];
  /** 代表的なテンション(ルートからの半音数、オクターブ上表記) */
  tensions: number[];
}

export const QUALITIES: Record<Quality, QualityDef> = {
  maj7: {
    suffix: 'maj7',
    tones: [0, 4, 7, 11],
    guide: [4, 11],
    toneDegrees: ['Root', '3rd', '5th', '7th'],
    scaleLabel: 'Ionian(メジャースケール)',
    scaleLabelEn: 'Ionian (major scale)',
    scale: [0, 2, 4, 5, 7, 9, 11],
    tensions: [14, 21], // 9th, 13th
  },
  m7: {
    suffix: 'm7',
    tones: [0, 3, 7, 10],
    guide: [3, 10],
    toneDegrees: ['Root', '♭3rd', '5th', '♭7th'],
    scaleLabel: 'Dorian(ドリアン)',
    scaleLabelEn: 'Dorian',
    scale: [0, 2, 3, 5, 7, 9, 10],
    tensions: [14, 17], // 9th, 11th
  },
  '7': {
    suffix: '7',
    tones: [0, 4, 7, 10],
    guide: [4, 10],
    toneDegrees: ['Root', '3rd', '5th', '♭7th'],
    scaleLabel: 'Mixolydian(ミクソリディアン)',
    scaleLabelEn: 'Mixolydian',
    scale: [0, 2, 4, 5, 7, 9, 10],
    tensions: [14, 21], // 9th, 13th
  },
  m7b5: {
    suffix: 'm7♭5',
    tones: [0, 3, 6, 10],
    guide: [3, 10],
    toneDegrees: ['Root', '♭3rd', '♭5th', '♭7th'],
    scaleLabel: 'Locrian(ロクリアン)',
    scaleLabelEn: 'Locrian',
    scale: [0, 1, 3, 5, 6, 8, 10],
    tensions: [17, 20], // 11th, ♭13th
  },
  '7b9': {
    suffix: '7(♭9)',
    tones: [0, 4, 7, 10],
    guide: [4, 10],
    toneDegrees: ['Root', '3rd', '5th', '♭7th'],
    scaleLabel: 'Mixolydian ♭9 ♭13(Hmp5↓)',
    scaleLabelEn: 'Mixolydian ♭9 ♭13 (HmP5↓)',
    scale: [0, 1, 4, 5, 7, 8, 10],
    tensions: [13, 20], // ♭9th, ♭13th
  },
};

export function chordSymbol(rootPc: number, quality: Quality, flats: boolean): string {
  return `${pcName(rootPc, flats)}${QUALITIES[quality].suffix}`;
}

const GENERIC_DEGREE: Record<number, string> = {
  0: 'R', 1: '♭9', 2: '9', 3: '♭3', 4: '3', 5: '11',
  6: '♭5', 7: '5', 8: '♭13', 9: '13', 10: '♭7', 11: '7',
};

/** ある音(midi または pc)がコードに対して何度かを返す */
export function degreeLabel(notePc: number, rootPc: number, quality: Quality): string {
  const interval = mod12(notePc - rootPc);
  const def = QUALITIES[quality];
  const idx = def.tones.indexOf(interval);
  if (idx >= 0) return def.toneDegrees[idx];
  return GENERIC_DEGREE[interval];
}
