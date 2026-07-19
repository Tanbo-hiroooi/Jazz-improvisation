// 拍グリッド: フレーズ編集の中核データモデル(UI非依存)
// 1小節=4拍。各拍は分割数(1=4分/2=8分/3=3連/4=16分)を持ち、
// セルは「●鳴らす(attack)/○休む(rest)/→のばす(hold)」のどれか。
// 合計は構造上つねにちょうど4拍×小節数になるため、拍数の計算・検証が不要。

import { QUALITIES, type Quality } from './chords';
import { mod12, pcName } from './notes';
import type { NoteEvent } from './phrases';
import type { Progression } from './progressions';

export type Division = 1 | 2 | 3 | 4;
export type CellState = 'attack' | 'rest' | 'hold';
export type Articulation = 'accent' | 'staccato' | 'tenuto';

export interface GridCell {
  state: CellState;
  /** attack時のみ: 実音MIDI */
  midi?: number;
  /** attack時のみ: アーティキュレーション(省略=普通) */
  articulation?: Articulation;
}

export interface GridBeat {
  division: Division;
  /** cells.length === division */
  cells: GridCell[];
}

export interface GridBar {
  /** 常に4拍 */
  beats: GridBeat[];
}

export interface GridPhrase {
  bars: GridBar[];
}

// ---- 生成 ----

const restCell = (): GridCell => ({ state: 'rest' });

export function emptyBeat(division: Division): GridBeat {
  return { division, cells: Array.from({ length: division }, restCell) };
}

export function emptyGrid(bars: number, division: Division = 2): GridPhrase {
  return { bars: Array.from({ length: bars }, () => ({ beats: Array.from({ length: 4 }, () => emptyBeat(division)) })) };
}

// ---- 使用できる音(パレット) ----

export type GridMaterial = 'root-only' | 'chord-tone' | 'guide-tone' | 'blues';

/** ブルーススケール(ルートからの半音): 1 ♭3 4 ♭5 5 ♭7 */
const BLUES_OFFSETS = [0, 3, 5, 6, 7, 10];
const BLUES_DEGREES = ['Root', '♭3', '4th', '♭5', '5th', '♭7'];

export interface PalettePitch {
  midi: number;
  label: string;  // 例: E4
  degree: string; // 例: 3rd
}

/** ▲▼で移動できる音域(実音)。楽器を問わず無理のない範囲 */
export const PITCH_RANGE = { min: 50, max: 84 };

/**
 * コード×素材から、▲▼で選べる音を音域全体にわたって昇順で返す。
 * (旧UIのように1オクターブ分のボタンではなく、矢印移動用の連続リスト)
 */
export function paletteFor(keyPc: number, rootOffset: number, quality: Quality, material: GridMaterial, flats: boolean): PalettePitch[] {
  const def = QUALITIES[quality];
  const rootPc = mod12(keyPc + rootOffset);
  let offsets: number[];
  let degrees: string[];
  switch (material) {
    case 'root-only': offsets = [0]; degrees = ['Root']; break;
    case 'guide-tone': offsets = def.guide; degrees = def.guide.map((g) => def.toneDegrees[def.tones.indexOf(g)] ?? ''); break;
    case 'blues': offsets = BLUES_OFFSETS; degrees = BLUES_DEGREES; break;
    case 'chord-tone': default: offsets = def.tones; degrees = def.toneDegrees; break;
  }
  const out: PalettePitch[] = [];
  for (let midi = PITCH_RANGE.min; midi <= PITCH_RANGE.max; midi++) {
    const rel = mod12(midi - rootPc);
    const idx = offsets.indexOf(rel);
    if (idx >= 0) {
      out.push({ midi, label: `${pcName(mod12(midi), flats)}${Math.floor(midi / 12) - 1}`, degree: degrees[idx] });
    }
  }
  return out;
}

/** 小節番号 → その小節のコード(先頭拍のコードを採用) */
export function chordForBar(progression: Progression, bar: number): { rootOffset: number; quality: Quality } {
  const inBar = progression.chords.filter((c) => c.measure === bar % progression.measures);
  const c = inBar.length > 0 ? inBar[0] : progression.chords[0];
  return { rootOffset: c.rootOffset, quality: c.quality };
}

