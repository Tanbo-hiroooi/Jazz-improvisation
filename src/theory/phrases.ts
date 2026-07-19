// コードトーン/ガイドトーン/スケールの表示・再生用ノート生成
// リズムパターン(スウィング8分・裏拍・16分・3連符・各種シンコペーション)に対応

import { QUALITIES } from './chords';
import { mod12 } from './notes';
import type { Progression } from './progressions';

/** 生成された1音。start/duration は進行先頭からの拍数 */
export interface NoteEvent {
  /** 実音(Concert)のMIDIノート番号 */
  midi: number;
  start: number;
  duration: number;
  velocity: number;
  /** どのコードイベントに属するか(progression.chords のインデックス) */
  chordIndex: number;
  /** アーティキュレーション(省略=普通) */
  articulation?: 'accent' | 'staccato' | 'tenuto';
}

/** リックの1音: o=ルートからの半音, s=開始拍(小節内), d=拍数, v=ベロシティ */
interface LickNote {
  o: number;
  s: number;
  d: number;
  v?: number;
}

function n(o: number, s: number, d: number, v = 0.8): LickNote {
  return { o, s, d, v };
}

// ---- リズムパターン ----

export type ToneRhythmId =
  | 'basic'
  | 'swing8'
  | 'offbeat'
  | 'sixteenth'
  | 'triplet'
  | 'charleston'
  | 'reverse-charleston'
  | 'ride'
  | 'anticipation'
  | 'dotted'
  | 'comping';

export const TONE_RHYTHMS: { id: ToneRhythmId; label: string; labelEn: string; hint: string; hintEn: string; noSwing?: boolean }[] = [
  { id: 'basic', label: '基本', labelEn: 'Basic', hint: 'コードトーンは4分音符、ガイドトーンは2分音符。まずはここから。', hintEn: 'Quarter notes for chord tones, half notes for guide tones. Start here.' },
  { id: 'swing8', label: 'スウィング8分', labelEn: 'Swing 8ths', hint: '8分音符で上下する。スウィング設定と合わせて「タータ」の跳ねを体に入れる。', hintEn: 'Up and down in 8th notes. Combine with the swing setting to internalize the bounce.' },
  { id: 'offbeat', label: '裏拍', labelEn: 'Offbeats', hint: 'オモテは休符、ウラ拍だけで音をとる。メトロノームを聴きながら裏に乗る練習。', hintEn: 'Rests on the beat, notes only on the offbeats. Ride the upbeats against the metronome.' },
  { id: 'sixteenth', label: '16分', labelEn: '16ths', hint: '16分音符のダブルタイム感。16分はスウィングせず、イーブンで演奏します。', hintEn: 'Double-time feel in 16th notes. 16ths are played even, not swung.', noSwing: true },
  { id: 'triplet', label: '3連符', labelEn: 'Triplets', hint: '1拍3連のうねり。スウィングの土台になるリズム感覚。', hintEn: 'Quarter-note triplet flow — the foundation of the swing feel.' },
  { id: 'charleston', label: 'チャールストン', labelEn: 'Charleston', hint: '「ドン・(ウ)タッ」— 1拍目と2拍目のウラ。コンピングで最も使われるリズム。', hintEn: 'Beat 1 plus the “and” of 2 — the most common comping rhythm in jazz.' },
  { id: 'reverse-charleston', label: '逆チャールストン', labelEn: 'Reverse Charleston', hint: 'ウラ拍から入って3拍目へ。「(ウ)タッ・ドン」。ウラ拍から始まる感覚に慣れる。', hintEn: 'Enter on the “and” of 1, land on beat 3. Get used to starting off the beat.' },
  { id: 'ride', label: 'ライドシンバル', labelEn: 'Ride Cymbal', hint: 'ドラマーの「チーン・チッキ」パターン。1・2・2ウラ・3・4・4ウラ。ジャズのタイム感そのもの。', hintEn: 'The drummer’s “ding ding-ga” pattern: 1, 2, and-of-2, 3, 4, and-of-4. Jazz time itself.' },
  { id: 'anticipation', label: 'アンティシペーション(食い)', labelEn: 'Anticipation', hint: '次の小節の頭を4拍目のウラで「食う」。ジャズのフレーズはよく小節線をまたぐ。', hintEn: 'Anticipate the next bar on the “and” of 4. Jazz phrases love crossing the barline.' },
  { id: 'dotted', label: '付点4分(3拍またぎ)', labelEn: 'Dotted Quarters', hint: '1.5拍ごとのアクセント。4/4の中に3拍子のうねりが生まれる定番リズム。', hintEn: 'Accents every 1.5 beats — a three-against-four wave inside 4/4.' },
  { id: 'comping', label: 'コンピング・ミックス', labelEn: 'Comping Mix', hint: 'ピアニストの伴奏風に表と裏が混ざる。休符(音を出さない時間)もリズムのうち。', hintEn: 'Pianist-style comping mixing on- and off-beats. The rests are part of the rhythm too.' },
];

