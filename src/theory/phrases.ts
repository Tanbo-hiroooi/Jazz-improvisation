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

const TP = 1 / 3; // 3連符の1音分

/** 音程を持たないヒット(リズム型)。パターンによっては小節の偶奇で形が変わる */
interface Hit {
  s: number;
  d: number;
  v: number;
}

function hitPattern(rhythm: ToneRhythmId, beats: number, parity: number): Hit[] | null {
  if (beats >= 4) {
    switch (rhythm) {
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
      default:
        return null;
    }
  }
  switch (rhythm) {
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
    default:
      return null;
  }
}

/** コードトーン(4音)用のリズムパターン */
function chordToneLick(t: number[], beats: number, rhythm: ToneRhythmId, parity: number): LickNote[] {
  const oct = 12 + t[0];
  const hits = hitPattern(rhythm, beats, parity);
  if (hits) {
    // リズム型パターン: コードトーンを順番に割り当てる
    const seq = [t[0], t[1], t[2], t[3]];
    return hits.map((h, i) => n(seq[i % seq.length], h.s, h.d, h.v));
  }
  if (beats >= 4) {
    switch (rhythm) {
      case 'basic':
        return [n(t[0], 0, 1), n(t[1], 1, 1), n(t[2], 2, 1), n(t[3], 3, 1)];
      case 'swing8':
        return [t[0], t[1], t[2], t[3], oct, t[3], t[2], t[1]].map((o, i) => n(o, i * 0.5, 0.5, i % 2 ? 0.65 : 0.85));
      case 'offbeat':
        return [n(t[0], 0.5, 0.5, 0.85), n(t[1], 1.5, 0.5, 0.85), n(t[2], 2.5, 0.5, 0.85), n(t[3], 3.5, 0.5, 0.85)];
      case 'sixteenth':
        return [
          n(t[0], 0, 0.25, 0.85), n(t[1], 0.25, 0.25, 0.7), n(t[2], 0.5, 0.25, 0.75), n(t[3], 0.75, 0.25, 0.7),
          n(oct, 1, 1, 0.9),
          n(t[3], 2, 0.25, 0.85), n(t[2], 2.25, 0.25, 0.7), n(t[1], 2.5, 0.25, 0.75), n(t[0], 2.75, 0.25, 0.7),
          n(t[0], 3, 1, 0.85),
        ];
      case 'triplet':
        return [
          n(t[0], 0, TP, 0.85), n(t[1], TP, TP, 0.7), n(t[2], 2 * TP, TP, 0.7),
          n(t[1], 1, TP, 0.85), n(t[2], 1 + TP, TP, 0.7), n(t[3], 1 + 2 * TP, TP, 0.7),
          n(t[2], 2, TP, 0.85), n(t[3], 2 + TP, TP, 0.7), n(oct, 2 + 2 * TP, TP, 0.7),
          n(t[3], 3, 1, 0.85),
        ];
      case 'charleston':
        return [n(t[0], 0, 1.5, 0.9), n(t[1], 1.5, 1.5, 0.8), n(t[2], 3, 1, 0.8)];
      default:
        return [n(t[0], 0, 1), n(t[1], 1, 1), n(t[2], 2, 1), n(t[3], 3, 1)];
    }
  }
  switch (rhythm) {
    case 'basic':
      return [n(t[0], 0, 1), n(t[1], 1, 1)];
    case 'swing8':
      return [n(t[0], 0, 0.5, 0.85), n(t[1], 0.5, 0.5, 0.65), n(t[2], 1, 0.5, 0.85), n(t[3], 1.5, 0.5, 0.65)];
    case 'offbeat':
      return [n(t[0], 0.5, 0.5, 0.85), n(t[2], 1.5, 0.5, 0.85)];
    case 'sixteenth':
      return [n(t[0], 0, 0.25, 0.85), n(t[1], 0.25, 0.25, 0.7), n(t[2], 0.5, 0.25, 0.75), n(t[3], 0.75, 0.25, 0.7), n(oct, 1, 1, 0.9)];
    case 'triplet':
      return [
        n(t[0], 0, TP, 0.85), n(t[1], TP, TP, 0.7), n(t[2], 2 * TP, TP, 0.7),
        n(t[3], 1, TP, 0.85), n(t[2], 1 + TP, TP, 0.7), n(t[1], 1 + 2 * TP, TP, 0.7),
      ];
    case 'charleston':
      return [n(t[0], 0, 1, 0.9), n(t[1], 1.5, 0.5, 0.8)];
    default:
      return [n(t[0], 0, 1), n(t[1], 1, 1)];
  }
}

/** ガイドトーン(2音)用のリズムパターン */
function guideToneLick(g: number[], beats: number, rhythm: ToneRhythmId, parity: number): LickNote[] {
  const [a, b] = g;
  const hits = hitPattern(rhythm, beats, parity);
  if (hits) {
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

function tonesAsNotes(prog: Progression, keyPc: number, kind: 'chord' | 'guide', rhythm: ToneRhythmId): NoteEvent[] {
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
      lick = chordToneLick(def.tones, chord.beats, rhythm, parity);
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
export function chordTonesAsNotes(prog: Progression, keyPc: number, rhythm: ToneRhythmId = 'basic'): NoteEvent[] {
  return tonesAsNotes(prog, keyPc, 'chord', rhythm);
}

/** ガイドトーン表示用 */
export function guideTonesAsNotes(prog: Progression, keyPc: number, rhythm: ToneRhythmId = 'basic'): NoteEvent[] {
  return tonesAsNotes(prog, keyPc, 'guide', rhythm);
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