/** 小節ごとのパレット一覧 */
export function palettesForGrid(progression: Progression, keyPc: number, bars: number, material: GridMaterial, flats: boolean): PalettePitch[][] {
  return Array.from({ length: bars }, (_, b) => {
    const ch = chordForBar(progression, b);
    return paletteFor(keyPc, ch.rootOffset, ch.quality, material, flats);
  });
}

/** パレット内で現在音の次(上/下)の音を返す。端では動かない */
export function stepPitch(palette: PalettePitch[], midi: number, dir: 1 | -1): number {
  if (palette.length === 0) return midi;
  if (dir === 1) {
    const next = palette.find((p) => p.midi > midi);
    return next ? next.midi : midi;
  }
  for (let i = palette.length - 1; i >= 0; i--) {
    if (palette[i].midi < midi) return palette[i].midi;
  }
  return midi;
}

/** パレットの中央付近(60前後)の音。新しいattackの初期値に使う */
export function defaultPitch(palette: PalettePitch[]): number {
  if (palette.length === 0) return 60;
  let best = palette[0].midi;
  for (const p of palette) {
    if (Math.abs(p.midi - 62) < Math.abs(best - 62)) best = p.midi;
  }
  return best;
}

// ---- 初期グリッド ----

export type GridInitial = 'empty' | 'quarters' | 'halves';

/**
 * 初期グリッド。
 * - empty: 全休符(リズム課題向け。タップした分だけ進む)
 * - quarters: 各拍4分音符。素材の音を下から順に割り当て(コードトーン=1-3-5-7)
 * - halves: 2分音符×2(ガイドトーン向け: 3度→7度)
 */
export function initialGrid(
  mode: GridInitial,
  bars: number,
  progression: Progression,
  keyPc: number,
  material: GridMaterial,
  flats: boolean,
  division: Division = 2,
): GridPhrase {
  const grid = emptyGrid(bars, division);
  if (mode === 'empty') return grid;
  const palettes = palettesForGrid(progression, keyPc, bars, material, flats);
  for (let b = 0; b < bars; b++) {
    const pal = palettes[b];
    // ルート(57以上で最初のRoot)から上へ1-3-5-7…と並べる
    let startIdx = pal.findIndex((p) => p.midi >= 57 && p.degree === 'Root');
    if (startIdx < 0) startIdx = Math.max(0, pal.findIndex((p) => p.midi >= 58));
    const pick = (i: number) => pal[Math.min(startIdx + i, pal.length - 1)]?.midi ?? defaultPitch(pal);
    if (mode === 'quarters') {
      for (let beat = 0; beat < 4; beat++) {
        grid.bars[b].beats[beat].cells[0] = { state: 'attack', midi: pick(beat) };
      }
    } else {
      grid.bars[b].beats[0].cells[0] = { state: 'attack', midi: pick(0) };
      grid.bars[b].beats[1].cells[0] = { state: 'hold' };
      grid.bars[b].beats[2].cells[0] = { state: 'attack', midi: pick(1) };
      grid.bars[b].beats[3].cells[0] = { state: 'hold' };
    }
  }
  return grid;
}

// ---- NoteEvent への変換(表示・再生・TABは既存機構をそのまま使う) ----

/**
 * グリッド → NoteEvent[]。
 * attackで音が始まり、直後のholdで伸び、restまたは次のattackで終わる。
 * holdは拍・小節をまたいで続く(シンコペーション・食い)。
 * 音の直後でないhold(先頭や休符の後)はrestとして扱う。
 */
export function gridToNoteEvents(grid: GridPhrase): NoteEvent[] {
  const out: NoteEvent[] = [];
  let open: NoteEvent | null = null;
  let t = 0;
  for (let b = 0; b < grid.bars.length; b++) {
    for (const beat of grid.bars[b].beats) {
      const cellDur = 1 / beat.division;
      for (const cell of beat.cells) {
        if (cell.state === 'attack' && cell.midi !== undefined) {
          open = { midi: cell.midi, start: t, duration: cellDur, velocity: 0.85, chordIndex: b, articulation: cell.articulation };
          out.push(open);
        } else if (cell.state === 'hold' && open) {
          open.duration += cellDur;
        } else {
          open = null;
        }
        t += cellDur;
      }
    }
  }
  return out;
}