// ---- アルペジオの並び方(コードトーン練習用) ----

export type ArpPatternId = 'up' | 'down' | 'skip' | 'wave';

export const ARP_PATTERNS: { id: ArpPatternId; label: string; labelEn: string }[] = [
  { id: 'up', label: '上行(1-3-5-7)', labelEn: 'Up (1-3-5-7)' },
  { id: 'down', label: '下行(8-7-5-3)', labelEn: 'Down (8-7-5-3)' },
  { id: 'skip', label: '跳躍(1-5-3-7)', labelEn: 'Leap (1-5-3-7)' },
  { id: 'wave', label: '波(1-3-5-3)', labelEn: 'Wave (1-3-5-3)' },
];

/** 並び方に応じた音列(リズムの音数に合わせて循環使用する) */
function arpSeq(t: number[], id: ArpPatternId): number[] {
  const oct = 12 + t[0];
  switch (id) {
    case 'up': return [t[0], t[1], t[2], t[3], oct, t[3], t[2], t[1]];
    case 'down': return [oct, t[3], t[2], t[1], t[0], t[1], t[2], t[3]];
    case 'skip': return [t[0], t[2], t[1], t[3], t[2], oct, t[3], t[1]];
    case 'wave': return [t[0], t[1], t[2], t[1], t[2], t[3], t[2], t[1]];
  }
}

const TP = 1 / 3; // 3連符の1音分

/** 音程を持たないヒット(リズム型)。パターンによっては小節の偶奇で形が変わる */
interface Hit {
  s: number;
  d: number;
  v: number;
}

