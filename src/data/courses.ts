// 練習コース「リズムから始めるアドリブ入門」
// 設計方針(2026年7月): 理論からではなく、リズム → フレーズ → コード → アドリブ の順で学ぶ。
// 基本ルールは「一度に変えるものは1つだけ」。
// レッスン文章は3区分: ①できるようになること ②STEP ③できたかチェック(+折りたたみ豆知識)

import type { Division, GridAction, GridConditions, GridInitial, GridMaterial } from '../theory/grid';
import type { ArpPatternId, DegreePathRhythm, MotifVariant, StepDegree } from '../theory/phrases';
import type { ProgressionId } from '../theory/progressions';

/** 日英ペアの文章 */
export interface Bi {
  ja: string;
  en: string;
}

/** 固定譜例の内容(STEPの説明と完全に一致する音だけを生成する) */
export interface StepContent {
  source:
    | 'root' | 'third' | 'seventh' | 'chord-tones' | 'guide-tones' | 'target' | 'approach'
    | 'approach-pair' | 'enclosure' | 'landing-approach' | 'scale' | 'tension' | 'custom-path'
    | 'sample-motif' | 'blues-riff' | 'blue-note-demo';
  rhythm?: DegreePathRhythm;
  arpPattern?: ArpPatternId;
  path?: StepDegree[];
  targetDegree?: StepDegree;
  approachFrom?: 'below' | 'above';
  motifVariant?: MotifVariant;
  activeMeasures?: number[];
  activeOnChordChangesOnly?: boolean;
}

/** 拍グリッドによる編集課題の設定 */
export interface StepEditable {
  material: GridMaterial;
  /** 小節数(4が基本。ブルースでは12) */
  bars: number;
  /** 許可する拍分割(1=4分, 2=8分, 3=3連, 4=16分) */
  divisions: Division[];
  /** 初期グリッド(empty=全休符 / quarters=4分で音を並べる / halves=2分×2) */
  initial: GridInitial;
  /** emptyの初期分割(既定は8分) */
  initialDivision?: Division;
  /** リズム固定: セルの追加・削除・のばす不可、音の高さだけ変える */
  fixedRhythm?: boolean;
  /** ピッチ固定: 音選択UIを出さない(1音でリズムに集中する課題) */
  fixedPitch?: boolean;
  /** アーティキュレーション(>・スタッカート・テヌート)の編集を許可 */
  allowArticulation?: boolean;
  conditions?: GridConditions;
  requiredAction?: GridAction;
  task: Bi;
}

export interface PracticeStep {
  title: Bi;
  instruction: Bi;
  /** このSTEPで守るルール */
  rules?: Bi[];
  content?: StepContent;
  editable?: StepEditable;
}

export interface Chapter {
  id: string;
  title: Bi;
  purpose: Bi;
}

export interface Lesson {
  id: string;
  chapterId: string;
  title: Bi;
  technicalName?: string;
  /** ① このレッスンでできるようになること */
  outcome: Bi;
  progressionId: ProgressionId;
  /** ② STEP */
  steps: PracticeStep[];
  /** ③ できたかチェック */
  selfCheck: Bi[];
  /** 折りたたみ豆知識(なぜ効くのか・よくある失敗) */
  trivia?: { why?: Bi; mistakes?: Bi[] };
  estimatedMinutes?: number;
  defaultBpm?: number;
  /** メトロノームの既定パターン(backbeat=2・4拍) */
  clickPattern?: 'all' | 'backbeat';
  /** テンポのはしご(クリアしたらユーザーが自分で上げる) */
  tempoLadder?: number[];
  /** キーのはしご(pitch class) */
  keyLadder?: number[];
}

export interface Course {
  id: string;
  title: Bi;
  description: Bi;
  chapterIds: string[];
}

const b = (ja: string, en: string): Bi => ({ ja, en });
const LADDER_BPM = [60, 70, 80, 100];
const LADDER_KEY = [0, 5, 10]; // C → F → B♭

export const COURSES: Course[] = [
  {
    id: 'rhythm-first',
    title: b('リズムから始めるアドリブ入門', 'Rhythm-First Improvisation'),
    description: b(
      '理論の暗記からではなく、ジャズらしいノリを体に入れることから始めるコースです。リズム → フレーズ → コード → アドリブの順に、一度に変えるものは1つだけ。最後は12小節ブルースで1コーラスのソロを作ります。',
      'Start with the jazz feel, not theory. Rhythm → phrases → changes → improvising, changing only one thing at a time — ending with a full 12-bar blues chorus of your own.',
    ),
    chapterIds: ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6'],
  },
];

export const CHAPTERS: Chapter[] = [
  { id: 'ch1', title: b('第1章: スウィングのノリを覚える', 'Ch. 1: Get the swing feel'), purpose: b('音は1音だけ。リズム・休符・裏拍でジャズのノリを体に入れる。', 'One note only — internalize the feel through rhythm, rests and offbeats.') },
  { id: 'ch2', title: b('第2章: コードトーンでフレーズを作る', 'Ch. 2: Build phrases from chord tones'), purpose: b('覚えたノリに音程を乗せ、4小節のフレーズを完成させる。', 'Put pitches on your groove and finish a 4-bar phrase.') },
  { id: 'ch3', title: b('第3章: コード進行を音で表現する', 'Ch. 3: Make the changes audible'), purpose: b('ガイドトーン・ターゲット・アプローチで「コードが変わった感じ」を出す。', 'Guide tones, targets and approaches — let people hear the chords change.') },
  { id: 'ch4', title: b('第4章: モチーフを育てる', 'Ch. 4: Grow a motif'), purpose: b('短いアイデアを繰り返し、少しずつ変えて物語を作る。', 'Repeat a small idea and vary it a little at a time.') },
  { id: 'ch5', title: b('第5章: ジャズブルースで実践', 'Ch. 5: The jazz blues'), purpose: b('12小節ブルースとブルースの語彙(ブルーノート・リフ・掛け合い)。', 'The 12-bar form plus blues vocabulary: blue notes, riffs, call & response.') },
  { id: 'ch6', title: b('第6章: 1コーラスのソロを作る', 'Ch. 6: Build a one-chorus solo'), purpose: b('始まり・展開・終わりのあるソロを自分で組み立てる。', 'Assemble a solo with a beginning, a build and an ending.') },
];

