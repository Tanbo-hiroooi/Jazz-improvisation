// 練習課題データ(自由練習で選択)。UIから分離した純データ。

export type ExerciseCategory =
  | 'chord-tone'
  | 'guide-tone'
  | 'target-note'
  | 'approach-note'
  | 'rhythm'
  | 'motif'
  | 'phrase-structure';

export type ExerciseRuleType =
  | 'allowed-notes'
  | 'target-degree'
  | 'required-rest'
  | 'max-notes'
  | 'rhythm'
  | 'motif-repeat'
  | 'approach-type'
  | 'phrase-length';

export interface ExerciseRule {
  id: string;
  type: ExerciseRuleType;
  label: string;
  labelEn: string;
}

export interface Exercise {
  id: string;
  category: ExerciseCategory;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  objective: string;
  objectiveEn: string;
  difficulty: number; // 1(易)〜3(難)
  rules: ExerciseRule[];
}

export const EXERCISE_CATEGORY_LABELS: Record<ExerciseCategory, { ja: string; en: string }> = {
  'chord-tone': { ja: 'コードトーン', en: 'Chord Tones' },
  'guide-tone': { ja: 'ガイドトーン', en: 'Guide Tones' },
  'target-note': { ja: 'ターゲットノート', en: 'Target Notes' },
  'approach-note': { ja: 'アプローチノート', en: 'Approach Notes' },
  rhythm: { ja: 'リズム', en: 'Rhythm' },
  motif: { ja: 'モチーフ展開', en: 'Motif Development' },
  'phrase-structure': { ja: 'フレーズ構成', en: 'Phrase Structure' },
};

const r = (id: string, type: ExerciseRuleType, label: string, labelEn: string): ExerciseRule => ({ id, type, label, labelEn });

