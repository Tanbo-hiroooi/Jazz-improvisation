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
  /** 音符(休符を除く)の最大個数。超える追加操作を禁止する */
  maxNoteCount?: number;
  /** 音符(休符を除く)の最小個数 */
  minNoteCount?: number;
  /** 合計拍数がちょうど4拍でなければならない */
  requireExactBeats?: boolean;
  /** 最低1つは使用しなければならない音価 */
  requiredDurations?: EventDuration[];
  /** 音程・休符化を変更できないイベントのインデックス(位置の移動・削除もこのSTEPでは禁止) */
  lockedEventIndexes?: number[];
  /** 条件未達成でも「音を確認」を許可するか(省略時はfalse) */
  allowPartialPlayback?: boolean;
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

export function noteCount(events: PhraseEvent[]): number {
  return events.filter((e) => e.type === 'note').length;
}

/** レベル + 音数上限(STEPのmaxNotes)を組み合わせたルールを作る */
export function rulesWithMaxNotes(level: EditorLevel, maxNotes?: number): PhraseEditorRules {
  const base = rulesForLevel(level);
  return maxNotes !== undefined ? { ...base, maxNoteCount: maxNotes } : base;
}

/**
 * STEPの操作課題。「形式条件を満たしている」と「課題を実行した」は別物で、
 * 初期フレーズとの意味的な差分(IDは無視)で判定する。
 * - any-change: 初期状態から1箇所以上の変更(固定音は比較から除外)
 * - reorder: 音の内容(multiset)は同じまま、並び順が変わっている
 * - choose-notes: 音の内容(multiset)そのものが変わっている
 * - move-beats: 音の内容は同じまま、鳴る拍位置または並びが変わっている
 * - change-rhythm: リズム(type/音価の並び・音符の開始拍)が変わっている
 */
export type StepAction = 'any-change' | 'reorder' | 'choose-notes' | 'move-beats' | 'change-rhythm';

/** STEPデータ(courses.tsのStepEditable)からルールを組み立てるための入力 */
export interface StepRuleConfig {
  level: EditorLevel;
  maxNotes?: number;
  minNotes?: number;
  requiredRestCount?: number;
  requireExactBeats?: boolean;
  requiredDurations?: EventDuration[];
  allowedDurations?: EventDuration[];
  lockedEventIndexes?: number[];
  allowPartialPlayback?: boolean;
  /** このSTEPで実行すべき操作(初期フレーズとの差分で判定) */
  requiredAction?: StepAction;
}

/**
 * STEP固有の条件(§3)をレベルの既定ルールに合成する。
 * lockedEventIndexesがある場合、並べ替え・追加・削除・複製は
 * インデックスのずれで固定位置が崩れるため一律禁止する。
 */
export function buildStepRules(cfg: StepRuleConfig): PhraseEditorRules {
  const base = rulesForLevel(cfg.level);
  const locked = !!cfg.lockedEventIndexes && cfg.lockedEventIndexes.length > 0;
  return {
    allowedDurations: cfg.allowedDurations ?? base.allowedDurations,
    allowRests: base.allowRests,
    allowReorder: locked ? false : base.allowReorder,
    allowAdd: locked ? false : base.allowAdd,
    allowDelete: locked ? false : base.allowDelete,
    allowDuplicate: locked ? false : base.allowDuplicate,
    allowOctaveChange: base.allowOctaveChange,
    requiredRestCount: cfg.requiredRestCount ?? base.requiredRestCount,
    maxNoteCount: cfg.maxNotes,
    minNoteCount: cfg.minNotes,
    requireExactBeats: cfg.requireExactBeats,
    requiredDurations: cfg.requiredDurations,
    lockedEventIndexes: cfg.lockedEventIndexes,
    allowPartialPlayback: cfg.allowPartialPlayback,
  };
}

/** 固定位置(lockedEventIndexes)の音を、指定した度数(allowedPitchesのインデックス)へ強制する */
export function applyLockedPitches(
  events: PhraseEvent[],
  lockedEventIndexes: number[] | undefined,
  lockedPitchIndexes: number[] | undefined,
  allowedPitches: AllowedPitch[],
): PhraseEvent[] {
  if (!lockedEventIndexes || !lockedPitchIndexes) return events;
  return events.map((e, i) => {
    const pos = lockedEventIndexes.indexOf(i);
    if (pos === -1) return e;
    const pitch = allowedPitches[lockedPitchIndexes[pos]];
    if (!pitch) return e;
    return { ...e, type: 'note' as const, midi: pitch.midi };
  });
}

/** STEPルールの検証エラー1件 */
export interface StepValidationError {
  code: string;
  message: { ja: string; en: string };
  /** trueなら「音を確認」も禁止する(拍数超過など、鳴らすと誤解を生む状態) */
  blocksPlayback: boolean;
}