export const LESSONS: Lesson[] = [
  // ================= 第1章 スウィングのノリ =================
  {
    id: 'r1-quarters',
    chapterId: 'ch1',
    title: b('4分音符でノリに乗る', 'Ride the beat in quarters'),
    technicalName: 'Swing/スウィング',
    outcome: b('2・4拍のクリックに乗って、4分音符と休みだけでジャズのノリを出せるようになります。', 'You’ll groove over a 2-and-4 click using nothing but quarter notes and rests.'),
    progressionId: 'ii-V-I',
    defaultBpm: 70,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      {
        title: b('2・4拍を感じる', 'Feel 2 and 4'),
        instruction: b('このレッスンからクリックは2拍目と4拍目だけ鳴ります。譜例(各コードのルート)を聴き、同じように自分の楽器で弾いてクリックに乗ってみます。', 'From here the click sounds only on beats 2 and 4. Listen to the example (each chord’s root), then play it and ride the click.'),
        rules: [b('音はルート1音だけ', 'One note only — the root'), b('クリックの2・4拍を体で感じる', 'Feel beats 2 and 4 in your body')],
        content: { source: 'root', rhythm: 'basic' },
      },
      {
        title: b('自分のリズムを組む', 'Build your own rhythm'),
        instruction: b('下のマスをタップして、4分音符と休みだけの4小節リズムを作ります。作ったら「音を確認」で聴き、自分の楽器で弾きます。', 'Tap the cells to build four bars from quarter notes and rests. Check the sound, then play it yourself.'),
        rules: [b('使えるのは4分音符と休みだけ', 'Quarter notes and rests only'), b('音の高さは考えない(1音固定)', 'Don’t think about pitch — it’s fixed')],
        editable: {
          material: 'root-only', bars: 4, divisions: [1], initial: 'empty', initialDivision: 1, fixedPitch: true,
          conditions: { minNotes: 6, minRestBeats: 2 },
          requiredAction: 'any-change',
          task: b('音を6個以上・休みを合計2拍以上使って、4小節のリズムを作ってください。', 'Build 4 bars using at least 6 notes and 2 beats of rest.'),
        },
      },
    ],
    selfCheck: [
      b('2・4拍のクリックを聴きながら演奏できた', 'I played while hearing the 2-and-4 click'),
      b('休みの間もノリが途切れなかった', 'The groove kept going through my rests'),
    ],
    trivia: {
      why: b('ジャズのリズム隊はハイハットを2・4拍で刻みます。1・3拍で数えるクセを2・4拍へ移すだけで、同じ4分音符が一気にジャズに聞こえます。', 'Jazz drummers mark beats 2 and 4. Shifting your inner count from 1-3 to 2-4 makes the same quarter notes swing.'),
      mistakes: [b('クリックを1・3拍と勘違いして裏返る', 'Hearing the click as 1 and 3 — flip it back: the click is 2 and 4.')],
    },
    estimatedMinutes: 6,
  },
  {
    id: 'r1-eighths',
    chapterId: 'ch1',
    title: b('8分音符と裏拍', 'Eighth notes and offbeats'),
    technicalName: 'Swing 8ths/裏拍',
    outcome: b('スウィングする8分音符を弾き、裏拍から音を置けるようになります。', 'You’ll play swinging 8ths and start notes on the offbeats.'),
    progressionId: 'ii-V-I',
    defaultBpm: 70,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      {
        title: b('スウィング8分を聴く', 'Hear the swing 8ths'),
        instruction: b('8分音符が「タータ」と跳ねる譜例です。まねして弾き、跳ね方を体に入れます。', 'The 8ths bounce “daa-da.” Copy the example and absorb the bounce.'),
        rules: [b('音はルート1音だけ', 'Root only')],
        content: { source: 'root', rhythm: 'swing8' },
      },
      {
        title: b('裏拍だけで弾く', 'Offbeats only'),
        instruction: b('今度はオモテを休んで、ウラ拍だけ音を出す譜例です。メトロノームと自分が交互に鳴る感覚をつかみます。', 'Now rest on the beat and play only the “ands.” You and the click take turns.'),
        content: { source: 'root', rhythm: 'offbeat8' },
      },
      {
        title: b('裏拍入りのリズムを組む', 'Build with offbeats'),
        instruction: b('8分のマスを使って、裏拍(各拍の2つ目のマス)から始まる音を入れたリズムを作ります。', 'Using 8th-note cells, build a rhythm where at least one note starts on an offbeat cell.'),
        rules: [b('裏拍から始まる音を1つ以上', 'At least one note starting on an offbeat')],
        editable: {
          material: 'root-only', bars: 4, divisions: [1, 2], initial: 'empty', fixedPitch: true,
          conditions: { minNotes: 4, requireOffbeatAttack: true },
          requiredAction: 'any-change',
          task: b('裏拍から始まる音を入れた4小節のリズムを作ってください。', 'Build 4 bars including notes that start on offbeats.'),
        },
      },
    ],
    selfCheck: [
      b('8分音符が均等でなく「タータ」と跳ねた', 'My 8ths bounced instead of being even'),
      b('裏拍から入っても迷子にならなかった', 'Offbeat entries didn’t throw me off'),
    ],
    trivia: {
      why: b('ジャズの8分音符は楽譜どおりの長さではなく、オモテ長め・ウラ短めに揺れます。ウラ拍を自分で置けると、この揺れを能動的に作れるようになります。', 'Jazz 8ths aren’t literal — the on-beat is long, the off-beat short. Placing offbeats yourself makes the swing active, not accidental.'),
      mistakes: [b('裏拍のつもりがオモテに戻ってしまう → 「ん・タ」と口で歌ってから弾く', 'Your “ands” drift onto the beat — sing “n-TAH” before playing.')],
    },
    estimatedMinutes: 8,
  },
  {
    id: 'r1-rests',
    chapterId: 'ch1',
    title: b('休符で語る', 'Let the rests talk'),
    technicalName: 'Space/休符',
    outcome: b('毎小節に「間」を置いて、呼吸のあるリズムを作れるようになります。', 'You’ll leave space in every bar and make rhythms that breathe.'),
    progressionId: 'ii-V-I',
    defaultBpm: 70,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      {
        title: b('チャールストンを弾く', 'Play the Charleston'),
        instruction: b('「ターン・(休み)・タッ」— ジャズで最もよく使われる、休みが主役のリズムです。譜例をまねして弾きます。', '“Daahh — (rest) — dah”: the most-used rhythm in jazz, built on space. Copy the example.'),
        content: { source: 'root', rhythm: 'charleston' },
      },
      {
        title: b('間のあるリズムを組む', 'Build with space'),
        instruction: b('各小節に1拍以上の休みを入れて、4小節のリズムを作ります。休みの間はクリックと伴奏を聴きます。', 'Build 4 bars with at least one beat of rest per bar. Listen to the click and comping through the space.'),
        rules: [b('各小節に1拍以上の休み', 'At least one beat of rest per bar')],
        editable: {
          material: 'root-only', bars: 4, divisions: [1, 2], initial: 'empty', fixedPitch: true,
          conditions: { minNotes: 4, minRestBeatsPerBar: 1 },
          requiredAction: 'any-change',
          task: b('各小節に1拍以上の休みがある4小節のリズムを作ってください。', 'Build 4 bars with a beat of rest in every bar.'),
        },
      },
    ],
    selfCheck: [
      b('休みを怖がらずに置けた', 'I placed rests without fear'),
      b('休み明けの音がノリに乗っていた', 'The note after each rest landed in the groove'),
    ],
    trivia: {
      why: b('名演ほど休符が多いものです。休みは聴き手に直前のフレーズを味わわせ、次の音を際立たせます。', 'The greatest solos are full of rests — silence lets the listener digest and makes the next note land.'),
      mistakes: [b('休むと止まった気がして詰めてしまう → 聴き手には「余裕」に聞こえています', 'Resting feels like stalling — to listeners it sounds like confidence.')],
    },
    estimatedMinutes: 6,
  },
  {
    id: 'r1-syncopation',
    chapterId: 'ch1',
    title: b('シンコペーションと食い', 'Syncopation and anticipation'),
    technicalName: 'Anticipation/食い',
    outcome: b('「→のばす」で拍や小節線をまたぐ音を作り、前のめりの推進力を出せるようになります。', 'You’ll carry notes across beats and barlines for that forward-leaning drive.'),
    progressionId: 'ii-V-I',
    defaultBpm: 70,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      {
        title: b('食いを聴く', 'Hear the anticipation'),
        instruction: b('4拍目のウラで次の小節の音を「食って」、小節線をまたいで伸ばす譜例です(タイでつながっています)。', 'The example “steals” the next bar on the and-of-4 and holds across the barline (see the tie).'),
        content: { source: 'root', rhythm: 'anticipation' },
      },
      {
        title: b('小節をまたぐ音を作る', 'Cross the barline'),
        instruction: b('裏拍で音を置き、「→のばす」で次の小節まで伸ばしてみます。1回できたら場所を変えてもう1回。', 'Place a note on an offbeat and extend it across the barline with “hold.” Do it once, then somewhere else.'),
        rules: [b('小節線をまたぐ音を1つ以上', 'At least one note across a barline')],
        editable: {
          material: 'root-only', bars: 4, divisions: [1, 2], initial: 'empty', fixedPitch: true,
          conditions: { minNotes: 4, requireCrossBarHold: true },
          requiredAction: 'any-change',
          task: b('「→のばす」で小節線をまたぐ音を含む4小節を作ってください。', 'Build 4 bars including a note held across a barline.'),
        },
      },
    ],
    selfCheck: [
      b('食った音が次の小節の頭まで伸びた', 'My anticipation carried into the next bar'),
      b('食いのあとも拍を見失わなかった', 'I kept my place after the push'),
    ],
    trivia: {
      why: b('ジャズのフレーズは小節の頭を待たずに始まることが多く、この「食い」が推進力の正体です。', 'Jazz lines rarely wait for the downbeat — the push is where the forward motion comes from.'),
    },
    estimatedMinutes: 8,
  },
  {
    id: 'r1-spice',
    chapterId: 'ch1',
    title: b('16分と3連のスパイス', '16ths and triplet spice'),
    technicalName: 'Subdivision/細分化',
    outcome: b('拍を16分や3連に切り替えて、リズムに細かい彩りを混ぜられるようになります。', 'You’ll switch beats to 16ths or triplets and sprinkle in fine-grained color.'),
    progressionId: 'ii-V-I',
    defaultBpm: 60,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      {
        title: b('3連のうねりを聴く', 'Hear the triplet roll'),
        instruction: b('1拍を3つに割る3連符の譜例です。スウィングの土台になるうねりを感じます。', 'A beat split in three — the roll that underlies swing itself.'),
        content: { source: 'root', rhythm: 'triplet' },
      },
      {
        title: b('スパイスを混ぜる', 'Mix in the spice'),
        instruction: b('拍の上の「8分」ボタンで分割を切り替えられます。3連の拍と16分の拍を1つずつ以上入れたリズムを作ります(16分は跳ねずにイーブンで)。', 'Use the button above each beat to change its subdivision. Include at least one triplet beat and one 16th beat (16ths play even, not swung).'),
        rules: [b('3連の拍と16分の拍を1つ以上ずつ', 'At least one triplet beat and one 16th beat'), b('入れすぎない(スパイスは少しだけ)', 'Don’t overdo it — spice, not the meal')],
        editable: {
          material: 'root-only', bars: 4, divisions: [1, 2, 3, 4], initial: 'empty', fixedPitch: true,
          conditions: { minNotes: 6, requireTriplet: true, requireSixteenth: true },
          requiredAction: 'any-change',
          task: b('3連の拍と16分の拍を1つ以上ずつ含む4小節を作ってください。', 'Build 4 bars using at least one triplet beat and one 16th beat.'),
        },
      },
    ],
    selfCheck: [
      b('3連と16分を狙った場所に置けた', 'I placed triplets and 16ths where I wanted'),
      b('細かい音を入れてもテンポがずれなかった', 'The tempo held even with fast notes'),
    ],
    trivia: {
      mistakes: [b('16分を入れた拍で走ってしまう → テンポを60まで落として練習', 'Rushing the 16th beats — drop to 60 BPM and rebuild.')],
    },
    estimatedMinutes: 8,
  },

  // ================= 第2章 コードトーンでフレーズ =================
  {
    id: 'r2-articulation',
    chapterId: 'ch2',
    title: b('アクセントで表情を付ける', 'Add expression with accents'),
    technicalName: 'Articulation/アーティキュレーション',
    outcome: b('同じ音・同じリズムのまま、アクセント・短く・長くの3つで演奏の表情を変えられるようになります。', 'Same notes, same rhythm — you’ll change the expression with accent, staccato and tenuto.'),
    progressionId: 'ii-V-I',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      {
        title: b('表情だけを変える', 'Change only the expression'),
        instruction: b('音とリズムは固定です。音符をタップして「>アクセント」「·短く」「–長く」を付け、聴き比べます。裏拍にアクセントを置くとジャズらしくなります。', 'Notes and rhythm are locked. Tap a note and try accent, staccato and tenuto. Accents on offbeats sound especially jazzy.'),
        rules: [b('変えるのは表情だけ(音とリズムは固定)', 'Change only the articulation'), b('どれかを1音以上に付ける', 'Apply at least one marking')],
        editable: {
          material: 'chord-tone', bars: 4, divisions: [1], initial: 'quarters', fixedRhythm: true, fixedPitch: true, allowArticulation: true,
          conditions: { requireArticulation: true },
          requiredAction: 'any-change',
          task: b('アクセント・短く・長くのどれかを1音以上に付けて、表情の違いを聴いてください。', 'Apply at least one articulation and listen to the difference.'),
        },
      },
    ],
    selfCheck: [
      b('アクセントの位置で印象が変わるのを聴き取れた', 'I heard how accent placement changes the feel'),
      b('自分の楽器でも3つの表情を弾き分けた', 'I produced all three articulations on my instrument'),
    ],
    trivia: {
      why: b('同じフレーズでも、どの音を立てるか・切るか・つなぐかで別の音楽になります。ジャズらしさの多くは音選びではなく、この吹き分け・弾き分けです。', 'Which notes you punch, clip or connect changes the music more than which notes you choose.'),
    },
    estimatedMinutes: 6,
  },
  {
    id: 'r2-chordtones',
    chapterId: 'ch2',
    title: b('コードトーンを選ぶ', 'Choose your chord tones'),
    technicalName: 'Chord Tone/コードトーン',
    outcome: b('リズムはそのまま、▲▼で各コードの4つの音(1-3-5-7)を選び替えられるようになります。', 'Keeping the rhythm, you’ll re-choose pitches from each chord’s four tones (1-3-5-7) with ▲▼.'),
    progressionId: 'ii-V-I',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    keyLadder: LADDER_KEY,
    steps: [
      {
        title: b('4つの音を聴く', 'Hear the four notes'),
        instruction: b('各コードの1-3-5-7を下から順に弾く譜例です。伸ばしても濁らない「安全地帯」の音を耳に入れます。', 'Each chord’s 1-3-5-7, bottom to top — the safe notes you can sit on.'),
        content: { source: 'chord-tones', rhythm: 'basic', arpPattern: 'up' },
      },
      {
        title: b('音だけを選び替える', 'Re-choose the pitches'),
        instruction: b('リズムは4分音符で固定。音符をタップして▲▼で好きなコードトーンに変え、自分のメロディーにします。', 'The rhythm stays in quarters. Tap a note and use ▲▼ to pick different chord tones — make it your melody.'),
        rules: [b('変えるのは音の高さだけ', 'Change only the pitches'), b('使えるのはコードトーンのみ', 'Chord tones only')],
        editable: {
          material: 'chord-tone', bars: 4, divisions: [1], initial: 'quarters', fixedRhythm: true,
          requiredAction: 'pitch-change',
          task: b('▲▼で音を1つ以上選び替えて、自分のメロディーを作ってください。', 'Re-choose at least one pitch with ▲▼ to make the melody yours.'),
        },
      },
    ],
    selfCheck: [
      b('▲▼でコードごとに使える音が変わるのを確認した', 'I saw the available notes change with each chord'),
      b('どの音で止まっても伴奏と濁らなかった', 'Wherever I stopped, nothing clashed'),
    ],
    trivia: {
      why: b('コードトーンはコードが鳴っている間の安全地帯です。まず音を選ぶ判断だけを練習し、リズムの判断と分けるのが上達の近道です。', 'Chord tones are the safe zone. Practicing pitch choice separately from rhythm choice is the fast path.'),
    },
    estimatedMinutes: 8,
  },
  {
    id: 'r2-combine',
    chapterId: 'ch2',
    title: b('リズムと音を組み合わせる', 'Combine rhythm and pitch'),
    technicalName: 'Phrase/フレーズ',
    outcome: b('第1章のリズムと第2章の音選びを、初めて同時に使えるようになります。', 'For the first time, you’ll use Chapter 1’s rhythm and Chapter 2’s pitches together.'),
    progressionId: 'ii-V-I',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    keyLadder: LADDER_KEY,
    steps: [
      {
        title: b('リズムから作る', 'Rhythm first'),
        instruction: b('まず音の高さを気にせず、マスでリズムを作ります。休みも入れます。', 'Ignore pitch at first — lay down the rhythm in the cells, rests included.'),
        rules: [b('先にリズム、あとから音', 'Rhythm first, pitches after'), b('休みを合計2拍以上', 'At least 2 beats of rest total')],
        editable: {
          material: 'chord-tone', bars: 4, divisions: [1, 2, 3, 4], initial: 'empty',
          conditions: { minNotes: 6, minRestBeats: 2 },
          requiredAction: 'any-change',
          task: b('リズムを組んでから、▲▼で音を選び、4小節のフレーズにしてください。', 'Build the rhythm, then choose pitches with ▲▼ to finish a 4-bar phrase.'),
        },
      },
    ],
    selfCheck: [
      b('リズム→音の順番で作れた', 'I worked rhythm-first, pitches-second'),
      b('作ったフレーズを自分の楽器で再現できた', 'I reproduced my phrase on my instrument'),
    ],
    trivia: {
      mistakes: [b('音を選びながらリズムも直したくなる → 一度に変えるのは1つだけ', 'Tweaking rhythm while choosing pitches — one thing at a time.')],
    },
    estimatedMinutes: 10,
  },
  {
    id: 'r2-phrase',
    chapterId: 'ch2',
    title: b('4小節のフレーズを完成させる', 'Finish your 4-bar phrase'),
    technicalName: 'Phrase Building/フレーズ作成',
    outcome: b('リズム・音・表情のすべてを自分で決めた、4小節の「持ちネタ」を1つ完成させます。', 'You’ll complete one 4-bar phrase of your own — rhythm, pitches and expression all yours.'),
    progressionId: 'ii-V-I',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    keyLadder: LADDER_KEY,
    steps: [
      {
        title: b('参考の形を聴く', 'Hear a reference shape'),
        instruction: b('チャールストンのリズムに乗ったコードトーンの譜例です。「こういう密度でいい」という目安にします(まねする必要はありません)。', 'Chord tones on a Charleston rhythm — a density reference, not something to copy.'),
        content: { source: 'chord-tones', rhythm: 'charleston' },
      },
      {
        title: b('自分の4小節を作る', 'Build your 4 bars'),
        instruction: b('リズム・音・アクセントを自由に使って、始まりと終わりのある4小節を完成させます。完成したら「コードと一緒に確認」→自分の楽器で演奏。', 'Use rhythm, pitch and articulation freely to finish 4 bars with a beginning and an end. Check with the chords, then play it yourself.'),
        rules: [b('休みを合計2拍以上残す', 'Keep at least 2 beats of rest'), b('音符は6個以上', 'At least 6 notes')],
        editable: {
          material: 'chord-tone', bars: 4, divisions: [1, 2, 3, 4], initial: 'empty', allowArticulation: true,
          conditions: { minNotes: 6, minRestBeats: 2 },
          requiredAction: 'any-change',
          task: b('リズム・音・表情を自由に使って、自分の4小節フレーズを完成させてください。', 'Complete your own 4-bar phrase using rhythm, pitch and articulation.'),
        },
      },
    ],
    selfCheck: [
      b('4小節に「言い切った感」がある', 'The 4 bars sound like a finished statement'),
      b('聴いた響きが想像と合っていた', 'What I heard matched what I imagined'),
      b('自分の楽器で最後まで演奏できた', 'I played it through on my instrument'),
    ],
    trivia: {
      why: b('アドリブは「その場で作曲」です。時間を止めて一度自分の判断でフレーズを完成させておくと、即興でも同じ判断ができるようになります。', 'Improvising is composing in real time. Making these choices once with the clock stopped rehearses you for making them live.'),
    },
    estimatedMinutes: 12,
  },

  // ================= 第3章 コード進行を音で =================
  {
    id: 'r3-thirds',
    chapterId: 'ch3',
    title: b('3度でコードの表情を弾く', 'Play the 3rd — the chord’s face'),
    technicalName: '3rd/3度',
    outcome: b('各コードの3度1音だけで、明るい/暗いというコードの表情を鳴らし分けられるようになります。', 'With one note — the 3rd — you’ll make each chord’s bright-or-dark character audible.'),
    progressionId: 'ii-V-I',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    keyLadder: LADDER_KEY,
    steps: [
      {
        title: b('3度を伸ばす', 'Hold the 3rd'),
        instruction: b('各コードの3度を小節いっぱい伸ばす譜例です。F→B→E(キーC)の流れとコードの明暗を耳に入れます。', 'Hold each 3rd for a full bar: F→B→E in C. Hear the minor/major shading.'),
        content: { source: 'third', rhythm: 'basic' },
      },
      {
        title: b('第1章のリズムで', 'Now with your groove'),
        instruction: b('同じ3度を、裏拍から入る形で弾く譜例です。音は変えず、ノリだけ第1章のものに変わっています。', 'The same 3rds entering on the offbeat — same notes, Chapter 1 feel.'),
        content: { source: 'third', rhythm: 'offbeat' },
      },
    ],
    selfCheck: [
      b('1音でコードが変わったと分かった', 'One note was enough to hear the change'),
      b('マイナーとメジャーの表情の違いを感じた', 'I felt the minor vs major shading'),
    ],
    trivia: {
      why: b('3度はコードがメジャーかマイナーかを決める音です。ルートより雄弁で、この1音だけで「進行が分かって弾いている」響きになります。', 'The 3rd decides major vs minor. It says more than the root — one note and you sound like you know the changes.'),
    },
    estimatedMinutes: 6,
  },
  {
    id: 'r3-guide',
    chapterId: 'ch3',
    title: b('ガイドトーンの道を歩く', 'Walk the guide-tone path'),
    technicalName: 'Guide Tone/ガイドトーン',
    outcome: b('3度と7度をつないで、少ない音でコード進行そのものを表現できるようになります。', 'Linking 3rds and 7ths, you’ll express the whole progression with very few notes.'),
    progressionId: 'ii-V-I',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    keyLadder: LADDER_KEY,
    steps: [
      {
        title: b('1本目の道', 'Path one'),
        instruction: b('F→F→E(キーC)。コードが変わるとき、音は半音か同じ場所しか動きません。', 'F→F→E in C. At each change the note moves a half step — or stays put.'),
        content: { source: 'custom-path', path: ['third', 'seventh', 'third'], rhythm: 'basic' },
      },
      {
        title: b('2本目の道', 'Path two'),
        instruction: b('もう1本の道: C→B→B。', 'The other thread: C→B→B.'),
        content: { source: 'custom-path', path: ['seventh', 'third', 'seventh'], rhythm: 'basic' },
      },
      {
        title: b('道の上でリズムを作る', 'Your rhythm on the path'),
        instruction: b('音はガイドトーン(3度・7度)だけ。▲▼とマスで、道の上に自分のリズムを作ります。', 'Guide tones only. Build your own rhythm along the path with the cells and ▲▼.'),
        rules: [b('使える音は3度と7度だけ', '3rds and 7ths only'), b('休みを合計2拍以上', 'At least 2 beats of rest')],
        editable: {
          material: 'guide-tone', bars: 4, divisions: [1, 2, 3, 4], initial: 'halves',
          conditions: { minNotes: 4, minRestBeats: 2 },
          requiredAction: 'any-change',
          task: b('ガイドトーンだけで、自分のリズムの4小節を作ってください。', 'Build 4 bars of your own rhythm using only guide tones.'),
        },
      },
    ],
    selfCheck: [
      b('音数が少なくてもコードが変わった感じがした', 'Few notes, but the changes came through'),
      b('隣のコードへなめらかに移れた', 'I moved smoothly between chords'),
    ],
    trivia: {
      why: b('3度と7度は隣のコードへ半音・全音でつながります。この「道」を知っていれば、迷ってもいつでも帰ってこられます。', '3rds and 7ths connect to the next chord by step. Know the path and you can always find your way home.'),
    },
    estimatedMinutes: 10,
  },
  {
    id: 'r3-target',
    chapterId: 'ch3',
    title: b('次のコードへ着地する', 'Land on the next chord'),
    technicalName: 'Target Note/ターゲットノート',
    outcome: b('フレーズの最後を次のコードの3度に「ぴたっと着地」させられるようになります。', 'You’ll end phrases by landing squarely on the next chord’s 3rd.'),
    progressionId: 'ii-V-I',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    keyLadder: LADDER_KEY,
    steps: [
      {
        title: b('着地点だけ弾く', 'Landings only'),
        instruction: b('各小節の頭で3度だけを弾く譜例です。「コードが変わる瞬間に正しい音に居る」感覚をつかみます。', 'Only the 3rd on each downbeat — be on the right note at the moment of change.'),
        content: { source: 'third', rhythm: 'basic' },
      },
      {
        title: b('助走を付ける', 'Add the runway'),
        instruction: b('着地の1拍前に助走の音を入れる譜例です(4拍目→次の頭)。', 'One approach note on beat 4, then the landing.'),
        content: { source: 'landing-approach', targetDegree: 'third' },
      },
      {
        title: b('着地するフレーズを作る', 'Build a landing phrase'),
        instruction: b('自由にフレーズを作り、ただし最後の音だけは「その小節のコードの3度」で終えます。', 'Build freely — but the very last note must be the 3rd of its bar’s chord.'),
        rules: [b('最後の音は3度で終える', 'End on the 3rd'), b('休みも入れる', 'Include rests')],
        editable: {
          material: 'chord-tone', bars: 4, divisions: [1, 2, 3, 4], initial: 'empty',
          conditions: { minNotes: 5, minRestBeats: 1, requireEndOn3rd: true },
          requiredAction: 'any-change',
          task: b('最後の音が3度で終わる4小節のフレーズを作ってください。', 'Build a 4-bar phrase whose final note is the 3rd.'),
        },
      },
    ],
    selfCheck: [
      b('着地の瞬間に「解決した感じ」がした', 'The landing felt resolved'),
      b('着地点を決めてから前を作れた', 'I planned the landing first, then the approach'),
    ],
    trivia: {
      why: b('上手く聞こえる人は、コードが変わる瞬間に正しい音に居ます。着地を先に決めると、途中が多少揺れても説得力が出ます。', 'Players who sound like they know the changes are simply on the right note at the change. Decide the landing first.'),
    },
    estimatedMinutes: 10,
  },
  {
    id: 'r3-approach',
    chapterId: 'ch3',
    title: b('半音の助走で飾る', 'Decorate with half-step runways'),
    technicalName: 'Approach/アプローチノート',
    outcome: b('半音下・半音上・上下で挟む3種類の助走で、着地を飾れるようになります。', 'Three runways — from below, from above, and surrounding — to decorate your landings.'),
    progressionId: 'ii-V-I',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      { title: b('半音下から', 'From below'), instruction: b('「半音下→ターゲット」の2音を各コードの3度へ。短く滑り込みます。', 'Half step below → target, into each 3rd. Slide in short.'), content: { source: 'approach-pair', targetDegree: 'third', approachFrom: 'below' } },
      { title: b('半音上から', 'From above'), instruction: b('反対側から: 「半音上→ターゲット」。', 'The other side: step above → target.'), content: { source: 'approach-pair', targetDegree: 'third', approachFrom: 'above' } },
      { title: b('上下で挟む', 'Surround it'), instruction: b('「上→下→ターゲット」の3音セット(エンクロージャー)。ビバップ以来の定番です。', 'Above → below → target: the classic enclosure.'), content: { source: 'enclosure', targetDegree: 'third' } },
    ],
    selfCheck: [
      b('助走の音を短く、着地を長く弾けた', 'Short runways, long landings'),
      b('スケール外の音でも濁って聞こえなかった', 'The outside notes never sounded wrong'),
    ],
    trivia: {
      why: b('半音の音はスケール外でも、短く弾いてすぐ解決すれば濁りません。この一瞬の緊張こそジャズらしさの正体です。', 'Chromatic notes don’t clash if they resolve immediately — that instant of tension is the jazz sound.'),
      mistakes: [b('助走を長く弾いて間違いに聞こえる → ささやいてから言い切るイメージで', 'Held approach notes sound like mistakes — whisper, then state.')],
    },
    estimatedMinutes: 8,
  },

  // ================= 第4章 モチーフ =================
  {
    id: 'r4-seed',
    chapterId: 'ch4',
    title: b('種を作って植える', 'Plant a seed'),
    technicalName: 'Motif/モチーフ',
    outcome: b('2〜4音の短いモチーフを作り、全小節で繰り返せるようになります。', 'You’ll make a 2–4 note motif and repeat it through every bar.'),
    progressionId: 'ii-V-I',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    keyLadder: LADDER_KEY,
    steps: [
      {
        title: b('サンプルの種', 'A sample seed'),
        instruction: b('1小節目にサンプルのモチーフ(1-3-5・タン・タン・ターン)を示します。繰り返すとコードの変化で表情が変わって聞こえます。', 'Bar 1 shows a sample motif (1-3-5, “dah dah daah”). Repeated, the changing chords recolor it.'),
        content: { source: 'sample-motif', motifVariant: 'repeat' },
      },
      {
        title: b('自分の種を植える', 'Plant your own'),
        instruction: b('1小節目に2〜4音のモチーフを作り、「⧉前の小節をコピー」で4小節に増やします。音は各小節のコードに自動で合わせ直されます。', 'Build a 2–4 note motif in bar 1, then use “copy previous bar” to plant it in all four. Pitches re-map to each bar’s chord automatically.'),
        rules: [b('モチーフは2〜4音・1小節以内', '2–4 notes, within one bar'), b('4小節とも同じ形にする', 'Same shape in all four bars')],
        editable: {
          material: 'chord-tone', bars: 4, divisions: [1, 2, 3, 4], initial: 'empty',
          conditions: { minNotes: 8 },
          requiredAction: 'any-change',
          task: b('1小節目にモチーフを作り、コピーで4小節へ植えてください。', 'Build the motif in bar 1 and copy it through all 4 bars.'),
        },
      },
    ],
    selfCheck: [
      b('同じ形なのにコードで響きが変わって聞こえた', 'The same shape changed color over each chord'),
      b('繰り返しを「手抜き」と感じず堂々と弾けた', 'I repeated proudly, not apologetically'),
    ],
    trivia: {
      why: b('聴き手は繰り返しを「意図」として受け取ります。同じ形が戻ってくるだけで、即興が作曲されたもののように聞こえ始めます。', 'Listeners hear repetition as intention — when a shape returns, improvisation starts sounding composed.'),
    },
    estimatedMinutes: 10,
  },
  {
    id: 'r4-vary',
    chapterId: 'ch4',
    title: b('一箇所だけ変えて育てる', 'Change exactly one thing'),
    technicalName: 'Motif Development/モチーフ展開',
    outcome: b('モチーフの「リズムだけ」「最後の音だけ」を変えて、種から違う花を咲かせられるようになります。', 'Varying only the rhythm — or only the last note — you’ll grow different flowers from one seed.'),
    progressionId: 'ii-V-I',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      { title: b('リズムだけ変える', 'Rhythm only'), instruction: b('サンプルモチーフを、音はそのままリズムだけ変えた形です(ターン・タッ・ターン)。', 'The sample motif with identical pitches, new rhythm: “daah-da-daah.”'), content: { source: 'sample-motif', motifVariant: 'rhythm' } },
      { title: b('最後だけ変える', 'Last note only'), instruction: b('元のリズムに戻し、最後の音だけ5度→7度に変えた形です。', 'Original rhythm restored; only the final note changes (5th→7th).'), content: { source: 'sample-motif', motifVariant: 'landing' } },
      { title: b('交互に回す', 'Alternate'), instruction: b('そのまま→リズム変化→そのまま→着地変化、の4小節。1小節ごとに一箇所だけ変わっています。', 'Original → rhythm change → original → landing change. One change per bar.'), content: { source: 'sample-motif', motifVariant: 'alternate' } },
    ],
    selfCheck: [
      b('変化してもモチーフだと聴き取れた', 'The variations still sounded like the motif'),
      b('自分のモチーフでも同じ2種類の変化を試した', 'I tried both variations on my own motif'),
    ],
    trivia: {
      why: b('展開のコツは「ほとんど同じで、少しだけ違う」。全部変えると別のフレーズになり、何も変えないと停滞します。', 'Development means mostly-the-same, slightly-different. All-new is a different phrase; no-change stalls.'),
    },
    estimatedMinutes: 8,
  },
  {
    id: 'r4-qa',
    chapterId: 'ch4',
    title: b('問いと答えを作る', 'Question and answer'),
    technicalName: 'Call & Response/コール&レスポンス',
    outcome: b('前半2小節の「問い」に後半2小節で「答える」、会話のような4小節を作れるようになります。', 'You’ll pair a 2-bar question with a 2-bar answer — four bars that talk.'),
    progressionId: 'ii-V-I',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    keyLadder: LADDER_KEY,
    steps: [
      {
        title: b('問いだけを聴く', 'The question alone'),
        instruction: b('前半2小節だけ音があり、後半は沈黙する譜例です。「続きが聴きたくなる」感じを確認します。', 'Sound in bars 1–2, silence after — feel how it asks for a reply.'),
        content: { source: 'chord-tones', rhythm: 'charleston', activeMeasures: [0, 1] },
      },
      {
        title: b('問いと答えを作る', 'Build the pair'),
        instruction: b('前半2小節に問いを作り、後半2小節に「似た形の返事」を作ります。間に一呼吸の休みを。', 'Build a question in bars 1–2 and a similar-shaped answer in bars 3–4, with a breath between.'),
        rules: [b('前半=問い、後半=答え', 'Bars 1–2 ask; bars 3–4 answer'), b('答えは問いのリズムを引用する', 'The answer borrows the question’s rhythm'), b('間に休みを置く', 'Breathe between them')],
        editable: {
          material: 'chord-tone', bars: 4, divisions: [1, 2, 3, 4], initial: 'empty',
          conditions: { minNotes: 6, minRestBeats: 2 },
          requiredAction: 'any-change',
          task: b('前半の問いと、その形を引用した後半の答えを作ってください。', 'Build a question, then an answer that quotes its shape.'),
        },
      },
    ],
    selfCheck: [
      b('4小節がひとつの会話に聞こえた', 'The four bars sounded like one exchange'),
      b('答えの終わりに「言い終えた感」があった', 'The answer landed with completion'),
    ],
    trivia: {
      why: b('問いと答えの構造は、ブルースもゴスペルもジャズも支える背骨です。フレーズを対で考えるだけでソロに物語が生まれます。', 'Question-answer powers blues, gospel and jazz alike. Thinking in pairs gives your solo a narrative.'),
    },
    estimatedMinutes: 10,
  },
  {
    id: 'r4-sequence',
    chapterId: 'ch4',
    title: b('コードに合わせて種を動かす', 'Move the seed with the chords'),
    technicalName: 'Sequence/シークエンス',
    outcome: b('モチーフの形とリズムを保ったまま、各コードの高さへ平行移動できるようになります。', 'You’ll slide a motif’s shape onto each chord, keeping contour and rhythm intact.'),
    progressionId: 'ii-V-I',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      { title: b('波の形を確認', 'Know the wave'), instruction: b('1-3-5-3の「波」を各コードのコードトーンに乗せて動かす譜例です。', 'The 1-3-5-3 wave, sliding onto each chord’s tones.'), content: { source: 'chord-tones', rhythm: 'basic', arpPattern: 'wave' } },
      { title: b('モチーフでも', 'The motif too'), instruction: b('サンプルモチーフ(1-3-5)を同じように各コードへ移動した形です。輪郭とリズムは同じ、高さだけ変わります。', 'The sample motif slid the same way — same contour and rhythm, new heights.'), content: { source: 'sample-motif', motifVariant: 'sequence' } },
    ],
    selfCheck: [
      b('形が同じままコードにハマるのを確認した', 'The shape stayed intact and fit every chord'),
      b('自分のモチーフでも移動を試した', 'I moved my own motif too'),
    ],
    trivia: {
      why: b('形を保って高さを変える「シークエンス」は、バッハからビバップまで共通の技法です。コードトーンの知識とモチーフがここで合流します。', 'Keeping shape while shifting pitch powers everything from Bach to bebop — chord-tone knowledge and motifs merge here.'),
    },
    estimatedMinutes: 8,
  },

  // ================= 第5章 ジャズブルース =================
  {
    id: 'r5-form',
    chapterId: 'ch5',
    title: b('12小節の地図を持つ', 'Carry the 12-bar map'),
    technicalName: 'Blues Form/ブルースフォーム',
    outcome: b('12小節ブルースを4小節×3ブロックの地図として追えるようになります。', 'You’ll navigate the 12-bar blues as three 4-bar blocks.'),
    progressionId: 'blues',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      { title: b('入口だけ', 'Entrances only'), instruction: b('1・5・9小節目の頭でルートを1音。他は休んで小節を数えます。', 'One root at bars 1, 5 and 9. Count through the rest.'), content: { source: 'root', rhythm: 'basic', activeMeasures: [0, 4, 8] } },
      { title: b('変化に印を', 'Mark the turns'), instruction: b('コードが変わる小節だけ音を出します。地図の解像度を上げます。', 'Sound a note only where the chord changes — sharpen the map.'), content: { source: 'root', rhythm: 'basic', activeOnChordChangesOnly: true } },
    ],
    selfCheck: [
      b('12小節を3ブロックで捉えられた', 'I felt the form as three blocks'),
      b('迷っても次のブロック頭で復帰できた', 'Even lost, I re-entered at the next block'),
    ],
    trivia: {
      why: b('長い進行は暗記ではなく地図で捉えます。起(1〜4)・展開(5〜8)・結(9〜12)の入口さえ意識すれば、途中で迷っても帰れます。', 'You map long forms, not memorize them: statement, development, resolution. Track the entrances and you can always re-board.'),
    },
    estimatedMinutes: 8,
  },
  {
    id: 'r5-bluenote',
    chapterId: 'ch5',
    title: b('ブルーノートを知る', 'Meet the blue notes'),
    technicalName: 'Blue Note/ブルーノート',
    outcome: b('3度と5度を半音下げた「ブルーノート」で、一気にブルースの響きを出せるようになります。', 'Lowering the 3rd and 5th a half step — blue notes — instantly gives you the blues sound.'),
    progressionId: 'blues',
    defaultBpm: 70,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      {
        title: b('明→暗を聴く', 'Bright to dark'),
        instruction: b('ルート→3度→♭3度と弾く譜例です。3度が半音下がった瞬間の「ブルースの顔」を聴きます。', 'Root → 3rd → flat 3rd. Hear the face of the blues appear as the 3rd drops.'),
        content: { source: 'blue-note-demo' },
      },
      {
        title: b('ブルースリフを聴く', 'Hear a blues riff'),
        instruction: b('♭3と♭7を使った定番リフの譜例です。同じ形が全コードで通用するのがブルースの面白さです。', 'A classic riff using ♭3 and ♭7 — the same shape works over every chord.'),
        content: { source: 'blues-riff' },
      },
      {
        title: b('ブルーノートで作る', 'Build with blue notes'),
        instruction: b('使える音にブルーノート(♭3・♭5)が加わりました。▲▼で選びながら、最初の4小節にフレーズを作ります。', 'Your palette now includes ♭3 and ♭5. Build a phrase over the first 4 bars.'),
        rules: [b('♭3か♭5を必ず使う', 'Use ♭3 or ♭5'), b('休みも入れる', 'Include rests')],
        editable: {
          material: 'blues', bars: 4, divisions: [1, 2, 3, 4], initial: 'empty',
          conditions: { minNotes: 6, minRestBeats: 1 },
          requiredAction: 'any-change',
          task: b('ブルーノートを混ぜた4小節のフレーズを作ってください。', 'Build a 4-bar phrase mixing in blue notes.'),
        },
      },
    ],
    selfCheck: [
      b('♭3の「泣き」の響きを聴き取れた', 'I heard the cry of the flat 3rd'),
      b('ブルーノート入りのフレーズを自分の楽器で弾けた', 'I played a blue-note phrase on my instrument'),
    ],
    trivia: {
      why: b('ブルーノートは「間違った音」ではなく、明と暗の間を揺れるブルースの声です。理屈より先に、響きで覚えてしまいましょう。', 'Blue notes aren’t wrong notes — they’re the blues voice bending between bright and dark. Learn the sound before the theory.'),
    },
    estimatedMinutes: 10,
  },
  {
    id: 'r5-riff',
    chapterId: 'ch5',
    title: b('リフで1コーラス通す', 'One riff, one chorus'),
    technicalName: 'Riff/リフ',
    outcome: b('1小節のリフを12小節持続して、初めての「1コーラス」を演奏できるようになります。', 'You’ll sustain a one-bar riff through 12 bars — your first full chorus.'),
    progressionId: 'blues',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      {
        title: b('リフの持続を聴く', 'Hear a riff persist'),
        instruction: b('同じリフが12小節続く譜例です。コードが変わってもリフは動じません。', 'The same riff through all 12 bars — the chords move, the riff holds its ground.'),
        content: { source: 'blues-riff' },
      },
      {
        title: b('自分のリフで12小節', 'Your riff, 12 bars'),
        instruction: b('1小節目にリフを作り、「⧉前の小節をコピー」で12小節へ。作ったら通しで再生し、自分の楽器で1コーラス弾きます。', 'Build your riff in bar 1 and copy it through 12 bars. Play the chorus back, then play it yourself.'),
        rules: [b('リフは1小節・そのまま繰り返す', 'One bar, repeated as-is'), b('欲張って変えない', 'Resist changing it')],
        editable: {
          material: 'blues', bars: 12, divisions: [1, 2, 3, 4], initial: 'empty',
          conditions: { minNotes: 12 },
          requiredAction: 'any-change',
          task: b('1小節のリフを作り、コピーで12小節に広げてください。', 'Build a one-bar riff and copy it through all 12 bars.'),
        },
      },
    ],
    selfCheck: [
      b('12小節を最後まで通せた', 'I made it through all 12 bars'),
      b('コードが変わってもリフを保てた', 'The riff held as the chords moved'),
    ],
    trivia: {
      why: b('リフはブルースの背骨です。「変えない勇気」が1コーラスの体力を作ります。', 'Riffs are the backbone of the blues — the discipline of not changing builds your chorus stamina.'),
    },
    estimatedMinutes: 12,
  },
  {
    id: 'r5-callresponse',
    chapterId: 'ch5',
    title: b('ブルースで掛け合う', 'Call and response blues'),
    technicalName: 'Call & Response/コール&レスポンス',
    outcome: b('ブルースの上で2小節の問いと答えを交わし、歌うようなコーラスを作れるようになります。', 'Trading 2-bar calls and answers over the blues, you’ll make a chorus that sings.'),
    progressionId: 'blues',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      {
        title: b('問いを聴く', 'Hear the call'),
        instruction: b('最初の2小節だけ音がある譜例です。ブルースの「歌い出し」の呼吸をつかみます。', 'Sound only in the first 2 bars — the breath of a blues vocal line.'),
        content: { source: 'blues-riff', activeMeasures: [0, 1] },
      },
      {
        title: b('掛け合いを作る', 'Build the exchange'),
        instruction: b('最初の4小節で、2小節の問い→2小節の答えを作ります。ブルーノートを使うと一気に歌になります。', 'Over the first 4 bars, build a 2-bar call and a 2-bar answer. Blue notes make it sing.'),
        rules: [b('前半2小節=問い、後半2小節=答え', '2-bar call, 2-bar answer'), b('間に休みを置く', 'Breathe between them')],
        editable: {
          material: 'blues', bars: 4, divisions: [1, 2, 3, 4], initial: 'empty',
          conditions: { minNotes: 6, minRestBeats: 2 },
          requiredAction: 'any-change',
          task: b('ブルーノートを使った問いと答えの4小節を作ってください。', 'Build a 4-bar call-and-answer using blue notes.'),
        },
      },
    ],
    selfCheck: [
      b('問いと答えが会話に聞こえた', 'The call and answer talked to each other'),
      b('ブルーノートが「歌って」聞こえた', 'The blue notes sang'),
    ],
    estimatedMinutes: 10,
  },

  // ================= 第6章 1コーラスのソロ =================
  {
    id: 'r6-blueprint',
    chapterId: 'ch6',
    title: b('ソロの設計図を描く', 'Draw the solo blueprint'),
    technicalName: 'Solo Construction/ソロ構成',
    outcome: b('「静かに始める→育てる→着地する」の設計図で、ソロの起伏を考えられるようになります。', 'Start quiet → build → land: you’ll plan a solo’s arc before playing it.'),
    progressionId: 'blues',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('材料を見渡す', 'Survey your materials'),
        instruction: b('各コードで使えるおすすめスケールの一覧です。ここまでの道具(リズム・ガイドトーン・着地・モチーフ・ブルーノート)を思い出しながら眺めます。', 'The recommended scales per chord. Look them over while recalling all your tools so far.'),
        content: { source: 'scale' },
      },
      {
        title: b('設計図を歌う', 'Sing the blueprint'),
        instruction: b('弾く前に「前半は少なく・中盤で育てて・最後は着地」を口で歌って決めます。伴奏を流して頭の中で1コーラス設計します。', 'Before playing, sing the plan: sparse start, growing middle, landed ending. Run the backing and design a chorus in your head.'),
        content: { source: 'guide-tones', rhythm: 'basic' },
      },
    ],
    selfCheck: [
      b('どこで盛り上げてどこで締めるか決めてから弾いた', 'I decided where to build and where to close before playing'),
      b('起伏の設計を口で説明できた', 'I could describe my arc out loud'),
    ],
    trivia: {
      why: b('最初から全力だと行き場がなく、ずっと同じ密度だと平坦です。1コーラスの物語を設計する力が、そのまま長いソロの設計力になります。', 'Full blast from bar 1 leaves nowhere to go. Learning to shape one chorus is the skill that scales.'),
    },
    estimatedMinutes: 8,
  },
  {
    id: 'r6-chorus',
    chapterId: 'ch6',
    title: b('自分の1コーラスを作る', 'Build your own chorus'),
    technicalName: 'One Chorus/1コーラス',
    outcome: b('12小節のソロを自分で作り、演奏して、コースを修了します。', 'You’ll compose and play your own 12-bar solo — and complete the course.'),
    progressionId: 'blues',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      {
        title: b('12小節を作る', 'Compose the 12 bars'),
        instruction: b('設計図に沿って12小節のソロを作ります。前半(1〜4)は少なく、中盤(5〜8)で育て、後半(9〜12)で着地。モチーフのコピーも、ブルーノートも、アクセントも全部使えます。', 'Following your blueprint, build 12 bars: sparse start, growing middle, landed ending. Copy-bar, blue notes and articulations are all yours.'),
        rules: [b('前半は音数少なめ', 'Keep the opening sparse'), b('休みを合計4拍以上', 'At least 4 beats of rest'), b('最後は着地して締める', 'Land the ending')],
        editable: {
          material: 'blues', bars: 12, divisions: [1, 2, 3, 4], initial: 'empty', allowArticulation: true,
          conditions: { minNotes: 12, minRestBeats: 4 },
          requiredAction: 'any-change',
          task: b('起伏のある12小節のソロを作り、通しで確認してから自分の楽器で演奏してください。', 'Build a 12-bar solo with an arc, check it through, then play it yourself.'),
        },
      },
    ],
    selfCheck: [
      b('ソロに始まり・中間・終わりを感じた', 'The solo had a beginning, middle and end'),
      b('作った1コーラスを自分の楽器で最後まで演奏できた', 'I played my chorus through on my instrument'),
      b('次は「曲で実践」で別の進行にも挑戦したい', 'I’m ready to try other forms in Play a Tune'),
    ],
    trivia: {
      why: b('コース修了です!ここで作った1コーラスがあなたの最初の「持ちネタ」。「曲で実践」でミッションを選び、別の進行・別のキーでも試してみましょう。', 'Course complete! This chorus is your first keeper. Head to Play a Tune and try your blueprint on other forms and keys.'),
    },
    estimatedMinutes: 15,
  },
];

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export function lessonsOfChapter(chapterId: string): Lesson[] {
  return LESSONS.filter((l) => l.chapterId === chapterId);
}

/** コース内の全レッスンを章順に並べたID配列 */
export function courseLessonIds(course: Course): string[] {
  return course.chapterIds.flatMap((cid) => lessonsOfChapter(cid).map((l) => l.id));
}