/** リズムパターンごとの打点(タイミング)。音の高さは並び方(arpSeq)が決める */
function rhythmHits(rhythm: ToneRhythmId, beats: number, parity: number): Hit[] {
  if (beats >= 4) {
    switch (rhythm) {
      case 'basic':
        return [{ s: 0, d: 1, v: 0.8 }, { s: 1, d: 1, v: 0.8 }, { s: 2, d: 1, v: 0.8 }, { s: 3, d: 1, v: 0.8 }];
      case 'swing8':
        return Array.from({ length: 8 }, (_, i) => ({ s: i * 0.5, d: 0.5, v: i % 2 ? 0.65 : 0.85 }));
      case 'offbeat':
        return [0.5, 1.5, 2.5, 3.5].map((s) => ({ s, d: 0.5, v: 0.85 }));
      case 'sixteenth':
        return [
          { s: 0, d: 0.25, v: 0.85 }, { s: 0.25, d: 0.25, v: 0.7 }, { s: 0.5, d: 0.25, v: 0.75 }, { s: 0.75, d: 0.25, v: 0.7 },
          { s: 1, d: 1, v: 0.9 },
          { s: 2, d: 0.25, v: 0.85 }, { s: 2.25, d: 0.25, v: 0.7 }, { s: 2.5, d: 0.25, v: 0.75 }, { s: 2.75, d: 0.25, v: 0.7 },
          { s: 3, d: 1, v: 0.85 },
        ];
      case 'triplet':
        return [
          { s: 0, d: TP, v: 0.85 }, { s: TP, d: TP, v: 0.7 }, { s: 2 * TP, d: TP, v: 0.7 },
          { s: 1, d: TP, v: 0.85 }, { s: 1 + TP, d: TP, v: 0.7 }, { s: 1 + 2 * TP, d: TP, v: 0.7 },
          { s: 2, d: TP, v: 0.85 }, { s: 2 + TP, d: TP, v: 0.7 }, { s: 2 + 2 * TP, d: TP, v: 0.7 },
          { s: 3, d: 1, v: 0.85 },
        ];
      case 'charleston':
        return [{ s: 0, d: 1.5, v: 0.9 }, { s: 1.5, d: 1.5, v: 0.8 }, { s: 3, d: 1, v: 0.8 }];
      case 'reverse-charleston':
        return [{ s: 0.5, d: 1.5, v: 0.85 }, { s: 2, d: 1.5, v: 0.85 }];
      case 'ride':
        return [
          { s: 0, d: 1, v: 0.85 }, { s: 1, d: 0.5, v: 0.8 }, { s: 1.5, d: 0.5, v: 0.6 },
          { s: 2, d: 1, v: 0.85 }, { s: 3, d: 0.5, v: 0.8 }, { s: 3.5, d: 0.5, v: 0.6 },
        ];
      case 'anticipation':
        return [{ s: 0, d: 1, v: 0.8 }, { s: 1, d: 1, v: 0.75 }, { s: 2, d: 1, v: 0.8 }, { s: 3.5, d: 0.5, v: 0.95 }];
      case 'dotted':
        // 1.5拍周期を2小節で一周させる(偶数小節と奇数小節で形が変わる)
        return parity === 0
          ? [{ s: 0, d: 1.5, v: 0.9 }, { s: 1.5, d: 1.5, v: 0.85 }, { s: 3, d: 1.5, v: 0.9 }]
          : [{ s: 0.5, d: 1.5, v: 0.85 }, { s: 2, d: 1.5, v: 0.9 }, { s: 3.5, d: 0.5, v: 0.85 }];
      case 'comping':
        return parity === 0
          ? [{ s: 0.5, d: 1, v: 0.85 }, { s: 2, d: 0.5, v: 0.8 }, { s: 2.5, d: 1, v: 0.85 }]
          : [{ s: 0, d: 0.5, v: 0.8 }, { s: 1.5, d: 1, v: 0.9 }, { s: 3, d: 1, v: 0.85 }];
    }
  }
  switch (rhythm) {
    case 'basic':
      return [{ s: 0, d: 1, v: 0.8 }, { s: 1, d: 1, v: 0.8 }];
    case 'swing8':
      return Array.from({ length: 4 }, (_, i) => ({ s: i * 0.5, d: 0.5, v: i % 2 ? 0.65 : 0.85 }));
    case 'offbeat':
      return [{ s: 0.5, d: 0.5, v: 0.85 }, { s: 1.5, d: 0.5, v: 0.85 }];
    case 'sixteenth':
      return [
        { s: 0, d: 0.25, v: 0.85 }, { s: 0.25, d: 0.25, v: 0.7 }, { s: 0.5, d: 0.25, v: 0.75 }, { s: 0.75, d: 0.25, v: 0.7 },
        { s: 1, d: 1, v: 0.9 },
      ];
    case 'triplet':
      return [
        { s: 0, d: TP, v: 0.85 }, { s: TP, d: TP, v: 0.7 }, { s: 2 * TP, d: TP, v: 0.7 },
        { s: 1, d: TP, v: 0.85 }, { s: 1 + TP, d: TP, v: 0.7 }, { s: 1 + 2 * TP, d: TP, v: 0.7 },
      ];
    case 'charleston':
      return [{ s: 0, d: 1, v: 0.9 }, { s: 1.5, d: 0.5, v: 0.8 }];
    case 'reverse-charleston':
      return [{ s: 0.5, d: 1.5, v: 0.85 }];
    case 'ride':
      return [{ s: 0, d: 1, v: 0.85 }, { s: 1, d: 0.5, v: 0.8 }, { s: 1.5, d: 0.5, v: 0.6 }];
    case 'anticipation':
      return [{ s: 0, d: 1, v: 0.8 }, { s: 1.5, d: 0.5, v: 0.95 }];
    case 'dotted':
      return [{ s: 0, d: 1.5, v: 0.9 }, { s: 1.5, d: 0.5, v: 0.85 }];
    case 'comping':
      return [{ s: 0.5, d: 0.5, v: 0.85 }, { s: 1, d: 1, v: 0.85 }];
  }
}

/** コードトーン練習: リズム(打点)×並び方(音列)の掛け合わせ */
function chordToneLick(t: number[], beats: number, rhythm: ToneRhythmId, parity: number, arp: ArpPatternId): LickNote[] {
  const hits = rhythmHits(rhythm, beats, parity);
  const seq = arpSeq(t, arp);
  return hits.map((h, i) => n(seq[i % seq.length], h.s, h.d, h.v));
}

/** リズム型(シンコペーション主体)のパターンかどうか */
const HIT_STYLE_RHYTHMS: ToneRhythmId[] = ['reverse-charleston', 'ride', 'anticipation', 'dotted', 'comping'];

