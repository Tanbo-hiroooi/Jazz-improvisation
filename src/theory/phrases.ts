// 見本フレーズ生成エンジン
// フレーズは「コードルートからの半音オフセット」で定義し、
// キー・コード進行に合わせて実音(MIDIノート)へ展開する。

import { QUALITIES, type Quality } from './chords';
import { mod12 } from './notes';
import type { ChordEvent, Progression } from './progressions';

export type Difficulty = 'beginner' | 'guide' | 'rhythm' | 'melodic' | 'advanced';

export const DIFFICULTIES: { id: Difficulty; label: string; hint: string }[] = [
  { id: 'beginner', label: '入門', hint: 'コードトーン中心・音数少なめ。まず音の場所を覚える。(Beginner)' },
  { id: 'guide', label: 'ガイドトーン', hint: '3度と7度だけで進行をつなぐ。アドリブの背骨になるライン。(Guide Tone)' },
  { id: 'rhythm', label: 'リズム重視', hint: '音は簡単、リズムはジャズ。シンコペーションを体に入れる。(Rhythm Focus)' },
  { id: 'melodic', label: 'メロディック', hint: '経過音・半音アプローチ入り。歌えるラインを作る。(Melodic)' },
  { id: 'advanced', label: '上級', hint: 'よりジャズらしい8分音符ライン。真似して丸ごと覚えよう。(Advanced)' },
];

