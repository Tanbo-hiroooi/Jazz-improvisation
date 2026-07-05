// UI表示言語(日本語/英語)の切り替え

export type Lang = 'ja' | 'en';

export const LANG_STORAGE_KEY = 'jazz-phrase-lab-lang';

export function loadLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_STORAGE_KEY);
    return v === 'en' ? 'en' : 'ja';
  } catch {
    return 'ja';
  }
}

export function saveLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // 保存できなくても動作に支障なし
  }
}

/** データ内の日英ペアから表示言語のものを選ぶ */
export function pick(lang: Lang, ja: string, en: string): string {
  return lang === 'ja' ? ja : en;
}

const JA = {
  tagline: '楽譜は読める。次はアドリブ。— コード進行×ガイドトーン×リズムパターンで練習',
  setupTitle: '練習セットアップ',
  menuLabel: '練習メニュー',
  customMenuOption: '実践モード(自由進行)',
  customLabel: '実践モード(自由進行)',
  customDescription: 'コード進行と小節数を自由に決めて、コード音をバックに練習できます。',
  keyLabel: 'キー(実音)',
  customKeyHint: '実践モードではコードを直接指定します',
  instrumentLabel: '楽器',
  pitchLabel: '表示ピッチ',
  concert: '実音(Concert)',
  written: '記譜(Written)',
  clefLabel: '譜表',
  tempoLabel: 'テンポ',
  contentLabel: '練習する内容(五線譜に表示)',
  chordTones: 'コードトーン',
  guideTones: 'ガイドトーン',
  approachTab: 'アプローチ',
  targetTab: 'ターゲット',
  scaleTab: 'スケール(音階)',
  rhythmPatternLabel: 'リズムパターン',
  arpLabel: '並び方',
  swingLabel: 'スウィング',
  noSwing16: '16分はスウィングせず、イーブンで再生されます',
  scaleViewLabel: '表示内容',
  viewScale: 'スケール',
  viewTension: 'テンション(9・11・13)',
  approachBadge: 'アプローチノート',
  targetBadge: 'ターゲット(着地)',
  tensionBadge: 'テンション',
  progressionTitle: 'コード進行',
  customBadge: '自由進行',
  writtenBadge: '記譜',
  measureTapHint: '小節をタップするとループ開始位置を選べます(1小節/2小節ループ時)',
  countInBanner: 'カウントイン中… 1 2 3 4',
  metronome: 'メトロノーム',
  compSound: 'コード音',
  loopRangeLabel: 'ループ範囲:',
  loopFull: '進行全体',
  loop2: '2小節',
  loop1: '1小節',
  staffTitle: '五線譜',
  labelNone: '音名なし',
  labelSolfege: 'ドレミ',
  labelDegree: '度数',
  writtenNotice: 'Written Pitch 表示中: あなたの楽器で読む譜面です。鳴る音(実音)とは異なります。',
  nowChordTitle: 'いまのコード',
  chordTonesInfo: 'コードトーン',
  guideTonesInfo: 'ガイドトーン',
  recommendedScale: 'おすすめスケール',
  guideToneHint: '3度と7度がコードの性格を決めます',
  concertPrefix: '実音',
  practicePointTitle: '練習ポイント',
  logTitle: '練習ログ',
  logPlaceholder: '例: G7からCmaj7に行くとき、Eに着地すると安定した。リズムが単調になりやすい。',
  logSave: '今日の練習を記録',
  logEmpty: 'まだ記録がありません。練習したら記録してみましょう。',
  scaleLogLabel: 'スケール',
  footer: 'Jazz Phrase Lab — 譜面演奏からアドリブへの橋渡し。ヘッドホン推奨。iPhoneはマナーモード解除で音が出ます。',
  chordInputLabel: 'コード入力',
  measuresLabel: '小節数(1〜16)',
  measuresUnit: '小節',
  customEditorHint: '1小節につき1コード。「使える音」で各コードのおすすめスケールが五線譜に表示されます。Startでコード音とメトロノームを鳴らして練習しましょう。',
  customWrittenHint: '記譜表示中は、あなたの楽器の譜面に書いてあるコード名のまま入力できます(鳴る音は実音に自動変換)。',
  rootAria: '小節目のルート',
  qualityAria: '小節目のコードタイプ',
  measureAria: '小節目',
  deleteLog: '削除',
};