/** ガイドトーン(2音)用のリズムパターン */
function guideToneLick(g: number[], beats: number, rhythm: ToneRhythmId, parity: number): LickNote[] {
  const [a, b] = g;
  if (HIT_STYLE_RHYTHMS.includes(rhythm)) {
    const hits = rhythmHits(rhythm, beats, parity);
    const seq = [a, b];
    return hits.map((h, i) => n(seq[i % 2], h.s, h.d, h.v));
  }
  if (beats >= 4) {
    switch (rhythm) {
      case 'basic':
        return [n(a, 0, 2, 0.85), n(b, 2, 2, 0.75)];
      case 'swing8':
        return [a, b, a, b, a, b, a, b].map((o, i) => n(o, i * 0.5, 0.5, i % 2 ? 0.6 : 0.85));
      case 'offbeat':
        return [n(a, 0.5, 0.5, 0.85), n(b, 1.5, 0.5, 0.85), n(a, 2.5, 0.5, 0.85), n(b, 3.5, 0.5, 0.85)];
      case 'sixteenth':
        // 各拍で「タタ・タ」の16分フィギュア
        return [a, b, a, b].flatMap((o, beat) => [
          n(o, beat, 0.25, 0.85), n(o, beat + 0.25, 0.25, 0.6), n(o, beat + 0.75, 0.25, 0.7),
        ]);
      case 'triplet':
        return [
          n(a, 0, TP, 0.85), n(b, TP, TP, 0.65), n(a, 2 * TP, TP, 0.65),
          n(b, 1, TP, 0.85), n(a, 1 + TP, TP, 0.65), n(b, 1 + 2 * TP, TP, 0.65),
          n(a, 2, TP, 0.85), n(b, 2 + TP, TP, 0.65), n(a, 2 + 2 * TP, TP, 0.65),
          n(b, 3, 1, 0.85),
        ];
      case 'charleston':
        return [n(a, 0, 1.5, 0.9), n(b, 1.5, 1.5, 0.8), n(a, 3, 1, 0.8)];
      default:
        return [n(a, 0, 2, 0.85), n(b, 2, 2, 0.75)];
    }
  }
  switch (rhythm) {
    case 'basic':
      return [n(a, 0, 2, 0.8)];
    case 'swing8':
      return [n(a, 0, 0.5, 0.85), n(b, 0.5, 0.5, 0.6), n(a, 1, 0.5, 0.85), n(b, 1.5, 0.5, 0.6)];
    case 'offbeat':
      return [n(a, 0.5, 0.5, 0.85), n(b, 1.5, 0.5, 0.85)];
    case 'sixteenth':
      return [
        n(a, 0, 0.25, 0.85), n(a, 0.25, 0.25, 0.6), n(a, 0.75, 0.25, 0.7),
        n(b, 1, 0.25, 0.85), n(b, 1.25, 0.25, 0.6), n(b, 1.75, 0.25, 0.7),
      ];
    case 'triplet':
      return [n(a, 0, TP, 0.85), n(b, TP, TP, 0.65), n(a, 2 * TP, TP, 0.65), n(b, 1, 1, 0.85)];
    case 'charleston':
      return [n(a, 0, 1, 0.9), n(b, 1.5, 0.5, 0.8)];
    default:
      return [n(a, 0, 2, 0.8)];
  }
}

function tonesAsNotes(prog: Progression, keyPc: number, kind: 'chord' | 'guide', rhythm: ToneRhythmId, arp: ArpPatternId = 'up'): NoteEvent[] {
  const events: NoteEvent[] = [];
  prog.chords.forEach((chord, chordIndex) => {
    const def = QUALITIES[chord.quality];
    const rootPc = mod12(keyPc + chord.rootOffset);
    let rootMidi = 60 + rootPc;
    if (rootMidi > 65) rootMidi -= 12;
    const measureStart = chord.measure * 4 + chord.beat;
    const parity = chordIndex % 2;
    let lick: LickNote[];
    if (kind === 'chord') {
      lick = chordToneLick(def.tones, chord.beats, rhythm, parity, arp);
    } else {
      // ガイドトーンは小節ごとに3度/7度の順を入れ替えてボイスリーディングを感じさせる
      const g = parity === 0 ? def.guide : [def.guide[1] - 12, def.guide[0]];
      lick = guideToneLick(g, chord.beats, rhythm, parity);
    }
    for (const note of lick) {
      events.push({
        midi: rootMidi + note.o,
        start: measureStart + note.s,
        duration: note.d,
        velocity: note.v ?? 0.8,
        chordIndex,
      });
    }
  });
  return events;
}

/** コードトーン表示用 */
export function chordTonesAsNotes(prog: Progression, keyPc: number, rhythm: ToneRhythmId = 'basic', arp: ArpPatternId = 'up'): NoteEvent[] {
  return tonesAsNotes(prog, keyPc, 'chord', rhythm, arp);
}

/** ガイドトーン表示用 */
export function guideTonesAsNotes(prog: Progression, keyPc: number, rhythm: ToneRhythmId = 'basic'): NoteEvent[] {
  return tonesAsNotes(prog, keyPc, 'guide', rhythm);
}

/**
 * アプローチノート練習: ターゲット(3度・5度・7度)に半音や上下から入るエンクロージャー。
 * 小節の偶奇で「半音下から3度→5度を上下で挟む」「半音上から7度→3度を挟む」を交互に。
 */
