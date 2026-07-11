// 曲で実践: 実践ミッションのデータ

export interface PracticeMission {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  rules: { ja: string; en: string }[];
  difficulty: number; // 1〜3
}

export const PRACTICE_MISSIONS: PracticeMission[] = [
  {
    id: 'm-chord-tones-only',
    title: '1コーラス目はコードトーンだけ',
    titleEn: 'Chorus 1: chord tones only',
    description: '最初のコーラスは使用音をコードトーンに限定します。2コーラス目から自由に。',
    descriptionEn: 'Restrict yourself to chord tones for the first chorus. Open up from chorus 2.',
    rules: [
      { ja: '1コーラス目: コードトーンのみ', en: 'Chorus 1: chord tones only' },
      { ja: '2コーラス目: スケール音も可', en: 'Chorus 2: scale notes allowed' },
    ],
    difficulty: 1,
  },
  {
    id: 'm-thirds-everywhere',
    title: '各コードの3度を必ず1回使う',
    titleEn: 'Hit every chord’s 3rd',
    description: 'どのコードでも、その小節の中で3度を最低1回鳴らしてください。',
    descriptionEn: 'Sound the 3rd of every chord at least once in its measure.',
    rules: [{ ja: '各コードで3度を1回以上', en: 'The 3rd of each chord at least once' }],
    difficulty: 1,
  },
  {
    id: 'm-end-on-guide',
    title: 'フレーズの最後を3度か7度に',
    titleEn: 'End phrases on 3rds or 7ths',
    description: 'フレーズの最後の音は、必ずそのコードの3度か7度にしてください。',
    descriptionEn: 'Every phrase must end on the current chord’s 3rd or 7th.',
    rules: [{ ja: 'フレーズ末尾=3度or7度', en: 'Phrase endings = 3rd or 7th' }],
    difficulty: 2,
  },
  {
    id: 'm-rest-every-two',
    title: '2小節に1回以上休符を入れる',
    titleEn: 'Rest at least once every 2 bars',
    description: '弾きすぎ防止ミッション。2小節ごとに最低1拍分の休符を確保します。',
    descriptionEn: 'The anti-overplaying mission: at least one beat of rest every two measures.',
    rules: [{ ja: '2小節ごとに1拍以上の休符', en: '1+ beat of rest per 2 bars' }],
    difficulty: 1,
  },
  {
    id: 'm-motif-three-times',
    title: '同じモチーフを3回使う',
    titleEn: 'Use one motif three times',
    description: '1コーラスの中で、同じモチーフを場所を変えて3回登場させてください。2回目はリズムを変えること。',
    descriptionEn: 'Bring the same motif back three times in one chorus — vary its rhythm on the second appearance.',
    rules: [
      { ja: '同じモチーフを3回', en: 'Same motif three times' },
      { ja: '2回目はリズムを変える', en: 'Vary the rhythm on repeat 2' },
    ],
    difficulty: 2,
  },
  {
    id: 'm-no-downbeat-start',
    title: '1拍目から弾き始めない',
    titleEn: 'Never start on beat 1',
    description: 'すべてのフレーズを、1拍目以外(ウラ拍や2拍目以降)から始めてください。',
    descriptionEn: 'Begin every phrase somewhere other than beat 1.',
    rules: [{ ja: 'フレーズ開始は1拍目以外', en: 'Phrases start off beat 1' }],
    difficulty: 2,
  },
  {
    id: 'm-narrow-then-wide',
    title: '前半は狭く、後半は高く',
    titleEn: 'Narrow first, higher later',
    description: '最初の4小節は音域を5度以内に狭め、後半で音域を上げてクライマックスを作ります。',
    descriptionEn: 'Keep the first 4 bars within a 5th, then climb for a late climax.',
    rules: [
      { ja: '前半4小節: 音域は5度以内', en: 'First 4 bars: range within a 5th' },
      { ja: '後半: 音域を上げて起伏を作る', en: 'Later: raise the register for shape' },
    ],
    difficulty: 3,
  },
  {
    id: 'm-quiet-ending',
    title: '最後の4小節で音数を減らす',
    titleEn: 'Thin out the last 4 bars',
    description: 'ソロの終わりに向けて音数を減らし、静かに着地してください。',
    descriptionEn: 'Reduce your note count toward the end and land softly.',
    rules: [{ ja: '最後の4小節は音数を半分に', en: 'Half the notes in the final 4 bars' }],
    difficulty: 2,
  },
  {
    id: 'm-two-choruses-differ',
    title: '1コーラス目と2コーラス目で内容を変える',
    titleEn: 'Make chorus 2 different',
    description: '2周演奏し、2コーラス目では音域・リズム・音数のどれかをはっきり変えてください。',
    descriptionEn: 'Play two choruses; clearly change register, rhythm or density in the second.',
    rules: [{ ja: '2コーラス目は何かを大きく変える', en: 'Change something clearly in chorus 2' }],
    difficulty: 3,
  },
];
