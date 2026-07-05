// 楽器設定: 譜表(音部記号)と移調の定義

export type Clef = 'treble' | 'bass' | 'grand';
export type PitchMode = 'concert' | 'written';

export interface InstrumentDef {
  id: string;
  label: string;
  clefs: Clef[];
  defaultClef: Clef;
  /** 記譜音 = 実音 + writtenShift(半音)。例: B♭管は +2、E♭管(アルト)は +9 */
  writtenShift: number;
  /** 移調楽器の説明表示用 */
  transposeLabel: string;
  transposeLabelEn: string;
}

export const INSTRUMENTS: InstrumentDef[] = [
  { id: 'piano', label: 'Piano', clefs: ['grand', 'treble', 'bass'], defaultClef: 'grand', writtenShift: 0, transposeLabel: 'C(実音)', transposeLabelEn: 'C (concert pitch)' },
  { id: 'guitar', label: 'Guitar', clefs: ['treble'], defaultClef: 'treble', writtenShift: 12, transposeLabel: 'C(記譜は1オクターブ上)', transposeLabelEn: 'C (written an octave up)' },
  { id: 'bass', label: 'Bass', clefs: ['bass'], defaultClef: 'bass', writtenShift: 12, transposeLabel: 'C(記譜は1オクターブ上)', transposeLabelEn: 'C (written an octave up)' },
  { id: 'trumpet', label: 'Trumpet', clefs: ['treble'], defaultClef: 'treble', writtenShift: 2, transposeLabel: 'B♭管(長2度上に記譜)', transposeLabelEn: 'B♭ instrument (written a major 2nd up)' },
  { id: 'trombone', label: 'Trombone', clefs: ['bass'], defaultClef: 'bass', writtenShift: 0, transposeLabel: 'C(実音)', transposeLabelEn: 'C (concert pitch)' },
  { id: 'soprano-sax', label: 'Soprano Sax', clefs: ['treble'], defaultClef: 'treble', writtenShift: 2, transposeLabel: 'B♭管(長2度上に記譜)', transposeLabelEn: 'B♭ instrument (written a major 2nd up)' },
  { id: 'alto-sax', label: 'Alto Sax', clefs: ['treble'], defaultClef: 'treble', writtenShift: 9, transposeLabel: 'E♭管(長6度上に記譜)', transposeLabelEn: 'E♭ instrument (written a major 6th up)' },
  { id: 'tenor-sax', label: 'Tenor Sax', clefs: ['treble'], defaultClef: 'treble', writtenShift: 14, transposeLabel: 'B♭管(長9度上に記譜)', transposeLabelEn: 'B♭ instrument (written a major 9th up)' },
  { id: 'baritone-sax', label: 'Baritone Sax', clefs: ['treble'], defaultClef: 'treble', writtenShift: 21, transposeLabel: 'E♭管(1オクターブ+長6度上に記譜)', transposeLabelEn: 'E♭ instrument (written an octave + major 6th up)' },
  { id: 'vocal', label: 'Vocal', clefs: ['treble'], defaultClef: 'treble', writtenShift: 0, transposeLabel: 'C(実音)', transposeLabelEn: 'C (concert pitch)' },
  { id: 'other', label: 'Other', clefs: ['treble', 'bass'], defaultClef: 'treble', writtenShift: 0, transposeLabel: 'C(実音)', transposeLabelEn: 'C (concert pitch)' },
];

export function getInstrument(id: string): InstrumentDef {
  return INSTRUMENTS.find((i) => i.id === id) ?? INSTRUMENTS[0];
}

/** 表示モードに応じた移調量(半音)。Concert Pitch では常に 0 */
export function displayShift(instrument: InstrumentDef, mode: PitchMode): number {
  return mode === 'written' ? instrument.writtenShift : 0;
}