export function approachAsNotes(prog: Progression, keyPc: number): NoteEvent[] {
  const events: NoteEvent[] = [];
  prog.chords.forEach((chord, chordIndex) => {
    const def = QUALITIES[chord.quality];
    const rootPc = mod12(keyPc + chord.rootOffset);
    let rootMidi = 60 + rootPc;
    if (rootMidi > 65) rootMidi -= 12;
    const measureStart = chord.measure * 4 + chord.beat;
    const t3 = def.tones[1];
    const t5 = def.tones[2];
    const t7 = def.tones[3];
    let lick: LickNote[];
    if (chord.beats >= 4) {
      lick = chordIndex % 2 === 0
        ? [
            // 半音下→3度、そして5度を上下から挟む(エンクロージャー)
            n(t3 - 1, 0, 0.5, 0.7), n(t3, 0.5, 1.5, 0.9),
            n(t5 + 1, 2, 0.5, 0.7), n(t5 - 1, 2.5, 0.5, 0.7), n(t5, 3, 1, 0.9),
          ]
        : [
            // 半音上→7度、そして3度を上下から挟む
            n(t7 + 1, 0, 0.5, 0.7), n(t7, 0.5, 1.5, 0.9),
            n(t3 + 1, 2, 0.5, 0.7), n(t3 - 1, 2.5, 0.5, 0.7), n(t3, 3, 1, 0.9),
          ];
    } else {
      lick = [n(t3 - 1, 0, 0.5, 0.7), n(t3, 0.5, 1.5, 0.9)];
    }
    for (const note of lick) {
      events.push({ midi: rootMidi + note.o, start: measureStart + note.s, duration: note.d, velocity: note.v ?? 0.8, chordIndex });
    }
  });
  return events;
}

/**
 * ターゲット(ボイスリーディング)練習: 各コードで3度→7度と置き、
 * 4拍目に「次のコードの3度への半音アプローチ」を置いて着地の瞬間を体で覚える。
 */
export function targetAsNotes(prog: Progression, keyPc: number): NoteEvent[] {
  const events: NoteEvent[] = [];
  prog.chords.forEach((chord, chordIndex) => {
    const def = QUALITIES[chord.quality];
    const rootPc = mod12(keyPc + chord.rootOffset);
    let rootMidi = 60 + rootPc;
    if (rootMidi > 65) rootMidi -= 12;
    const measureStart = chord.measure * 4 + chord.beat;
    const cur3 = rootMidi + def.tones[1];
    const cur7 = rootMidi + def.tones[3];

    // 次のコード(最後はループして先頭)の3度を、現在の7度の近くのオクターブに置く
    const next = prog.chords[(chordIndex + 1) % prog.chords.length];
    const nextDef = QUALITIES[next.quality];
    const next3pc = mod12(keyPc + next.rootOffset + nextDef.tones[1]);
    let next3 = 60 + next3pc;
    while (next3 - cur7 > 6) next3 -= 12;
    while (cur7 - next3 > 6) next3 += 12;
    // 7度がターゲットより上なら半音上から、下なら半音下から入る
    const approach = next3 + (cur7 >= next3 ? 1 : -1);

    if (chord.beats >= 4) {
      events.push(
        { midi: cur3, start: measureStart, duration: 2, velocity: 0.85, chordIndex },
        { midi: cur7, start: measureStart + 2, duration: 1, velocity: 0.8, chordIndex },
        { midi: approach, start: measureStart + 3, duration: 1, velocity: 0.75, chordIndex },
      );
    } else {
      events.push(
        { midi: cur3, start: measureStart, duration: 1, velocity: 0.85, chordIndex },
        { midi: approach, start: measureStart + 1, duration: 1, velocity: 0.75, chordIndex },
      );
    }
  });
  return events;
}

/** テンション表示: 各コードの代表的なテンション(9th/11th/13th系)を2分音符で示す */
export function tensionsAsNotes(prog: Progression, keyPc: number): NoteEvent[] {
  const events: NoteEvent[] = [];
  prog.chords.forEach((chord, chordIndex) => {
    const def = QUALITIES[chord.quality];
    const rootPc = mod12(keyPc + chord.rootOffset);
    let rootMidi = 60 + rootPc;
    if (rootMidi > 65) rootMidi -= 12;
    const measureStart = chord.measure * 4 + chord.beat;
    const place = (offset: number) => {
      let m = rootMidi + offset;
      while (m > 81) m -= 12;
      return m;
    };
    if (chord.beats >= 4) {
      events.push(
        { midi: place(def.tensions[0]), start: measureStart, duration: 2, velocity: 0.85, chordIndex },
        { midi: place(def.tensions[1]), start: measureStart + 2, duration: 2, velocity: 0.8, chordIndex },
      );
    } else {
      events.push({ midi: place(def.tensions[0]), start: measureStart, duration: 2, velocity: 0.85, chordIndex });
    }
  });
  return events;
}

/** STEPが指定する単一の度数(ルート/3度/5度/7度) */
export type StepDegree = 'root' | 'third' | 'fifth' | 'seventh';
const DEGREE_TONE_INDEX: Record<StepDegree, number> = { root: 0, third: 1, fifth: 2, seventh: 3 };