/**
 * 検証結果。「再生できるか」「形式条件を満たしたか」「課題操作を実行したか」は別の判定。
 * - playbackAllowed: 音を確認/Startを押せるか(操作課題の未達は再生を妨げない)
 * - structureCompleted: 拍数・音数・休符・音価などの形式条件を満たしたか
 * - actionCompleted: 並べ替え・選び直しなどの操作課題を実行したか
 * - stepCompleted = structureCompleted && actionCompleted(次のSTEP・レッスン完了の判定に使う)
 */
export interface StepValidationResult {
  structureCompleted: boolean;
  actionCompleted: boolean;
  stepCompleted: boolean;
  playbackAllowed: boolean;
  errors: StepValidationError[];
}

// ---- 操作課題の判定(初期フレーズとの意味的な比較。イベントIDは無視) ----

const noteMidis = (events: PhraseEvent[]): number[] =>
  events.filter((e) => e.type === 'note' && e.midi !== undefined).map((e) => e.midi!);

/** 各音符の開始拍(休符・音価から導出) */
const noteOnsets = (events: PhraseEvent[]): number[] => {
  let t = 0;
  const out: number[] = [];
  for (const e of events) {
    if (e.type === 'note') out.push(t);
    t += DURATION_BEATS[e.duration];
  }
  return out;
};

/** リズムだけの署名: type と音価の並び(音の高さは含まない) */
const timingSignature = (events: PhraseEvent[]): string =>
  events.map((e) => `${e.type}:${e.duration}`).join('|');

/** フレーズ全体の署名: type・MIDI・音価の並び(IDは含まない) */
const phraseSignature = (events: PhraseEvent[]): string =>
  events.map((e) => `${e.type}:${e.type === 'note' ? e.midi : 'r'}:${e.duration}`).join('|');

const multisetEqual = (a: number[], b: number[]): boolean =>
  a.length === b.length && [...a].sort((x, y) => x - y).join(',') === [...b].sort((x, y) => x - y).join(',');

/** 操作課題を実行済みかを、現在のイベント列と初期イベント列の比較で判定する */
export function checkStepAction(
  action: StepAction,
  events: PhraseEvent[],
  initial: PhraseEvent[],
  lockedEventIndexes?: number[],
): boolean {
  switch (action) {
    case 'reorder': {
      // 音の内容は保ったまま、並び順だけが変わっている
      const cur = noteMidis(events);
      const ini = noteMidis(initial);
      return multisetEqual(cur, ini) && cur.join(',') !== ini.join(',');
    }
    case 'choose-notes':
      // 音の内容(multiset)そのものが変わっている(並べ替えだけでは未達成)
      return !multisetEqual(noteMidis(events), noteMidis(initial));
    case 'move-beats': {
      // 音の内容は保ったまま、鳴る拍位置または並びが変わっている
      if (!multisetEqual(noteMidis(events), noteMidis(initial))) return false;
      return (
        noteOnsets(events).join(',') !== noteOnsets(initial).join(',') ||
        noteMidis(events).join(',') !== noteMidis(initial).join(',')
      );
    }
    case 'change-rhythm':
      // リズム(type・音価の並び、つまり音符の開始拍)が変わっている
      return timingSignature(events) !== timingSignature(initial);
    case 'any-change':
    default: {
      // 固定音(ロック位置)は比較から除外する: 固定音以外を1箇所以上編集したか
      if (lockedEventIndexes && lockedEventIndexes.length > 0) {
        const strip = (evs: PhraseEvent[]) => evs.filter((_, i) => !lockedEventIndexes.includes(i));
        return phraseSignature(strip(events)) !== phraseSignature(strip(initial));
      }
      return phraseSignature(events) !== phraseSignature(initial);
    }
  }
}

/** 操作課題の表示ラベル(チェックリスト用・短文) */
export const STEP_ACTION_LABEL: Record<StepAction, { ja: string; en: string }> = {
  'any-change': { ja: '初期状態から1箇所以上変更する', en: 'Change something from the starting phrase' },
  reorder: { ja: '音の順番を並べ替える', en: 'Reorder the notes' },
  'choose-notes': { ja: '音を1つ以上選び直す', en: 'Re-choose at least one pitch' },
  'move-beats': { ja: '音の置かれる拍をずらす', en: 'Shift which beats the notes fall on' },
  'change-rhythm': { ja: 'リズム(音価・休符)を変える', en: 'Change the rhythm (durations/rests)' },
};

/** 操作課題が未達成のときの説明メッセージ */
const STEP_ACTION_ERROR: Record<StepAction, { ja: string; en: string }> = {
  'any-change': { ja: '初期状態から1箇所以上変更してください。', en: 'Make at least one change from the starting phrase.' },
  reorder: { ja: '音の順番を並べ替えてください(音の内容はそのまま)。', en: 'Reorder the notes (keep the same notes).' },
  'choose-notes': { ja: '音を1つ以上選び直してください。', en: 'Re-choose at least one pitch.' },
  'move-beats': { ja: '順番を変えるか、音の鳴る拍をずらしてください(音は同じまま)。', en: 'Reorder or shift which beats the notes fall on (same notes).' },
  'change-rhythm': { ja: '音の並びは保ったまま、リズム(音価・休符)を変えてください。', en: 'Keep the line but change the rhythm (durations and rests).' },
};

