// 音名・移調・スペリングの基礎ロジック(UIに依存しない純粋関数)

export const KEYS: { pc: number; name: string }[] = [
  { pc: 0, name: 'C' },
  { pc: 1, name: 'Db' },
  { pc: 2, name: 'D' },
  { pc: 3, name: 'Eb' },
  { pc: 4, name: 'E' },
  { pc: 5, name: 'F' },
  { pc: 6, name: 'Gb' },
  { pc: 7, name: 'G' },
  { pc: 8, name: 'Ab' },
  { pc: 9, name: 'A' },
  { pc: 10, name: 'Bb' },
  { pc: 11, name: 'B' },
];

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// シャープ系のキー: D, E, G, A, B。それ以外はフラット表記(ジャズの慣習)
const SHARP_KEY_PCS = new Set([2, 4, 7, 9, 11]);

export function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

export function useFlatsForKey(keyPc: number): boolean {
  return !SHARP_KEY_PCS.has(mod12(keyPc));
}

export function pcName(pc: number, flats: boolean): string {
  return (flats ? FLAT_NAMES : SHARP_NAMES)[mod12(pc)];
}

export interface NoteParts {
  letter: string; // 'C'..'B'
  accidental: '' | '#' | 'b';
  octave: number; // C4 = middle C
}

export function midiToParts(midi: number, flats: boolean): NoteParts {
  const pc = mod12(midi);
  const name = pcName(pc, flats);
  const letter = name[0];
  const accidental = (name[1] as '' | '#' | 'b') ?? '';
  // VexFlow等の表記上のオクターブは幹音の文字で決まる
  // 例: Cb4 は B3 と同音だがここでは単純に midi ベースで算出(Cb/B#は使わない)
  const octave = Math.floor(midi / 12) - 1;
  return { letter, accidental: accidental === '#' || accidental === 'b' ? accidental : '', octave };
}

export function midiToName(midi: number, flats: boolean): string {
  const p = midiToParts(midi, flats);
  const acc = p.accidental === '#' ? '♯' : p.accidental === 'b' ? '♭' : '';
  return `${p.letter}${acc}${p.octave}`;
}

const SOLFEGE: Record<string, string> = {
  C: 'ド', D: 'レ', E: 'ミ', F: 'ファ', G: 'ソ', A: 'ラ', B: 'シ',
};

export function midiToSolfege(midi: number, flats: boolean): string {
  const p = midiToParts(midi, flats);
  const acc = p.accidental === '#' ? '♯' : p.accidental === 'b' ? '♭' : '';
  return `${SOLFEGE[p.letter]}${acc}`;
}

export function pcSolfege(pc: number, flats: boolean): string {
  const name = pcName(pc, flats);
  const acc = name[1] === '#' ? '♯' : name[1] === 'b' ? '♭' : '';
  return `${SOLFEGE[name[0]]}${acc}`;
}