/**
 * コードごとに指定した度数を1音だけ鳴らす練習用ノート生成。
 * path が1要素なら全コードで同じ度数(ルート練習・3度練習など)、
 * 複数要素ならコードを跨いで循環し(ガイドトーンの経路など)、直前の音から近いオクターブへ配置する。
 */
export type DegreePathRhythm = ToneRhythmId | 'offbeat8';

export function degreePathAsNotes(prog: Progression, keyPc: number, path: StepDegree[], rhythm: DegreePathRhythm = 'basic'): NoteEvent[] {
  const events: NoteEvent[] = [];
  let prevMidi: number | null = null;
  prog.chords.forEach((chord, chordIndex) => {
    const degree = path[chordIndex % path.length];
    const def = QUALITIES[chord.quality];
    const rootPc = mod12(keyPc + chord.rootOffset);
    const offset = def.tones[DEGREE_TONE_INDEX[degree]];
    let midi = 60 + mod12(rootPc + offset);
    if (prevMidi !== null) {
      while (midi - prevMidi > 6) midi -= 12;
      while (prevMidi - midi > 6) midi += 12;
    } else if (midi > 65) {
      midi -= 12;
    }
    prevMidi = midi;

    const measureStart = chord.measure * 4 + chord.beat;
    const beats = chord.beats;
    let hits: LickNote[];
    if (rhythm === 'offbeat') {
      const s = beats >= 4 ? 1 : 0.5;
      hits = [n(0, s, beats - s, 0.85)];
    } else if (rhythm === 'charleston' && beats >= 4) {
      hits = [n(0, 0, 1.5, 0.9), n(0, 2.5, 1.5, 0.8)];
    } else if (rhythm === 'swing8' && beats >= 4) {
      hits = Array.from({ length: 8 }, (_, i) => n(0, i * 0.5, 0.5, i % 2 ? 0.65 : 0.85));
    } else if (rhythm === 'offbeat8' && beats >= 4) {
      hits = [0.5, 1.5, 2.5, 3.5].map((s) => n(0, s, 0.5, 0.85));
    } else if (rhythm === 'anticipation' && beats >= 4) {
      // 4拍目のウラで「食って」次の小節の頭まで伸ばす(小節線をまたぐタイの見本)
      hits = [n(0, 0, 1, 0.8), n(0, 2, 1, 0.8), n(0, 3.5, 1.5, 0.95)];
    } else if (rhythm === 'triplet' && beats >= 4) {
      const TP3 = 1 / 3;
      hits = [
        n(0, 0, TP3, 0.85), n(0, TP3, TP3, 0.7), n(0, 2 * TP3, TP3, 0.7),
        n(0, 1, 1, 0.85),
        n(0, 2, TP3, 0.85), n(0, 2 + TP3, TP3, 0.7), n(0, 2 + 2 * TP3, TP3, 0.7),
        n(0, 3, 1, 0.85),
      ];
    } else {
      hits = [n(0, 0, beats, 0.85)];
    }
    for (const hit of hits) {
      events.push({ midi, start: measureStart + hit.s, duration: hit.d, velocity: hit.v ?? 0.85, chordIndex });
    }
  });
  return events;
}

/** 半音(または全音)アプローチ→ターゲットの2音だけを鳴らす(STEPが「2音セット」と明言する場合用) */
export function approachPairAsNotes(prog: Progression, keyPc: number, targetDegree: StepDegree = 'third', from: 'below' | 'above' = 'below'): NoteEvent[] {
  const events: NoteEvent[] = [];
  prog.chords.forEach((chord, chordIndex) => {
    const def = QUALITIES[chord.quality];
    const rootPc = mod12(keyPc + chord.rootOffset);
    let rootMidi = 60 + rootPc;
    if (rootMidi > 65) rootMidi -= 12;
    const target = rootMidi + def.tones[DEGREE_TONE_INDEX[targetDegree]];
    const approach = from === 'below' ? target - 1 : target + 1;
    const measureStart = chord.measure * 4 + chord.beat;
    const beats = chord.beats;
    events.push(
      { midi: approach, start: measureStart, duration: Math.min(0.5, beats), velocity: 0.7, chordIndex },
      { midi: target, start: measureStart + Math.min(0.5, beats), duration: Math.max(beats - 0.5, 0.5), velocity: 0.9, chordIndex },
    );
  });
  return events;
}