const EN: typeof JA = {
  tagline: 'You can read music. Now improvise. — Practice with chord progressions, guide tones & rhythm patterns',
  setupTitle: 'Practice Setup',
  menuLabel: 'Practice Menu',
  customMenuOption: 'Free Practice (custom progression)',
  customLabel: 'Free Practice (custom progression)',
  customDescription: 'Set any chords and number of measures, and practice over the chord sounds.',
  keyLabel: 'Key (concert)',
  customKeyHint: 'In Free Practice you specify chords directly',
  instrumentLabel: 'Instrument',
  pitchLabel: 'Display Pitch',
  concert: 'Concert',
  written: 'Written',
  clefLabel: 'Clef',
  tempoLabel: 'Tempo',
  contentLabel: 'What to practice (shown on staff)',
  chordTones: 'Chord Tones',
  guideTones: 'Guide Tones',
  approachTab: 'Approach',
  targetTab: 'Target',
  scaleTab: 'Scale',
  rhythmPatternLabel: 'Rhythm Pattern',
  arpLabel: 'Note Order',
  swingLabel: 'Swing',
  noSwing16: '16th notes play even (no swing)',
  scaleViewLabel: 'View',
  viewScale: 'Scale',
  viewTension: 'Tensions (9, 11, 13)',
  approachBadge: 'Approach Notes',
  targetBadge: 'Target (landing)',
  tensionBadge: 'Tensions',
  progressionTitle: 'Chord Progression',
  customBadge: 'Custom',
  writtenBadge: 'written',
  measureTapHint: 'Tap a measure to set the loop start (for 1- or 2-bar loops)',
  countInBanner: 'Count-in… 1 2 3 4',
  metronome: 'Metronome',
  compSound: 'Chord sound',
  loopRangeLabel: 'Loop range:',
  loopFull: 'Full form',
  loop2: '2 bars',
  loop1: '1 bar',
  staffTitle: 'Staff',
  labelNone: 'No names',
  labelSolfege: 'Do-Re-Mi',
  labelDegree: 'Degrees',
  writtenNotice: 'Written pitch: this is what you read on your instrument. It differs from the sounding (concert) pitch.',
  nowChordTitle: 'Current Chord',
  chordTonesInfo: 'Chord tones',
  guideTonesInfo: 'Guide tones',
  recommendedScale: 'Recommended scale',
  guideToneHint: 'The 3rd and 7th define the chord’s character',
  concertPrefix: 'Concert',
  practicePointTitle: 'Practice Tips',
  logTitle: 'Practice Log',
  logPlaceholder: 'e.g. Landing on E when going G7 → Cmaj7 felt stable. My rhythm tends to get monotonous.',
  logSave: 'Save today’s practice',
  logEmpty: 'No entries yet. Log your practice after playing!',
  scaleLogLabel: 'Scale',
  footer: 'Jazz Phrase Lab — a bridge from sheet music to improvisation. Headphones recommended. On iPhone, turn off silent mode to hear sound.',
  chordInputLabel: 'Chord input',
  measuresLabel: 'Measures (1–16)',
  measuresUnit: ' bars',
  customEditorHint: 'One chord per measure. "Available Notes" shows the recommended scale for each chord on the staff. Press Start to practice over chord sounds and the metronome.',
  customWrittenHint: 'In written-pitch mode you can enter chord names exactly as printed for your instrument (sounding pitch is converted automatically).',
  rootAria: 'root of measure',
  qualityAria: 'chord type of measure',
  measureAria: 'measure',
  deleteLog: 'Delete',
};

export const UI: Record<Lang, typeof JA> = { ja: JA, en: EN };

export function t(lang: Lang, key: keyof typeof JA): string {
  return UI[lang][key];
}