export const EXERCISES: Exercise[] = [
  // ---- A. コードトーン ----
  {
    id: 'ct-sparse-phrase',
    category: 'chord-tone',
    title: 'コードトーンだけでフレーズを作る',
    titleEn: 'Build phrases from chord tones only',
    description: '使用できる音はコードトーンだけです。1小節に2〜4音を使い、必ず休符を入れてください。',
    descriptionEn: 'Use chord tones only. Play 2–4 notes per measure and always include a rest.',
    objective: '少ない音で「コードの音」を鳴らす感覚をつかむ。',
    objectiveEn: 'Learn to sound the chord with just a few notes.',
    difficulty: 1,
    rules: [
      r('ct1-allowed', 'allowed-notes', '使用音: コードトーン(1・3・5・7)のみ', 'Allowed notes: chord tones (1, 3, 5, 7) only'),
      r('ct1-max', 'max-notes', '1小節に2〜4音まで', '2–4 notes per measure'),
      r('ct1-rest', 'required-rest', '各小節に必ず休符を入れる', 'Include a rest in every measure'),
    ],
  },
  {
    id: 'ct-strong-beat',
    category: 'chord-tone',
    title: '強拍にコードトーンを置く',
    titleEn: 'Chord tones on strong beats',
    description: '1拍目と3拍目には必ずコードトーンを置いてください。他の拍は自由です。',
    descriptionEn: 'Place a chord tone on beats 1 and 3. Other beats are free.',
    objective: '拍の重みと音選びを結びつける。',
    objectiveEn: 'Connect note choice to the weight of the beat.',
    difficulty: 2,
    rules: [
      r('ct2-strong', 'target-degree', '1拍目・3拍目はコードトーン', 'Chord tone on beats 1 & 3'),
      r('ct2-free', 'allowed-notes', '他の拍はスケール音も可', 'Scale notes allowed on other beats'),
    ],
  },
  // ---- B. ガイドトーン ----
  {
    id: 'gt-connect',
    category: 'guide-tone',
    title: '3度と7度を近い音でつなぐ',
    titleEn: 'Connect 3rds & 7ths by the nearest note',
    description: '各コードの3度または7度を選び、できるだけ近い音へ進んでください。例(C調のii–V–I): F→F→E / C→B→B',
    descriptionEn: 'Choose the 3rd or 7th of each chord and move to the nearest one. Example (ii–V–I in C): F→F→E / C→B→B',
    objective: 'コードの変わり目のなめらかな声部進行を体で覚える。',
    objectiveEn: 'Internalize smooth voice-leading across chord changes.',
    difficulty: 1,
    rules: [
      r('gt1-allowed', 'allowed-notes', '使用音: 3度と7度のみ', 'Allowed notes: 3rds and 7ths only'),
      r('gt1-near', 'target-degree', '次のコードでは最も近いガイドトーンへ', 'Move to the nearest guide tone on each change'),
    ],
  },
  {
    id: 'gt-one-note',
    category: 'guide-tone',
    title: '1コードにつき1音だけ',
    titleEn: 'One note per chord',
    description: '各コードで1音だけ(3度か7度)を選び、長く伸ばして響きを聴いてください。',
    descriptionEn: 'Pick just one note (3rd or 7th) per chord, hold it, and listen to how it colors the chord.',
    objective: '音数を絞り、1音の説得力を上げる。',
    objectiveEn: 'Fewer notes, more meaning per note.',
    difficulty: 1,
    rules: [
      r('gt2-max', 'max-notes', '1コードにつき1音', 'One note per chord'),
      r('gt2-long', 'rhythm', '長く伸ばして響きを確認', 'Hold long tones and listen'),
    ],
  },
  // ---- C. ターゲットノート ----
  {
    id: 'tn-third-landing',
    category: 'target-note',
    title: '次のコードの3度に着地する',
    titleEn: 'Land on the next chord’s 3rd',
    description: '次のコードの3度を確認し、その音へ向かう短いフレーズを作ってください。着地は次の小節の1拍目です。',
    descriptionEn: 'Find the next chord’s 3rd and build a short phrase toward it, landing on beat 1 of the next measure.',
    objective: 'コードチェンジをメロディーで表現する。',
    objectiveEn: 'Express the chord change inside your melody.',
    difficulty: 2,
    rules: [
      r('tn1-target', 'target-degree', 'ターゲット: 次のコードの3度', 'Target: the next chord’s 3rd'),
      r('tn1-beat', 'rhythm', '1拍目に着地し、長めに演奏', 'Land on beat 1 and hold'),
    ],
  },
  {
    id: 'tn-seventh-landing',
    category: 'target-note',
    title: '次のコードの7度に着地する',
    titleEn: 'Land on the next chord’s 7th',
    description: '着地音を7度に変えて同じ練習をします。3度との響きの違いを聴き比べてください。',
    descriptionEn: 'Same drill, but land on the 7th. Compare its color with the 3rd.',
    objective: '着地音の選択肢を増やす。',
    objectiveEn: 'Expand your landing-note options.',
    difficulty: 2,
    rules: [r('tn2-target', 'target-degree', 'ターゲット: 次のコードの7度', 'Target: the next chord’s 7th')],
  },
  // ---- D. アプローチノート ----
  {
    id: 'an-below',
    category: 'approach-note',
    title: '半音下からターゲットへ',
    titleEn: 'Half step below → target',
    description: 'ターゲット(3度または7度)の半音下から入ります。例(Cmaj7の3度E): D♯→E。アプローチ音は短く、強拍で伸ばさないこと。',
    descriptionEn: 'Approach the target (3rd or 7th) from a half step below, e.g. D♯→E for Cmaj7. Keep the approach note short; never sustain it on a strong beat.',
    objective: '半音の「引力」でターゲットを際立たせる。',
    objectiveEn: 'Use chromatic gravity to highlight the target.',
    difficulty: 2,
    rules: [
      r('an1-type', 'approach-type', 'アプローチ: 半音下から', 'Approach: from a half step below'),
      r('an1-short', 'rhythm', 'アプローチ音は短く(8分以下)', 'Approach notes short (8th or less)'),
      r('an1-once', 'max-notes', '1フレーズにアプローチは1回だけ', 'One approach per phrase to start'),
    ],
  },
  {
    id: 'an-enclosure',
    category: 'approach-note',
    title: '上下から挟む(エンクロージャー)',
    titleEn: 'Enclosure (above & below)',
    description: 'ターゲットを上と下から挟んでから着地します。例: F→D♯→E。',
    descriptionEn: 'Surround the target from above and below before landing, e.g. F→D♯→E.',
    objective: 'ビバップの核心装飾を身につける。',
    objectiveEn: 'Learn the core bebop ornament.',
    difficulty: 3,
    rules: [
      r('an2-type', 'approach-type', 'アプローチ: 上→下→ターゲット', 'Approach: above → below → target'),
      r('an2-target', 'target-degree', 'ターゲットはコードトーン(まず3度)', 'Target a chord tone (start with the 3rd)'),
    ],
  },
  // ---- E. リズム ----
  {
    id: 'rh-three-notes',
    category: 'rhythm',
    title: '3音だけで3種類のフレーズ',
    titleEn: 'Three notes, three phrases',
    description: '使用音は3音だけです。音を増やさず、開始位置と休符を変えて3種類のフレーズを作ってください。',
    descriptionEn: 'Use only three notes. Without adding notes, create three different phrases by changing the start position and rests.',
    objective: 'リズムだけでフレーズを変化させる。',
    objectiveEn: 'Vary phrases through rhythm alone.',
    difficulty: 1,
    rules: [
      r('rh1-notes', 'allowed-notes', '使用音: 3音のみ(例: 1・3・5度)', 'Allowed notes: only 3 (e.g. 1, 3, 5)'),
      r('rh1-vary', 'rhythm', '開始位置と休符を変えて3パターン', '3 variations via start position & rests'),
    ],
  },
  {
    id: 'rh-rest-one',
    category: 'rhythm',
    title: '1拍目を休む',
    titleEn: 'Rest on beat one',
    description: '各小節の1拍目は必ず休符にして、ウラや2拍目から歌い出してください。',
    descriptionEn: 'Always rest on beat 1 and start your phrase on the upbeat or beat 2.',
    objective: '「頭から弾かない」ジャズの呼吸を作る。',
    objectiveEn: 'Build the jazz habit of not starting on the downbeat.',
    difficulty: 2,
    rules: [r('rh2-rest', 'required-rest', '各小節の1拍目は休符', 'Beat 1 of every measure is a rest')],
  },
  // ---- F. モチーフ展開 ----
  {
    id: 'mo-repeat-vary',
    category: 'motif',
    title: 'モチーフを作って少し変える',
    titleEn: 'Make a motif, change one thing',
    description: '最初の2小節で2〜4音の短いモチーフを作り、次の2小節でリズムか最後の音だけを変えてください。',
    descriptionEn: 'Create a 2–4 note motif in the first two measures; in the next two, change only the rhythm or the last note.',
    objective: '繰り返しと変化でフレーズをつなげる。',
    objectiveEn: 'Connect phrases through repetition and variation.',
    difficulty: 2,
    rules: [
      r('mo1-len', 'phrase-length', 'モチーフは2〜4音', 'Motif of 2–4 notes'),
      r('mo1-repeat', 'motif-repeat', '2小節ごとに繰り返し、1カ所だけ変える', 'Repeat every 2 bars, changing one element'),
    ],
  },
  {
    id: 'mo-transpose',
    category: 'motif',
    title: '次のコードに合わせて動かす',
    titleEn: 'Move the motif with the chords',
    description: '同じ形のモチーフを、コードが変わったら新しいコードトーンに合わせて平行移動してください。',
    descriptionEn: 'Keep the motif’s shape but shift it to fit the new chord’s tones on each change.',
    objective: 'シークエンスの感覚を身につける。',
    objectiveEn: 'Develop the sequencing instinct.',
    difficulty: 3,
    rules: [r('mo2-seq', 'motif-repeat', '同じ形を各コードで反復(シークエンス)', 'Sequence the same shape through the changes')],
  },
  // ---- G. フレーズ構成 ----
  {
    id: 'ps-call-response',
    category: 'phrase-structure',
    title: '問いと答え',
    titleEn: 'Call and response',
    description: '2小節で「問い」を演奏し、次の2小節で「答え」を返してください。答えは問いに似せること。',
    descriptionEn: 'Play a 2-bar “question,” then answer it in the next 2 bars. The answer should resemble the question.',
    objective: '会話のようにフレーズをまとめる。',
    objectiveEn: 'Shape phrases like a conversation.',
    difficulty: 2,
    rules: [
      r('ps1-len', 'phrase-length', '2小節+2小節の問答', '2 bars call + 2 bars response'),
      r('ps1-rest', 'required-rest', 'フレーズの間に必ず休符', 'Rest between phrases'),
    ],
  },
  {
    id: 'ps-less-notes',
    category: 'phrase-structure',
    title: '音を弾きすぎない',
    titleEn: 'Play fewer notes',
    description: '2小節ごとに必ず1拍以上の休符を入れてください。休符もフレーズの一部です。',
    descriptionEn: 'Include at least one full beat of rest every two measures. Space is part of the phrase.',
    objective: '間(ま)で聴かせる感覚を育てる。',
    objectiveEn: 'Let the silence speak.',
    difficulty: 1,
    rules: [r('ps2-rest', 'required-rest', '2小節ごとに1拍以上の休符', 'At least 1 beat of rest every 2 bars')],
  },
];
