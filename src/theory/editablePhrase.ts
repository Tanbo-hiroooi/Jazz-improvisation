// フレーズ作成モード: 編集可能フレーズのデータ構造とロジック(UI非依存)
// 音は実音MIDIで保持し、表示(記譜/TAB)・再生は既存機構(StaffView/engine)が担う

import { QUALITIES, type Quality } from './chords';
import { mod12, pcName } from './notes';
import type { NoteEvent } from './phrases';

export type EventDuration = 'half' | 'quarter' | 'eighth';

export const DURATION_BEATS: Record<EventDuration, number> = {
  half: 2,
  quarter: 1,
  eighth: 0.5,
};

/** 編集フレーズの1イベント(音符または休符) */
export interface PhraseEvent {
  id: string;
  type: 'note' | 'rest';
  /** 実音MIDI(休符ではundefined) */
  midi?: number;
  duration: EventDuration;
}

/** 練習の目的に応じた編集制限(§12のレベルに対応) */
export interface PhraseEditorRules {
  allowedDurations: EventDuration[];
  allowRests: boolean;
  allowReorder: boolean;
  allowAdd: boolean;
  allowDelete: boolean;
  allowDuplicate: boolean;
  allowOctaveChange: boolean;
  requiredRestCount?: number;
}

export type EditorLevel = 1 | 2 | 3 | 4;

/** 学習段階ごとの編集制限 */
export function rulesForLevel(level: EditorLevel): PhraseEditorRules {
  switch (level) {
    case 1: // 音の順番のみ
      return { allowedDurations: ['quarter'], allowRests: false, allowReorder: true, allowAdd: false, allowDelete: false, allowDuplicate: false, allowOctaveChange: false };
    case 2: // 休符を追加
      return { allowedDurations: ['quarter'], allowRests: true, allowReorder: true, allowAdd: false, allowDelete: false, allowDuplicate: false, allowOctaveChange: false, requiredRestCount: 1 };
    case 3: // リズム変更(拍を埋められるよう複製も許可)
      return { allowedDurations: ['quarter', 'eighth'], allowRests: true, allowReorder: true, allowAdd: true, allowDelete: true, allowDuplicate: true, allowOctaveChange: false };
    case 4: // 自由(1小節)
      return { allowedDurations: ['half', 'quarter', 'eighth'], allowRests: true, allowReorder: true, allowAdd: true, allowDelete: true, allowDuplicate: true, allowOctaveChange: true };
  }
}

export type PhraseMaterial = 'chord-tone' | 'guide-tone';

/** 選択できる音(度数ラベル付き) */
export interface AllowedPitch {
  midi: number;
  label: string;   // 例: E4
  degree: string;  // 例: 3rd
}

/** コードの基準ルートMIDI(既存の生成ロジックと同じ配置) */
export function chordRootMidi(keyPc: number, rootOffset: number): number {
  const rootPc = mod12(keyPc + rootOffset);
  let rootMidi = 60 + rootPc;
  if (rootMidi > 65) rootMidi -= 12;
  return rootMidi;
}

/** 練習素材(コードトーン/ガイドトーン)から使用できる音を求める */
export function allowedPitchesFor(
  keyPc: number,
  rootOffset: number,
  quality: Quality,
  material: PhraseMaterial,
  flats: boolean,
): AllowedPitch[] {
  const def = QUALITIES[quality];
  const rootMidi = chordRootMidi(keyPc, rootOffset);
  const offsets = material === 'guide-tone' ? def.guide : def.tones;
  return offsets.map((o) => {
    const midi = rootMidi + o;
    const idx = def.tones.indexOf(o);
    return {
      midi,
      label: `${pcName(mod12(midi), flats)}${Math.floor(midi / 12) - 1}`,
      degree: idx >= 0 ? def.toneDegrees[idx] : '',
    };
  });
}

let seq = 0;
export function newEventId(): string {
  seq += 1;
  return `pe-${Date.now()}-${seq}`;
}

/** 初期フレーズ: 使用できる音を4分音符で順番に並べた基本譜面 */
export function initialPhrase(pitches: AllowedPitch[]): PhraseEvent[] {
  const src = pitches.length >= 4 ? pitches.slice(0, 4) : [...pitches, ...pitches].slice(0, 4);
  return src.map((p) => ({ id: newEventId(), type: 'note' as const, midi: p.midi, duration: 'quarter' as const }));
}

export function totalBeats(events: PhraseEvent[]): number {
  return events.reduce((sum, e) => sum + DURATION_BEATS[e.duration], 0);
}

export function restCount(events: PhraseEvent[]): number {
  return events.filter((e) => e.type === 'rest').length;
}

/**
 * 編集フレーズ → 表示・再生用ノート列。
 * 休符はイベントを出さない(StaffViewが空き拍を休符として描画する)
 */
export function phraseToNoteEvents(events: PhraseEvent[]): NoteEvent[] {
  const out: NoteEvent[] = [];
  let beat = 0;
  for (const e of events) {
    const dur = DURATION_BEATS[e.duration];
    if (e.type === 'note' && e.midi !== undefined && beat < 4) {
      out.push({ midi: e.midi, start: beat, duration: Math.min(dur, 4 - beat), velocity: 0.85, chordIndex: 0 });
    }
    beat += dur;
  }
  return out;
}

/** 演奏可能な音域(実音)。楽器を問わず無理のない範囲に制限 */
export const OCTAVE_RANGE = { min: 48, max: 84 };