/** attackセルの通し番号(NoteEvent順と一致)→ 再生ハイライト用の位置。[bar, beat, cell] */
export function attackPositions(grid: GridPhrase): [number, number, number][] {
  const out: [number, number, number][] = [];
  grid.bars.forEach((bar, b) => {
    bar.beats.forEach((beat, bt) => {
      beat.cells.forEach((cell, c) => {
        if (cell.state === 'attack' && cell.midi !== undefined) out.push([b, bt, c]);
      });
    });
  });
  return out;
}

// ---- 集計・署名(検証と課題判定に使う) ----

export function attackCount(grid: GridPhrase): number {
  return attackPositions(grid).length;
}

/** 音が鳴っていない拍数の合計(hold中は鳴っている扱い) */
export function restBeatsTotal(grid: GridPhrase): number {
  let total = 0;
  let sounding = false;
  for (const bar of grid.bars) {
    for (const beat of bar.beats) {
      const cellDur = 1 / beat.division;
      for (const cell of beat.cells) {
        if (cell.state === 'attack' && cell.midi !== undefined) sounding = true;
        else if (cell.state === 'rest' || (cell.state === 'hold' && !sounding)) sounding = false;
        if (!sounding) total += cellDur;
      }
    }
  }
  return total;
}

/** 小節ごとの無音拍数 */
export function restBeatsPerBar(grid: GridPhrase): number[] {
  // 小節ごとに独立して計算(小節頭で前の音が続いている場合は鳴っている扱い)
  const events = gridToNoteEvents(grid);
  return grid.bars.map((_, b) => {
    const start = b * 4;
    const end = start + 4;
    let sounding = 0;
    for (const e of events) {
      const s = Math.max(e.start, start);
      const en = Math.min(e.start + e.duration, end);
      if (en > s) sounding += en - s;
    }
    return 4 - sounding;
  });
}

/** 小節線をまたぐ音(食い)があるか */
export function hasCrossBarHold(grid: GridPhrase): boolean {
  return gridToNoteEvents(grid).some((e) => {
    const endBar = Math.floor((e.start + e.duration - 0.001) / 4);
    return endBar > Math.floor(e.start / 4 + 0.001);
  });
}

/** 拍をまたぐ音(シンコペーション: 裏で入って次の拍へ伸びる等)があるか */
export function hasCrossBeatHold(grid: GridPhrase): boolean {
  return gridToNoteEvents(grid).some((e) => {
    const startBeat = Math.floor(e.start + 0.001);
    const endBeat = Math.floor(e.start + e.duration - 0.001);
    return e.start - startBeat > 0.01 && endBeat > startBeat;
  });
}

/** 裏拍(8分・16分の弱位置)から始まる音があるか */
export function hasOffbeatAttack(grid: GridPhrase): boolean {
  return gridToNoteEvents(grid).some((e) => {
    const frac = e.start - Math.floor(e.start + 0.001);
    return frac > 0.01;
  });
}

export function usesTriplet(grid: GridPhrase): boolean {
  return grid.bars.some((bar) => bar.beats.some((bt) => bt.division === 3 && bt.cells.some((c) => c.state === 'attack')));
}

export function usesSixteenth(grid: GridPhrase): boolean {
  return grid.bars.some((bar) => bar.beats.some((bt) => bt.division === 4 && bt.cells.some((c) => c.state === 'attack')));
}

export function usesArticulation(grid: GridPhrase): boolean {
  return grid.bars.some((bar) => bar.beats.some((bt) => bt.cells.some((c) => c.state === 'attack' && !!c.articulation)));
}

/** リズムだけの署名(音の高さ・アーティキュレーションを含まない) */
export function rhythmSignature(grid: GridPhrase): string {
  return grid.bars
    .map((bar) => bar.beats.map((bt) => `${bt.division}:${bt.cells.map((c) => c.state[0]).join('')}`).join(','))
    .join('|');
}

/** 音の高さ列の署名(attackのMIDI列) */
export function pitchSignature(grid: GridPhrase): string {
  const out: number[] = [];
  grid.bars.forEach((bar) => bar.beats.forEach((bt) => bt.cells.forEach((c) => {
    if (c.state === 'attack' && c.midi !== undefined) out.push(c.midi);
  })));
  return out.join(',');
}