/** 上→下→ターゲットの3音セット(エンクロージャー) */
export function enclosureAsNotes(prog: Progression, keyPc: number, targetDegree: StepDegree = 'third'): NoteEvent[] {
  const events: NoteEvent[] = [];
  prog.chords.forEach((chord, chordIndex) => {
    const def = QUALITIES[chord.quality];
    const rootPc = mod12(keyPc + chord.rootOffset);
    let rootMidi = 60 + rootPc;
    if (rootMidi > 65) rootMidi -= 12;
    const target = rootMidi + def.tones[DEGREE_TONE_INDEX[targetDegree]];
    const measureStart = chord.measure * 4 + chord.beat;
    const beats = chord.beats;
    if (beats >= 2) {
      events.push(
        { midi: target + 1, start: measureStart, duration: 0.5, velocity: 0.7, chordIndex },
        { midi: target - 1, start: measureStart + 0.5, duration: 0.5, velocity: 0.7, chordIndex },
        { midi: target, start: measureStart + 1, duration: beats - 1, velocity: 0.9, chordIndex },
      );
    } else {
      events.push({ midi: target, start: measureStart, duration: beats, velocity: 0.85, chordIndex });
    }
  });
  return events;
}

/** 着地(現コードの3度など)+次コードへの半音アプローチ、の2音だけ(3拍保持+1拍助走) */
export function landingWithApproachAsNotes(prog: Progression, keyPc: number, landingDegree: StepDegree = 'third'): NoteEvent[] {
  const events: NoteEvent[] = [];
  prog.chords.forEach((chord, chordIndex) => {
    const def = QUALITIES[chord.quality];
    const rootPc = mod12(keyPc + chord.rootOffset);
    let rootMidi = 60 + rootPc;
    if (rootMidi > 65) rootMidi -= 12;
    const landing = rootMidi + def.tones[DEGREE_TONE_INDEX[landingDegree]];
    const measureStart = chord.measure * 4 + chord.beat;
    const beats = chord.beats;

    const next = prog.chords[(chordIndex + 1) % prog.chords.length];
    const nextDef = QUALITIES[next.quality];
    const nextTargetPc = mod12(keyPc + next.rootOffset + nextDef.tones[DEGREE_TONE_INDEX[landingDegree]]);
    let nextTarget = 60 + nextTargetPc;
    while (nextTarget - landing > 6) nextTarget -= 12;
    while (landing - nextTarget > 6) nextTarget += 12;
    const approach = nextTarget + (landing >= nextTarget ? 1 : -1);

    if (beats >= 2) {
      events.push(
        { midi: landing, start: measureStart, duration: beats - 1, velocity: 0.85, chordIndex },
        { midi: approach, start: measureStart + beats - 1, duration: 1, velocity: 0.75, chordIndex },
      );
    } else {
      events.push({ midi: landing, start: measureStart, duration: beats, velocity: 0.85, chordIndex });
    }
  });
  return events;
}

// ---- サンプルモチーフ(第5章: モチーフ/展開/シークエンス) ----
// 度数1-3-5の3音+「タン・タン・ターン」のリズムを共通の種として、
// 「音はそのままリズムだけ」「最後の音だけ」「輪郭を保って移動」の差分を厳密に作る。

export type MotifVariant = 'repeat' | 'rhythm' | 'landing' | 'alternate' | 'sequence';

/** 元のリズム: タン(1拍)・タン(1拍)・ターン(2拍) */
const MOTIF_RHYTHM: { s: number; d: number; v: number }[] = [
  { s: 0, d: 1, v: 0.85 }, { s: 1, d: 1, v: 0.8 }, { s: 2, d: 2, v: 0.9 },
];
/** リズム変化: 音順は同じまま「ターン・タッ・ターン」(開始時刻と音価だけ変える) */
const MOTIF_RHYTHM_VAR: { s: number; d: number; v: number }[] = [
  { s: 0, d: 1.5, v: 0.9 }, { s: 1.5, d: 0.5, v: 0.75 }, { s: 2, d: 2, v: 0.9 },
];