/** 生成された1音。start/dur は進行先頭からの拍数 */
export interface NoteEvent {
  /** 実音(Concert)のMIDIノート番号 */
  midi: number;
  /** 進行先頭からの開始拍 */
  start: number;
  /** 拍数 */
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

interface LickBank {
  /** 4拍のコード用パターン(複数バリエーション) */
  full: LickNote[][];
  /** 2拍のコード用パターン */
  half: LickNote[][];
}

// ---- リック定義ヘルパー ----

function n(o: number, s: number, d: number, v = 0.8): LickNote {
  return { o, s, d, v };
}

/** Beginner: コードトーンを4分音符で上行/下行 */
function beginnerBank(q: Quality): LickBank {
  const t = QUALITIES[q].tones;
  return {
    full: [
      [n(t[0], 0, 1), n(t[1], 1, 1), n(t[2], 2, 1), n(t[3], 3, 1)],
      [n(t[3] - 12, 0, 1), n(t[2] - 12, 1, 1), n(t[1], 2, 1, 0.75), n(t[0], 3, 1)],
      [n(t[0], 0, 1), n(t[2], 1, 1), n(t[1], 2, 1), n(t[3], 3, 1)],
      // 付点4分の連なり(基本のスウィング図形)
      [n(t[0], 0, 1.5, 0.9), n(t[1], 1.5, 1.5, 0.8), n(t[2], 3, 1, 0.8)],
    ],
    half: [
      [n(t[0], 0, 1), n(t[1], 1, 1)],
      [n(t[1], 0, 1), n(t[3] - 12, 1, 1)],
    ],
  };
}

/** Guide Tone: 3度と7度の2分音符 */
function guideBank(q: Quality): LickBank {
  const g = QUALITIES[q].guide;
  return {
    full: [
      [n(g[0], 0, 2, 0.85), n(g[1] - 12, 2, 2, 0.75)],
      [n(g[1] - 12, 0, 2, 0.85), n(g[0], 2, 2, 0.75)],
    ],
    half: [
      [n(g[0], 0, 2, 0.8)],
      [n(g[1] - 12, 0, 2, 0.8)],
    ],
  };
}

/** Rhythm Focus: 音はルート・3度・5度のみ、リズムに変化 */
function rhythmBank(q: Quality): LickBank {
  const t = QUALITIES[q].tones;
  return {
    full: [
      // チャールストン(1拍目+2拍目ウラ)
      [n(t[0], 0, 1.5, 0.9), n(t[1], 1.5, 1.5, 0.8), n(t[0], 3, 1, 0.7)],
      // ウラ拍スタート
      [n(t[1], 0.5, 1, 0.85), n(t[2], 2, 0.5, 0.8), n(t[1], 2.5, 1, 0.9), n(t[0], 3.5, 0.5, 0.75)],
      // 8分の駆け上がり+休符
      [n(t[0], 0, 0.5, 0.85), n(t[1], 0.5, 0.5, 0.75), n(t[2], 1, 1, 0.9), n(t[1], 2.5, 0.5, 0.8), n(t[0], 3, 1, 0.85)],
      // 4拍目アンティシペーション
      [n(t[2], 0, 1, 0.85), n(t[1], 1.5, 0.5, 0.75), n(t[0], 2, 1.5, 0.9), n(t[1], 3.5, 0.5, 0.8)],
    ],
    half: [
      [n(t[0], 0, 1, 0.85), n(t[1], 1.5, 0.5, 0.8)],
      [n(t[1], 0.5, 0.5, 0.8), n(t[0], 1, 1, 0.85)],
    ],
  };
}

/** Melodic: 半音アプローチ・エンクロージャー入りの歌えるライン(コード品質ごとに手書き) */
function melodicBank(q: Quality): LickBank {
  switch (q) {
    case 'm7':
      return {
        full: [
          // 上下から♭3を挟む(エンクロージャー)→ 5・♭7と昇って9thに着地
          [n(5, 0, 0.5, 0.7), n(2, 0.5, 0.5, 0.75), n(3, 1, 1, 0.9), n(7, 2, 0.5, 0.8), n(10, 2.5, 0.5, 0.75), n(14, 3, 1, 0.85)],
          // マイナー11thの響き: ♭3-5-♭7-9と駆け上がって滑り降りる
          [n(3, 0, 0.5, 0.8), n(5, 0.5, 0.5, 0.7), n(7, 1, 0.5, 0.75), n(10, 1.5, 0.5, 0.8), n(14, 2, 1, 0.9), n(12, 3, 0.5, 0.75), n(10, 3.5, 0.5, 0.7)],
          // ウラ拍スタート+4拍目ウラの食い(休符もフレーズのうち)
          [n(3, 0.5, 1, 0.85), n(7, 1.5, 0.5, 0.7), n(10, 2, 1.5, 0.85), n(14, 3.5, 0.5, 0.8)],
        ],
        half: [[n(2, 0, 0.5, 0.7), n(3, 0.5, 0.5, 0.85), n(7, 1, 0.5, 0.75), n(10, 1.5, 0.5, 0.8)]],
      };
    case '7':
      return {
        full: [
          // ♭7-13-5-3と下がり、4-3のターンから9thへ(ジャズの定番の締め)
          [n(10, 0, 0.5, 0.85), n(9, 0.5, 0.5, 0.7), n(7, 1, 0.5, 0.75), n(4, 1.5, 0.5, 0.8), n(5, 2, 0.5, 0.7), n(4, 2.5, 0.5, 0.75), n(2, 3, 1, 0.85)],
          // ドミナント・ビバップスケール下行(R-M7-♭7-13-5-4)→ 3rdに着地
          [n(12, 0, 0.5, 0.85), n(11, 0.5, 0.5, 0.7), n(10, 1, 0.5, 0.8), n(9, 1.5, 0.5, 0.7), n(7, 2, 0.5, 0.75), n(5, 2.5, 0.5, 0.7), n(4, 3, 1, 0.9)],
          // チャールストン型: 3rdをドンと置いて♭7、休符のあと9thへ滑り込む
          [n(4, 0, 1.5, 0.9), n(10, 1.5, 1, 0.8), n(9, 3, 0.5, 0.7), n(2, 3.5, 0.5, 0.75)],
        ],
        half: [[n(4, 0, 0.5, 0.8), n(7, 0.5, 0.5, 0.7), n(10, 1, 0.5, 0.85), n(9, 1.5, 0.5, 0.7)]],
      };
    case 'maj7':
      return {
        full: [
          // 5-3-2-1と歌って6thへ(メジャー6thの甘い響きで締める)
          [n(7, 0, 0.5, 0.8), n(4, 0.5, 0.5, 0.7), n(2, 1, 0.5, 0.75), n(0, 1.5, 0.5, 0.7), n(9, 2, 1, 0.9), n(7, 3, 1, 0.75)],
          // 3-5-7-9アルペジオ → 8-6と落ち着く
          [n(4, 0, 0.5, 0.8), n(7, 0.5, 0.5, 0.7), n(11, 1, 0.5, 0.75), n(14, 1.5, 0.5, 0.85), n(12, 2, 1, 0.8), n(9, 3, 1, 0.75)],
          // ウラ拍から歌い出して6thでゆったり伸ばす(間を活かす)
          [n(4, 0.5, 1, 0.85), n(7, 1.5, 0.5, 0.7), n(9, 2, 2, 0.8)],
        ],
        half: [[n(2, 0, 0.5, 0.7), n(4, 0.5, 0.5, 0.85), n(9, 1, 1, 0.8)]],
      };
    case 'm7b5':
      return {
        full: [
          // ハーフディミニッシュのアルペジオを転がす
          [n(3, 0, 0.5, 0.8), n(6, 0.5, 0.5, 0.75), n(10, 1, 0.5, 0.8), n(12, 1.5, 0.5, 0.7), n(10, 2, 1, 0.85), n(6, 3, 1, 0.7)],
          // ♭7から暗く下行し、♭9で次のV7へ橋渡し
          [n(10, 0, 0.5, 0.85), n(8, 0.5, 0.5, 0.7), n(6, 1, 0.5, 0.75), n(5, 1.5, 0.5, 0.7), n(3, 2, 1, 0.9), n(1, 3, 1, 0.75)],
          // 付点4分×2で重く進む(3拍またぎの浮遊感)
          [n(3, 0, 1.5, 0.85), n(6, 1.5, 1.5, 0.8), n(10, 3, 1, 0.85)],
        ],
        half: [[n(3, 0, 0.5, 0.8), n(6, 0.5, 0.5, 0.8), n(10, 1, 1, 0.85)]],
      };
    case '7b9':
      return {
        full: [
          // ディミニッシュ・アルペジオ上行(♭9-3-5-♭7-♭9)— 7♭9の王道
          [n(1, 0, 0.5, 0.8), n(4, 0.5, 0.5, 0.7), n(7, 1, 0.5, 0.75), n(10, 1.5, 0.5, 0.8), n(13, 2, 1, 0.9), n(10, 3, 1, 0.7)],
          // ♭9から劇的に下行、4-3のターンで♭9に置く
          [n(13, 0, 0.5, 0.85), n(10, 0.5, 0.5, 0.7), n(8, 1, 0.5, 0.75), n(7, 1.5, 0.5, 0.7), n(5, 2, 0.5, 0.7), n(4, 2.5, 0.5, 0.8), n(1, 3, 1, 0.85)],
          // ウラ拍の♭9で始めて、4拍目ウラで3rdを食う
          [n(13, 0.5, 1, 0.85), n(10, 1.5, 0.5, 0.7), n(7, 2, 1.5, 0.8), n(4, 3.5, 0.5, 0.85)],
        ],
        half: [[n(13, 0, 0.5, 0.85), n(10, 0.5, 0.5, 0.75), n(7, 1, 0.5, 0.7), n(4, 1.5, 0.5, 0.8)]],
      };
  }
}

/** Advanced: エンクロージャー・半音経過音入りのビバップライン */
function advancedBank(q: Quality): LickBank {
  switch (q) {
    case 'm7':
      return {
        full: [
          // 1-2-♭3-4 → 5-♯5-6-♭7 の半音クライム(バップの定番の推進力)
          [n(0, 0, 0.5, 0.85), n(2, 0.5, 0.5, 0.7), n(3, 1, 0.5, 0.8), n(5, 1.5, 0.5, 0.7), n(7, 2, 0.5, 0.85), n(8, 2.5, 0.5, 0.7), n(9, 3, 0.5, 0.75), n(10, 3.5, 0.5, 0.8)],
          // ♭3-5-♭7-9アルペジオ → 8-♭7-13-5と流れ落ちる
          [n(3, 0, 0.5, 0.85), n(7, 0.5, 0.5, 0.7), n(10, 1, 0.5, 0.8), n(14, 1.5, 0.5, 0.85), n(12, 2, 0.5, 0.75), n(10, 2.5, 0.5, 0.7), n(9, 3, 0.5, 0.75), n(7, 3.5, 0.5, 0.7)],
          // 2拍目に休符を置いて呼吸し、後半へ駆け上がる
          [n(10, 0, 0.5, 0.85), n(9, 0.5, 0.5, 0.7), n(7, 1, 0.5, 0.75), n(3, 2, 0.5, 0.85), n(5, 2.5, 0.5, 0.7), n(7, 3, 0.5, 0.75), n(10, 3.5, 0.5, 0.8)],
        ],
        half: [[n(3, 0, 0.5, 0.85), n(7, 0.5, 0.5, 0.7), n(10, 1, 0.5, 0.8), n(12, 1.5, 0.5, 0.75)]],
      };
    case '7':
      return {
        full: [
          // 3-4-♯4-5の半音クライム → ♭7-5-3-9と裏返す
          [n(4, 0, 0.5, 0.85), n(5, 0.5, 0.5, 0.7), n(6, 1, 0.5, 0.75), n(7, 1.5, 0.5, 0.8), n(10, 2, 0.5, 0.9), n(7, 2.5, 0.5, 0.7), n(4, 3, 0.5, 0.75), n(2, 3.5, 0.5, 0.7)],
          // R-♭9-R-♭7-13-5-4-3(♭9をかすめる粋な下行)
          [n(12, 0, 0.5, 0.85), n(13, 0.5, 0.5, 0.7), n(12, 1, 0.5, 0.75), n(10, 1.5, 0.5, 0.7), n(9, 2, 0.5, 0.8), n(7, 2.5, 0.5, 0.7), n(5, 3, 0.5, 0.75), n(4, 3.5, 0.5, 0.85)],
          // ウラ拍スタートの下行 → 3rdを置いて9thを食う
          [n(10, 0.5, 0.5, 0.8), n(9, 1, 0.5, 0.7), n(7, 1.5, 0.5, 0.75), n(4, 2, 1, 0.9), n(2, 3.5, 0.5, 0.75)],
        ],
        half: [[n(10, 0, 0.5, 0.85), n(9, 0.5, 0.5, 0.7), n(7, 1, 0.5, 0.75), n(4, 1.5, 0.5, 0.85)]],
      };
    case 'maj7':
      return {
        full: [
          // maj7アルペジオ下行 → 2-♭3-3の半音エンクロージャーで3rdに着地
          [n(11, 0, 0.5, 0.85), n(9, 0.5, 0.5, 0.7), n(7, 1, 0.5, 0.75), n(4, 1.5, 0.5, 0.7), n(2, 2, 0.5, 0.7), n(3, 2.5, 0.5, 0.75), n(4, 3, 1, 0.9)],
          // 5-6-7-8と歌い上げて9thで輝き、7-6と余韻
          [n(7, 0, 0.5, 0.8), n(9, 0.5, 0.5, 0.7), n(11, 1, 0.5, 0.75), n(12, 1.5, 0.5, 0.7), n(14, 2, 1, 0.9), n(11, 3, 0.5, 0.75), n(9, 3.5, 0.5, 0.7)],
          // 3-5と置いて休符、6thから9thへ跳んで戻る(間で聴かせる)
          [n(4, 0, 0.5, 0.85), n(7, 0.5, 0.5, 0.7), n(9, 1.5, 1, 0.85), n(14, 2.5, 0.5, 0.75), n(12, 3, 1, 0.8)],
        ],
        half: [[n(4, 0, 0.5, 0.85), n(7, 0.5, 0.5, 0.7), n(11, 1, 0.5, 0.8), n(9, 1.5, 0.5, 0.75)]],
      };
    case 'm7b5':
      return {
        full: [
          // ハーフディミニッシュを転がして暗い滑走
          [n(3, 0, 0.5, 0.85), n(6, 0.5, 0.5, 0.75), n(10, 1, 0.5, 0.8), n(12, 1.5, 0.5, 0.75), n(10, 2, 0.5, 0.8), n(8, 2.5, 0.5, 0.7), n(6, 3, 0.5, 0.75), n(5, 3.5, 0.5, 0.7)],
          // ロクリアンの全下行(R-♭7-♭6-♭5-11-♭3-♭9-R)
          [n(12, 0, 0.5, 0.85), n(10, 0.5, 0.5, 0.7), n(8, 1, 0.5, 0.75), n(6, 1.5, 0.5, 0.7), n(5, 2, 0.5, 0.8), n(3, 2.5, 0.5, 0.7), n(1, 3, 0.5, 0.75), n(0, 3.5, 0.5, 0.7)],
          // ウラ拍から♭5を強調し、後半は影のように引く
          [n(3, 0.5, 0.5, 0.8), n(6, 1, 0.5, 0.75), n(10, 1.5, 1, 0.85), n(8, 3, 0.5, 0.7), n(6, 3.5, 0.5, 0.75)],
        ],
        half: [[n(10, 0, 0.5, 0.85), n(6, 0.5, 0.5, 0.75), n(3, 1, 0.5, 0.8), n(1, 1.5, 0.5, 0.75)]],
      };
    case '7b9':
      return {
        full: [
          // ディミニッシュ・アルペジオを上って♭13-5で解ける
          [n(1, 0, 0.5, 0.8), n(4, 0.5, 0.5, 0.7), n(7, 1, 0.5, 0.75), n(10, 1.5, 0.5, 0.8), n(13, 2, 0.5, 0.9), n(10, 2.5, 0.5, 0.7), n(8, 3, 0.5, 0.75), n(7, 3.5, 0.5, 0.7)],
          // ディミニッシュ下行 → 4-3ターン → ♭9で吊るす(次の解決が際立つ)
          [n(13, 0, 0.5, 0.85), n(10, 0.5, 0.5, 0.7), n(7, 1, 0.5, 0.75), n(4, 1.5, 0.5, 0.8), n(5, 2, 0.5, 0.7), n(4, 2.5, 0.5, 0.75), n(1, 3, 1, 0.9)],
          // チャールストンで♭9を置き、ディミニッシュを2拍目ウラから駆け上がる
          [n(1, 0, 1, 0.85), n(4, 1.5, 0.5, 0.7), n(7, 2, 0.5, 0.75), n(10, 2.5, 0.5, 0.8), n(13, 3, 1, 0.9)],
        ],
        half: [[n(13, 0, 0.5, 0.85), n(10, 0.5, 0.5, 0.75), n(7, 1, 0.5, 0.7), n(4, 1.5, 0.5, 0.8)]],
      };
  }
}

function getBank(diff: Difficulty, q: Quality): LickBank {
  switch (diff) {
    case 'beginner': return beginnerBank(q);
    case 'guide': return guideBank(q);
    case 'rhythm': return rhythmBank(q);
    case 'melodic': return melodicBank(q);
    case 'advanced': return advancedBank(q);
  }
}

/** 「同じリズムで別メロディー」: タイミングを保ったままコードトーン内で音を差し替える */
function remapMelody(lick: LickNote[], q: Quality, melodyVariant: number): LickNote[] {
  if (melodyVariant === 0) return lick;
  const tones = QUALITIES[q].tones;
  return lick.map((note) => {
    const pc = mod12(note.o);
    const idx = tones.indexOf(pc);
    if (idx < 0) return note; // 経過音などはそのまま
    const octaveBase = note.o - pc;
    const newIdx = (idx + melodyVariant) % tones.length;
    return { ...note, o: octaveBase + tones[newIdx] };
  });
}

export interface PhraseOptions {
  /** リズムパターンのバリエーション番号(Rhythm Focus等で切替) */
  rhythmVariant?: number;
  /** 同じリズムで別メロディーのバリエーション番号 */
  melodyVariant?: number;
}

/**
 * コード進行 × 難易度 → 見本フレーズ(Concert MIDI)
 * オクターブはボイスリーディング(前の音に最も近い高さ)で自動調整する。
 */
export function generatePhrase(
  prog: Progression,
  keyPc: number,
  difficulty: Difficulty,
  opts: PhraseOptions = {},
): NoteEvent[] {
  const { rhythmVariant = 0, melodyVariant = 0 } = opts;
  const events: NoteEvent[] = [];
  let prevPitch: number | null = null;

  prog.chords.forEach((chord: ChordEvent, chordIndex: number) => {
    const bank = getBank(difficulty, chord.quality);
    const patterns = chord.beats >= 4 ? bank.full : bank.half;
    let lick = patterns[(chordIndex + rhythmVariant) % patterns.length];
    lick = remapMelody(lick, chord.quality, melodyVariant);
    if (lick.length === 0) return;

    // ルートを C4(60) 近辺に配置: キー+コードで54〜65の範囲
    const rootPc = mod12(keyPc + chord.rootOffset);
    let rootMidi = 60 + rootPc;
    if (rootMidi > 65) rootMidi -= 12;

    // ボイスリーディング: フレーズ先頭音が直前の音に近くなるようオクターブ調整
    let shift = 0;
    if (prevPitch !== null) {
      const first = rootMidi + lick[0].o;
      const candidates = [-12, 0, 12];
      let best = 0;
      let bestDist = Infinity;
      for (const c of candidates) {
        const p = first + c;
        const dist = Math.abs(p - prevPitch);
        if (p >= 52 && p <= 84 && dist < bestDist) {
          bestDist = dist;
          best = c;
        }
      }
      shift = best;
    }

    const measureStart = chord.measure * 4 + chord.beat;
    for (const note of lick) {
      let midi = rootMidi + note.o + shift;
      // 極端な音域は補正
      while (midi < 52) midi += 12;
      while (midi > 86) midi -= 12;
      events.push({
        midi,
        start: measureStart + note.s,
        duration: note.d,
        velocity: note.v ?? 0.8,
        chordIndex,
      });
      prevPitch = midi;
    }
  });

  return events.sort((a, b) => a.start - b.start);
}

/** コードトーン表示用: 各コードの構成音(1-3-5-7)を4分音符で上行 */
export function chordTonesAsNotes(prog: Progression, keyPc: number): NoteEvent[] {
  const events: NoteEvent[] = [];
  prog.chords.forEach((chord, chordIndex) => {
    const tones = QUALITIES[chord.quality].tones;
    const rootPc = mod12(keyPc + chord.rootOffset);
    let rootMidi = 60 + rootPc;
    if (rootMidi > 65) rootMidi -= 12;
    const measureStart = chord.measure * 4 + chord.beat;
    const count = chord.beats >= 4 ? 4 : 2;
    for (let i = 0; i < count; i++) {
      events.push({
        midi: rootMidi + tones[i],
        start: measureStart + i,
        duration: 1,
        velocity: 0.8,
        chordIndex,
      });
    }
  });
  return events;
}

/** ガイドトーン表示用 */
export function guideTonesAsNotes(prog: Progression, keyPc: number): NoteEvent[] {
  return generatePhrase(prog, keyPc, 'guide', { rhythmVariant: 0 });
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