/** アーティキュレーション込みの完全署名 */
export function fullSignature(grid: GridPhrase): string {
  return grid.bars
    .map((bar) => bar.beats.map((bt) => `${bt.division}:${bt.cells.map((c) => c.state === 'attack' ? `a${c.midi}${c.articulation?.[0] ?? ''}` : c.state[0]).join('.')}`).join(','))
    .join('|');
}

/** すべてのattackが各小節のパレット内にあるか(キー変更後の防御) */
export function gridMatchesPalettes(grid: GridPhrase, palettes: PalettePitch[][]): boolean {
  for (let b = 0; b < grid.bars.length; b++) {
    const pcs = new Set((palettes[b] ?? []).map((p) => mod12(p.midi)));
    for (const beat of grid.bars[b].beats) {
      for (const cell of beat.cells) {
        if (cell.state === 'attack' && cell.midi !== undefined && !pcs.has(mod12(cell.midi))) return false;
      }
    }
  }
  return true;
}

// ---- 検証(形式条件+操作課題) ----

export interface GridConditions {
  minNotes?: number;
  maxNotes?: number;
  /** 合計の無音拍数の下限 */
  minRestBeats?: number;
  /** 各小節に最低これだけの無音拍(例: 1) */
  minRestBeatsPerBar?: number;
  /** 小節線をまたぐ音(食い)を1回以上 */
  requireCrossBarHold?: boolean;
  /** 裏拍から始まる音を1回以上 */
  requireOffbeatAttack?: boolean;
  /** 3連の拍を使う */
  requireTriplet?: boolean;
  /** 16分の拍を使う */
  requireSixteenth?: boolean;
  /** アーティキュレーションを1つ以上使う */
  requireArticulation?: boolean;
  /** フレーズ最後の音が、その小節のコードの3度で終わる(着地の練習) */
  requireEndOn3rd?: boolean;
}

export type GridAction = 'any-change' | 'rhythm-change' | 'pitch-change';

export const GRID_ACTION_LABEL: Record<GridAction, { ja: string; en: string }> = {
  'any-change': { ja: '初期状態から1箇所以上変更する', en: 'Change something from the start' },
  'rhythm-change': { ja: 'リズムを変える', en: 'Change the rhythm' },
  'pitch-change': { ja: '音を1つ以上選び直す', en: 'Re-choose at least one pitch' },
};

export interface GridValidationError {
  code: string;
  message: { ja: string; en: string };
  /** trueなら再生も止める(現状のグリッドでは常にfalse: 拍あふれが起きないため) */
  blocksPlayback: boolean;
}

export interface GridValidationResult {
  structureCompleted: boolean;
  actionCompleted: boolean;
  stepCompleted: boolean;
  playbackAllowed: boolean;
  errors: GridValidationError[];
}

const err = (code: string, ja: string, en: string): GridValidationError => ({ code, message: { ja, en }, blocksPlayback: false });

/** 前の小節の形を次の小節へコピーする(音は度数の対応でその小節のパレットへ写す) */
export function copyBarMapped(grid: GridPhrase, fromBar: number, toBar: number, palettes: PalettePitch[][]): GridPhrase {
  const src = grid.bars[fromBar];
  const fromPal = palettes[fromBar] ?? [];
  const toPal = palettes[toBar] ?? [];
  const mapMidi = (midi: number): number => {
    const idx = fromPal.findIndex((p) => p.midi === midi);
    if (idx >= 0 && toPal[idx]) return toPal[idx].midi;
    // パレット外(通常起きない)は最も近い音へ
    let best = toPal[0]?.midi ?? midi;
    for (const p of toPal) if (Math.abs(p.midi - midi) < Math.abs(best - midi)) best = p.midi;
    return best;
  };
  const bars = grid.bars.map((b, i) => {
    if (i !== toBar) return b;
    return {
      beats: src.beats.map((bt) => ({
        division: bt.division,
        cells: bt.cells.map((c) => c.state === 'attack' && c.midi !== undefined
          ? { state: 'attack' as const, midi: mapMidi(c.midi), articulation: c.articulation }
          : { state: c.state }),
      })),
    };
  });
  return { bars };
}