const DUR_LABEL: Record<EventDuration, { ja: string; en: string }> = {
  half: { ja: '2分音符', en: 'a half note' },
  quarter: { ja: '4分音符', en: 'a quarter note' },
  eighth: { ja: '8分音符', en: 'an 8th note' },
};

/**
 * STEP固有ルールに対する編集結果の検証(§3の共通バリデーション)。
 * initialEvents を渡すと、requiredAction(操作課題)も合わせて判定する。
 * 操作課題の未達は playbackAllowed に影響しない(初期状態の音を確認するのは常に正当)。
 */
export function validateStepPhrase(
  events: PhraseEvent[],
  cfg: StepRuleConfig,
  initialEvents?: PhraseEvent[],
): StepValidationResult {
  const errors: StepValidationError[] = [];
  const beats = totalBeats(events);
  const notes = noteCount(events);
  const rests = restCount(events);
  // 途中再生許可がないSTEPでは、形式条件未達成の時点で再生も止める
  const soft = !cfg.allowPartialPlayback;

  if (cfg.requireExactBeats && Math.abs(beats - 4) > 0.001) {
    errors.push({
      code: 'beats',
      message: {
        ja: `合計を4拍にしてください。現在${beats}拍です。`,
        en: `Make the total exactly 4 beats — it’s currently ${beats}.`,
      },
      blocksPlayback: true,
    });
  }
  if (cfg.maxNotes !== undefined && notes > cfg.maxNotes) {
    errors.push({
      code: 'maxNotes',
      message: { ja: `音符が多すぎます(最大${cfg.maxNotes}個)。`, en: `Too many notes (max ${cfg.maxNotes}).` },
      blocksPlayback: true,
    });
  }
  if (cfg.minNotes !== undefined && notes < cfg.minNotes) {
    const diff = cfg.minNotes - notes;
    errors.push({
      code: 'minNotes',
      message: { ja: `音符をあと${diff}個追加してください。`, en: `Add ${diff} more note(s).` },
      blocksPlayback: soft,
    });
  }
  if (cfg.requiredRestCount !== undefined && rests < cfg.requiredRestCount) {
    const diff = cfg.requiredRestCount - rests;
    errors.push({
      code: 'rest',
      message: { ja: `休符をあと${diff}つ入れてください。`, en: `Add ${diff} more rest(s).` },
      blocksPlayback: soft,
    });
  }
  for (const d of cfg.requiredDurations ?? []) {
    if (!events.some((e) => e.duration === d)) {
      const label = DUR_LABEL[d];
      errors.push({
        code: `duration-${d}`,
        message: { ja: `${label.ja}を最低1つ使ってください。`, en: `Use at least one ${label.en}.` },
        blocksPlayback: soft,
      });
    }
  }

  const structureCompleted = errors.length === 0;

  // 操作課題(§2): 形式条件とは独立に、初期フレーズからの意味的差分で判定する
  let actionCompleted = true;
  if (cfg.requiredAction && initialEvents) {
    actionCompleted = checkStepAction(cfg.requiredAction, events, initialEvents, cfg.lockedEventIndexes);
    if (!actionCompleted) {
      errors.push({ code: 'action', message: STEP_ACTION_ERROR[cfg.requiredAction], blocksPlayback: false });
    }
  }

  return {
    structureCompleted,
    actionCompleted,
    stepCompleted: structureCompleted && actionCompleted,
    playbackAllowed: errors.every((e) => !e.blocksPlayback),
    errors,
  };
}

/** 編集イベントの音がすべて使用可能音(pitch class)の範囲内かを検証する(キー変更後の防御) */
export function phraseMatchesPalette(events: PhraseEvent[], pitches: AllowedPitch[]): boolean {
  const pcs = new Set(pitches.map((p) => mod12(p.midi)));
  return events.every((e) => e.type === 'rest' || (e.midi !== undefined && pcs.has(mod12(e.midi))));
}

/**
 * ルールに応じた初期フレーズ。maxNoteCountがある場合は音符をなるべく均等に配置し、
 * 残りを休符で埋めて4拍ちょうどにする(例: 2音なら「タン・休み・タン・休み」)。
 */
export function initialPhraseForRules(pitches: AllowedPitch[], rules: PhraseEditorRules): PhraseEvent[] {
  if (rules.maxNoteCount === undefined || pitches.length === 0) return initialPhrase(pitches);
  const slots = 4;
  const n = Math.max(1, Math.min(rules.maxNoteCount, slots));
  const noteSlots = new Set<number>();
  for (let i = 0; i < n; i++) noteSlots.add(Math.floor((i * slots) / n));
  return Array.from({ length: slots }, (_, i) =>
    noteSlots.has(i)
      ? { id: newEventId(), type: 'note' as const, midi: pitches[i % pitches.length].midi, duration: 'quarter' as const }
      : { id: newEventId(), type: 'rest' as const, duration: 'quarter' as const },
  );
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
