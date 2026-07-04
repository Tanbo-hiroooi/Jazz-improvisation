// ジャズの定番リズムパターン(リズム練習用)とスウィング設定

export interface RhythmHit {
  /** パターン先頭からの開始拍 */
  s: number;
  /** 拍数 */
  d: number;
  /** ベロシティ */
  v?: number;
}

export interface JazzRhythm {
  id: string;
  label: string;
  hint: string;
  bars: number;
  hits: RhythmHit[];
}

/** 1小節パターンを2小節に展開 */
function twoBars(bar: RhythmHit[]): RhythmHit[] {
  return [...bar, ...bar.map((h) => ({ ...h, s: h.s + 4 }))];
}

export const JAZZ_RHYTHMS: JazzRhythm[] = [
  {
    id: 'quarter',
    label: '4分音符(基準)',
    hint: 'まずは4つ打ち。スウィングを感じながら、2拍目と4拍目を少し強く。ウォーキングベースの気分で。',
    bars: 2,
    hits: twoBars([
      { s: 0, d: 1, v: 0.75 }, { s: 1, d: 1, v: 0.9 }, { s: 2, d: 1, v: 0.75 }, { s: 3, d: 1, v: 0.9 },
    ]),
  },
  {
    id: 'swing-8ths',
    label: 'スウィング8分',
    hint: 'ジャズの8分音符は均等ではなく「タータ・タータ」と跳ねます。ウラの音を短く軽く。これがスウィングの基本です。',
    bars: 2,
    hits: twoBars([
      { s: 0, d: 0.5, v: 0.85 }, { s: 0.5, d: 0.5, v: 0.65 },
      { s: 1, d: 0.5, v: 0.85 }, { s: 1.5, d: 0.5, v: 0.65 },
      { s: 2, d: 0.5, v: 0.85 }, { s: 2.5, d: 0.5, v: 0.65 },
      { s: 3, d: 0.5, v: 0.85 }, { s: 3.5, d: 0.5, v: 0.65 },
    ]),
  },
  {
    id: 'offbeat',
    label: 'ウラ拍(オフビート)',
    hint: 'すべてウラ拍。ジャズらしさの核心です。メトロノームをオモテに感じながら、自分はウラだけを出します。',
    bars: 2,
    hits: twoBars([
      { s: 0.5, d: 0.5, v: 0.85 }, { s: 1.5, d: 0.5, v: 0.85 }, { s: 2.5, d: 0.5, v: 0.85 }, { s: 3.5, d: 0.5, v: 0.85 },
    ]),
  },
  {
    id: 'charleston',
    label: 'チャールストン',
    hint: '「ドン・(ウ)タッ」— 1拍目と2拍目のウラ。ジャズのコンピングで最も使われるリズムです。',
    bars: 2,
    hits: twoBars([
      { s: 0, d: 1.5, v: 0.9 }, { s: 1.5, d: 1.5, v: 0.8 },
    ]),
  },
  {
    id: 'reverse-charleston',
    label: '逆チャールストン',
    hint: '1拍目のウラから入って3拍目へ。「(ウ)タッ・ドン」。ウラ拍から始まる感覚に慣れましょう。',
    bars: 2,
    hits: twoBars([
      { s: 0.5, d: 1.5, v: 0.85 }, { s: 2, d: 1.5, v: 0.85 },
    ]),
  },
  {
    id: 'ride',
    label: 'ライドシンバル',
    hint: 'ドラマーの「チーン・チッキ」パターン。1・2・2ウラ・3・4・4ウラ。ジャズのタイム感そのものです。',
    bars: 2,
    hits: twoBars([
      { s: 0, d: 1, v: 0.85 }, { s: 1, d: 0.5, v: 0.8 }, { s: 1.5, d: 0.5, v: 0.6 },
      { s: 2, d: 1, v: 0.85 }, { s: 3, d: 0.5, v: 0.8 }, { s: 3.5, d: 0.5, v: 0.6 },
    ]),
  },
  {
    id: 'anticipation',
    label: 'アンティシペーション(食い)',
    hint: '次の小節の頭を4拍目のウラで「食う」リズム。ジャズのフレーズはよく小節線をまたぎます。',
    bars: 2,
    hits: [
      { s: 0, d: 1, v: 0.8 }, { s: 1, d: 1, v: 0.75 }, { s: 2, d: 1, v: 0.8 }, { s: 3.5, d: 1, v: 0.95 },
      { s: 5, d: 1, v: 0.75 }, { s: 6, d: 1, v: 0.8 }, { s: 7.5, d: 0.5, v: 0.95 },
    ],
  },
  {
    id: 'dotted-quarter',
    label: '付点4分(3拍またぎ)',
    hint: '1.5拍ごとのアクセント。4/4の中に3拍子のうねりが生まれる、モダンジャズの定番リズムです。',
    bars: 2,
    hits: [
      { s: 0, d: 1.5, v: 0.9 }, { s: 1.5, d: 1.5, v: 0.85 }, { s: 3, d: 1.5, v: 0.9 },
      { s: 4.5, d: 1.5, v: 0.85 }, { s: 6, d: 1.5, v: 0.9 }, { s: 7.5, d: 0.5, v: 0.85 },
    ],
  },
  {
    id: 'comping-mix',
    label: 'コンピング・ミックス',
    hint: 'ピアニストの伴奏風に、表と裏が混ざった2小節。休符(音を出さない時間)もリズムのうちです。',
    bars: 2,
    hits: [
      { s: 0.5, d: 1, v: 0.85 }, { s: 2, d: 0.5, v: 0.8 }, { s: 2.5, d: 1, v: 0.85 },
      { s: 4, d: 0.5, v: 0.8 }, { s: 5.5, d: 1, v: 0.9 }, { s: 7, d: 1, v: 0.85 },
    ],
  },
];

/** スウィングの強さ: ウラ拍(8分)を何拍ぶん遅らせるか */
export interface SwingOption {
  id: string;
  label: string;
  offset: number;
}

export const SWING_OPTIONS: SwingOption[] = [
  { id: 'none', label: 'なし', offset: 0 },
  { id: 'light', label: '軽め', offset: 0.09 },
  { id: 'standard', label: '標準(三連)', offset: 1 / 6 },
  { id: 'hard', label: '強め', offset: 0.25 },
];