export function sampleMotifAsNotes(prog: Progression, keyPc: number, variant: MotifVariant): NoteEvent[] {
  const events: NoteEvent[] = [];
  // 種の音: 最初のコードの1-3-5度(固定。コードが変わっても動かさない)
  const first = prog.chords[0];
  const firstDef = QUALITIES[first.quality];
  const firstRootPc = mod12(keyPc + first.rootOffset);
  let firstRoot = 60 + firstRootPc;
  if (firstRoot > 65) firstRoot -= 12;
  const seedPitches = [firstRoot + firstDef.tones[0], firstRoot + firstDef.tones[1], firstRoot + firstDef.tones[2]];
  // 着地変化: 最後の音(5度)だけ7度に変える。他はまったく同じ
  const landingPitches = [seedPitches[0], seedPitches[1], firstRoot + firstDef.tones[3]];

  prog.chords.forEach((chord, chordIndex) => {
    if (chord.beats < 4) return; // このモチーフは4拍の小節が前提(第5章はii-V-Iのみ)
    const measureStart = chord.measure * 4 + chord.beat;

    let pitches = seedPitches;
    let rhythm = MOTIF_RHYTHM;
    if (variant === 'rhythm') {
      rhythm = MOTIF_RHYTHM_VAR;
    } else if (variant === 'landing') {
      pitches = landingPitches;
    } else if (variant === 'alternate') {
      // そのまま → リズム変化 → そのまま → 着地変化
      const mode = chord.measure % 4;
      if (mode === 1) rhythm = MOTIF_RHYTHM_VAR;
      else if (mode === 3) pitches = landingPitches;
    } else if (variant === 'sequence') {
      // 度数輪郭(1-3-5)とリズムはそのまま、各コードのコードトーンへ平行移動
      const def = QUALITIES[chord.quality];
      const rootPc = mod12(keyPc + chord.rootOffset);
      let rootMidi = 60 + rootPc;
      if (rootMidi > 65) rootMidi -= 12;
      pitches = [rootMidi + def.tones[0], rootMidi + def.tones[1], rootMidi + def.tones[2]];
    }

    rhythm.forEach((r, i) => {
      events.push({ midi: pitches[i], start: measureStart + r.s, duration: r.d, velocity: r.v, chordIndex });
    });
  });
  return events;
}

/**
 * ブルースリフの固定譜例: ルート→♭3→4→♭5→5→♭7 を使った1小節リフを各小節で反復。
 * 「3度と5度を少し下げるとブルースになる」を音で体験するための教材。
 */
export function bluesRiffAsNotes(prog: Progression, keyPc: number): NoteEvent[] {
  const events: NoteEvent[] = [];
  prog.chords.forEach((chord, chordIndex) => {
    if (chord.beats < 4) return;
    const rootPc = mod12(keyPc + chord.rootOffset);
    let rootMidi = 60 + rootPc;
    if (rootMidi > 65) rootMidi -= 12;
    const measureStart = chord.measure * 4 + chord.beat;
    // リフ: ルート(1拍) ♭3→4(8分×2) 5(1拍) ♭7→5(8分×2)
    const riff: { o: number; s: number; d: number; v: number }[] = [
      { o: 0, s: 0, d: 1, v: 0.9 },
      { o: 3, s: 1, d: 0.5, v: 0.8 },
      { o: 5, s: 1.5, d: 0.5, v: 0.75 },
      { o: 7, s: 2, d: 1, v: 0.85 },
      { o: 10, s: 3, d: 0.5, v: 0.8 },
      { o: 7, s: 3.5, d: 0.5, v: 0.75 },
    ];
    for (const n2 of riff) {
      events.push({ midi: rootMidi + n2.o, start: measureStart + n2.s, duration: n2.d, velocity: n2.v, chordIndex });
    }
  });
  return events;
}

/** ブルーノート紹介用: ルート→3度→♭3→ルートを長めに(明→暗の変化を聴く) */
export function blueNoteDemoAsNotes(prog: Progression, keyPc: number): NoteEvent[] {
  const events: NoteEvent[] = [];
  prog.chords.forEach((chord, chordIndex) => {
    if (chord.beats < 4) return;
    const def = QUALITIES[chord.quality];
    const rootPc = mod12(keyPc + chord.rootOffset);
    let rootMidi = 60 + rootPc;
    if (rootMidi > 65) rootMidi -= 12;
    const measureStart = chord.measure * 4 + chord.beat;
    events.push(
      { midi: rootMidi, start: measureStart, duration: 1, velocity: 0.85, chordIndex },
      { midi: rootMidi + def.tones[1], start: measureStart + 1, duration: 1, velocity: 0.85, chordIndex },
      { midi: rootMidi + 3, start: measureStart + 2, duration: 2, velocity: 0.9, chordIndex },
    );
  });
  return events;
}

/** 「使える音」表示用: 各コードのおすすめスケールを8分音符で上行(1小節=スケール7音+オクターブ上のルート) */
export function scaleAsNotes(prog: Progression, keyPc: number): NoteEvent[] {
  const events: NoteEvent[] = [];
  prog.chords.forEach((chord, chordIndex) => {
    const def = QUALITIES[chord.quality];
    const rootPc = mod12(keyPc + chord.rootOffset);
    let rootMidi = 60 + rootPc;
    if (rootMidi > 65) rootMidi -= 12;
    const measureStart = chord.measure * 4 + chord.beat;
    // 4拍コードはスケール全音+オクターブ、2拍コードはコードトーンのみ
    const seq = chord.beats >= 4 ? [...def.scale, 12] : def.tones;
    seq.forEach((o, i) => {
      events.push({
        midi: rootMidi + o,
        start: measureStart + i * 0.5,
        duration: 0.5,
        velocity: 0.75,
        chordIndex,
      });
    });
  });
  return events;
}