export function validateGrid(
  grid: GridPhrase,
  conditions: GridConditions | undefined,
  requiredAction: GridAction | undefined,
  initial: GridPhrase,
  /** requireEndOn3rd の判定に使う(省略時はその条件を無視) */
  ctx?: { progression: Progression; keyPc: number },
): GridValidationResult {
  const errors: GridValidationError[] = [];
  const c = conditions ?? {};
  const notes = attackCount(grid);

  if (c.minNotes !== undefined && notes < c.minNotes) {
    errors.push(err('minNotes', `音符をあと${c.minNotes - notes}個置いてください。`, `Place ${c.minNotes - notes} more note(s).`));
  }
  if (c.maxNotes !== undefined && notes > c.maxNotes) {
    errors.push(err('maxNotes', `音符が多すぎます(最大${c.maxNotes}個)。`, `Too many notes (max ${c.maxNotes}).`));
  }
  if (c.minRestBeats !== undefined && restBeatsTotal(grid) < c.minRestBeats - 0.001) {
    errors.push(err('minRest', `休みを合計${c.minRestBeats}拍以上作ってください。`, `Leave at least ${c.minRestBeats} beat(s) of rest.`));
  }
  if (c.minRestBeatsPerBar !== undefined) {
    const per = restBeatsPerBar(grid);
    const bad = per.findIndex((r) => r < c.minRestBeatsPerBar! - 0.001);
    if (bad >= 0) {
      errors.push(err('restPerBar', `${bad + 1}小節目に${c.minRestBeatsPerBar}拍以上の休みを入れてください。`, `Bar ${bad + 1} needs at least ${c.minRestBeatsPerBar} beat(s) of rest.`));
    }
  }
  if (c.requireCrossBarHold && !hasCrossBarHold(grid)) {
    errors.push(err('crossBar', '「→のばす」で小節線をまたぐ音を1つ作ってください。', 'Use “hold” to carry one note across a barline.'));
  }
  if (c.requireOffbeatAttack && !hasOffbeatAttack(grid)) {
    errors.push(err('offbeat', '裏拍(拍の2番目のマス)から始まる音を1つ以上置いてください。', 'Start at least one note on an offbeat cell.'));
  }
  if (c.requireTriplet && !usesTriplet(grid)) {
    errors.push(err('triplet', '3連に切り替えた拍で音を1つ以上鳴らしてください。', 'Play at least one note in a triplet beat.'));
  }
  if (c.requireSixteenth && !usesSixteenth(grid)) {
    errors.push(err('sixteenth', '16分に切り替えた拍で音を1つ以上鳴らしてください。', 'Play at least one note in a 16th beat.'));
  }
  if (c.requireArticulation && !usesArticulation(grid)) {
    errors.push(err('artic', 'アクセント・短く・長くのどれかを1音以上に付けてください。', 'Apply accent, staccato or tenuto to at least one note.'));
  }
  if (c.requireEndOn3rd && ctx) {
    const pos = attackPositions(grid);
    const last = pos[pos.length - 1];
    let ok = false;
    if (last) {
      const cell = grid.bars[last[0]].beats[last[1]].cells[last[2]];
      const ch = chordForBar(ctx.progression, last[0]);
      const thirdPc = mod12(ctx.keyPc + ch.rootOffset + QUALITIES[ch.quality].tones[1]);
      ok = cell.midi !== undefined && mod12(cell.midi) === thirdPc;
    }
    if (!ok) {
      errors.push(err('end3rd', '最後の音を、その小節のコードの3度で終えてください。', 'End the phrase on the 3rd of that bar’s chord.'));
    }
  }

  const structureCompleted = errors.length === 0;

  let actionCompleted = true;
  if (requiredAction) {
    switch (requiredAction) {
      case 'rhythm-change': actionCompleted = rhythmSignature(grid) !== rhythmSignature(initial); break;
      case 'pitch-change': actionCompleted = pitchSignature(grid) !== pitchSignature(initial); break;
      case 'any-change': default: actionCompleted = fullSignature(grid) !== fullSignature(initial); break;
    }
    if (!actionCompleted) {
      const l = GRID_ACTION_LABEL[requiredAction];
      errors.push(err('action', `${l.ja}と完了になります。`, `${l.en} to complete this step.`));
    }
  }

  return {
    structureCompleted,
    actionCompleted,
    stepCompleted: structureCompleted && actionCompleted,
    playbackAllowed: true, // グリッドは拍あふれが起きないため、再生は常に可能
    errors,
  };
}
