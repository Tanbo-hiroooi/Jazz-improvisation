// 練習コース「リズムから始めるアドリブ入門」
// 設計方針(2026年7月): 理論からではなく、リズム → 音選び → 置く拍 → つなぐ → 語る → 1コーラス の順で学ぶ。
// 基本ルールは「一度に変えるものは1つだけ」。
//
// 文章の書き方(全レッスン共通):
//   - タイトルは「やること」が分かる動作形にする(「3度で表情を弾く」ではなく「各コードの3度を1音だけ置く」)
//   - 本文には行動だけを書く。理由・背景は折りたたみの豆知識(trivia)へ逃がす
//   - 指示の語尾は「〜しよう」「〜してみよう」
//   - 楽器を選ばない語を使う(「弾く」ではなく「演奏する」「音を出す」)
//   - ルールチップに書いた条件は本文で繰り返さない
//
// 各章の最後は【通し】レッスン(isThrough)。12小節ブルースで、その章の技だけを使って1コーラス作る。

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
  technicalName?: Bi;
  /** ① このレッスンでできるようになること */
  outcome: Bi;
  progressionId: ProgressionId;
  /** 章の最後の「通し」レッスン(12小節を1コーラス作る) */
  isThrough?: boolean;
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
      '理論の暗記からではなく、ジャズらしいノリを体に入れることから始めるコースです。一度に変えるものは1つだけ。各章の最後は12小節ブルースを1コーラス通します。',
      'Start with the jazz feel, not theory. Change only one thing at a time, and close every chapter with a full 12-bar blues chorus.',
    ),
    chapterIds: ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6'],
  },
];

export const CHAPTERS: Chapter[] = [
  {
    id: 'ch1',
    title: b('第1章: 1音とリズムだけでスウィングする', 'Ch. 1: Swing with one note and rhythm'),
    purpose: b('音は1音だけ。リズム・休符・裏拍でジャズのノリを体に入れる。', 'One note only — internalize the feel through rhythm, rests and offbeats.'),
  },
  {
    id: 'ch2',
    title: b('第2章: コードの中から使う音を選ぶ', 'Ch. 2: Pick your notes from the chord'),
    purpose: b('各コードで使える音が分かり、4小節を自分で作れるようになる。', 'Learn which notes fit each chord and build your own four bars.'),
  },
  {
    id: 'ch3',
    title: b('第3章: 拍の頭と裏を使い分けて音を置く', 'Ch. 3: Choose the beat you play on'),
    purpose: b('同じ音でも、出す拍を変えるだけで聞こえ方が変わると分かる。', 'The same notes sound different depending on where in the bar you place them.'),
  },
  {
    id: 'ch4',
    title: b('第4章: コードが変わる小節間を半音で繋げる', 'Ch. 4: Cross the barline by a half step'),
    purpose: b('小節が変わってもフレーズが切れず、半音でつながるようになる。', 'Keep the line going across the changes by moving just a half step.'),
  },
  {
    id: 'ch5',
    title: b('第5章: 同じ形を繰り返して1コーラスにする', 'Ch. 5: Repeat one shape for a whole chorus'),
    purpose: b('短い形を繰り返し、少しだけ変えて12小節をまとめる。', 'Repeat a short shape, vary it slightly, and hold a whole 12 bars together.'),
  },
  {
    id: 'ch6',
    title: b('第6章: ブルースで1コーラスのソロを作る', 'Ch. 6: Write your own blues chorus'),
    purpose: b('12小節のソロを自分で作って、最後まで演奏する。', 'Build a 12-bar solo of your own and play it all the way through.'),
  },
];

export const LESSONS: Lesson[] = [
  // ================= 第1章 1音とリズムだけでスウィングする =================
  {
    id: 'r1-quarters',
    chapterId: 'ch1',
    title: b('4分音符と休みだけで4小節作る', 'Build four bars from quarters and rests'),
    technicalName: b('スウィング', 'Swing'),
    outcome: b('2・4拍のクリックに乗って、4分音符と休みだけで演奏できる。', 'You can groove over a 2-and-4 click with nothing but quarter notes and rests.'),
    progressionId: 'ii-V-I',
    defaultBpm: 70,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      {
        title: b('2・4拍を感じる', 'Feel 2 and 4'),
        instruction: b('クリックは2拍目と4拍目だけ鳴ります。譜例を聴いて、同じように演奏してみよう。', 'The click sounds only on beats 2 and 4. Listen, then play along.'),
        rules: [b('音はルート1音だけ', 'One note only — the root'), b('2・4拍を体で感じる', 'Feel beats 2 and 4 in your body')],
        content: { source: 'root', rhythm: 'basic' },
      },
      {
        title: b('自分のリズムを作る', 'Build your own rhythm'),
        instruction: b('マスをタップして、4分音符と休みだけで4小節を作ろう。', 'Tap the cells and build four bars from quarter notes and rests.'),
        rules: [b('4分音符と休みだけ', 'Quarters and rests only'), b('音の高さは考えない', 'Ignore pitch for now')],
        editable: {
          material: 'root-only', bars: 4, divisions: [1], initial: 'empty', initialDivision: 1, fixedPitch: true,
          conditions: { minNotes: 6, minRestBeats: 2 },
          requiredAction: 'any-change',
          task: b('音を6個以上、休みを2拍以上入れて作ろう。', 'Use at least 6 notes and 2 beats of rest.'),
        },
      },
    ],
    selfCheck: [
      b('2・4拍のクリックを聴きながら演奏できた', 'I played while hearing the 2-and-4 click'),
      b('休みの間もノリが途切れなかった', 'The groove kept going through my rests'),
    ],
    trivia: {
      why: b('ジャズのリズム隊はハイハットを2・4拍で刻みます。数える場所を移すだけで、同じ4分音符がジャズに聞こえます。', 'Jazz drummers mark beats 2 and 4. Just moving your inner count there makes the same quarters swing.'),
      mistakes: [b('クリックを1・3拍と勘違いして裏返る → クリックは2・4拍', 'Hearing the click as 1 and 3 — flip it: the click is 2 and 4')],
    },
    estimatedMinutes: 6,
  },
  {
    id: 'r1-eighths',
    chapterId: 'ch1',
    title: b('裏拍から音を出す', 'Start notes on the offbeat'),
    technicalName: b('裏拍', 'Offbeats'),
    outcome: b('スウィングする8分音符を演奏し、裏拍から音を置ける。', 'You can play swinging 8ths and start notes on the offbeats.'),
    progressionId: 'ii-V-I',
    defaultBpm: 70,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      {
        title: b('スウィング8分を聴く', 'Hear the swing 8ths'),
        instruction: b('8分音符が「タータ」と跳ねる譜例です。まねして演奏し、跳ね方を体に入れよう。', 'The 8ths bounce “daa-da.” Copy it and absorb the bounce.'),
        rules: [b('音はルート1音だけ', 'Root only')],
        content: { source: 'root', rhythm: 'swing8' },
      },
      {
        title: b('裏拍だけで演奏する', 'Offbeats only'),
        instruction: b('オモテを休んで、裏拍だけ音を出す譜例です。クリックと交互に鳴る感覚をつかもう。', 'Rest on the beat and play only the “ands.” You and the click take turns.'),
        content: { source: 'root', rhythm: 'offbeat8' },
      },
      {
        title: b('裏拍入りのリズムを作る', 'Build with offbeats'),
        instruction: b('8分のマスを使って、裏拍(各拍の2つ目のマス)から始まる音を入れよう。', 'Using 8th cells, include a note that starts on an offbeat cell.'),
        rules: [b('裏拍から始まる音を1つ以上', 'At least one note starting on an offbeat')],
        editable: {
          material: 'root-only', bars: 4, divisions: [1, 2], initial: 'empty', fixedPitch: true,
          conditions: { minNotes: 4, requireOffbeatAttack: true },
          requiredAction: 'any-change',
          task: b('裏拍から始まる音を入れてみよう。', 'Include notes that start on offbeats.'),
        },
      },
    ],
    selfCheck: [
      b('8分音符が均等でなく「タータ」と跳ねた', 'My 8ths bounced instead of being even'),
      b('裏拍から入っても迷子にならなかった', 'Offbeat entries didn’t throw me off'),
    ],
    trivia: {
      why: b('ジャズの8分音符はオモテ長め・ウラ短めに揺れます。裏拍を自分で置けると、この揺れを能動的に作れます。この裏拍は第3章で、コードの役割と結びつけてもう一度使います。', 'Jazz 8ths are long-short, not even. Placing offbeats yourself makes the swing active. Chapter 3 brings them back, tied to what each chord is doing.'),
      mistakes: [b('裏拍のつもりがオモテに戻る → 「ん・タ」と口ずさんでから演奏する', 'Your “ands” drift onto the beat — sing “n-TAH” first')],
    },
    estimatedMinutes: 8,
  },
  {
    id: 'r1-rests',
    chapterId: 'ch1',
    title: b('各小節に休みを1拍以上入れる', 'Leave a beat of rest in every bar'),
    technicalName: b('休符', 'Space'),
    outcome: b('毎小節に「間」を置いて、呼吸のあるリズムを作れる。', 'You can leave space in every bar and make rhythms that breathe.'),
    progressionId: 'ii-V-I',
    defaultBpm: 70,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      {
        title: b('休みが主役のリズムを聴く', 'Hear a rhythm built on space'),
        instruction: b('「ターン・(休み)・タッ」の譜例です。まねして演奏しよう。', 'A “daah — (rest) — dat” figure. Copy it.'),
        rules: [b('音はルート1音だけ', 'Root only')],
        content: { source: 'root', rhythm: 'charleston' },
      },
      {
        title: b('休みを入れて作る', 'Build with space'),
        instruction: b('どの小節にも休みを残して、4小節を作ろう。', 'Build four bars, leaving space in every one of them.'),
        rules: [b('各小節に1拍以上の休み', 'At least one beat of rest per bar')],
        editable: {
          material: 'root-only', bars: 4, divisions: [1, 2], initial: 'empty', fixedPitch: true,
          conditions: { minNotes: 4, minRestBeatsPerBar: 1 },
          requiredAction: 'any-change',
          task: b('各小節に1拍以上の休みを入れよう。', 'Leave at least one beat of rest in each bar.'),
        },
      },
    ],
    selfCheck: [
      b('休みの間も心の中で拍を数え続けられた', 'I kept counting through the rests'),
      b('演奏しっぱなしにならなかった', 'I didn’t play non-stop'),
    ],
    trivia: {
      why: b('初心者のソロが苦しく聞こえる一番の原因は、休みが無いことです。間があるほどフレーズは輪郭を持ちます。', 'The main reason a beginner solo sounds breathless is no rests. Space gives a phrase its shape.'),
      mistakes: [b('休みで拍を見失う → 休みの間もクリックの2・4拍を数える', 'Losing the beat during rests — keep counting the 2-and-4 click')],
    },
    estimatedMinutes: 7,
  },
  {
    id: 'r1-syncopation',
    chapterId: 'ch1',
    title: b('小節線をまたぐ音を作る', 'Carry a note across the barline'),
    technicalName: b('食い', 'Anticipation'),
    outcome: b('拍や小節線をまたぐ音で、前のめりの推進力を出せる。', 'You can carry notes across beats and barlines for forward drive.'),
    progressionId: 'ii-V-I',
    defaultBpm: 70,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      {
        title: b('食いを聴く', 'Hear the anticipation'),
        instruction: b('次の小節の音を少し早く出す譜例です。前へ倒れる感じを聴き取ろう。', 'The next bar’s note arrives early. Listen for the forward lean.'),
        rules: [b('音はルート1音だけ', 'Root only')],
        content: { source: 'root', rhythm: 'anticipation' },
      },
      {
        title: b('食いを作る', 'Build an anticipation'),
        instruction: b('「→のばす」で、小節線をまたぐ音を作ろう。', 'Use “hold” to carry a note across a barline.'),
        rules: [b('小節線をまたぐ音を1つ以上', 'At least one note across a barline')],
        editable: {
          material: 'root-only', bars: 4, divisions: [1, 2], initial: 'empty', fixedPitch: true,
          conditions: { minNotes: 4, requireCrossBarHold: true },
          requiredAction: 'any-change',
          task: b('「→のばす」で小節線をまたぐ音を作ってみよう。', 'Use “hold” to carry a note over a barline.'),
        },
      },
    ],
    selfCheck: [
      b('小節線をまたいでも拍が分からなくならなかった', 'I kept my place across the barline'),
      b('前へ進む感じが出た', 'It leaned forward'),
    ],
    trivia: {
      why: b('拍の頭ちょうどに音を置き続けると行進曲になります。半拍だけ早く出すと、そこに推進力が生まれます。この食いは第3章で、解決を強める道具として使います。', 'Landing squarely on every beat sounds like a march. Arriving half a beat early creates drive. Chapter 3 uses this to strengthen resolutions.'),
      mistakes: [b('食いのあと拍を見失う → 先に口ずさんで体で覚える', 'Losing the beat after an anticipation — sing it first')],
    },
    estimatedMinutes: 8,
  },
  {
    id: 'r1-subdivision',
    chapterId: 'ch1',
    title: b('拍を3連・16分に切り替える', 'Switch a beat to triplets or 16ths'),
    technicalName: b('細分化', 'Subdivision'),
    outcome: b('拍ごとに3連や16分へ切り替えて、細かい彩りを混ぜられる。', 'You can switch individual beats to triplets or 16ths for fine-grained color.'),
    progressionId: 'ii-V-I',
    defaultBpm: 60,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      {
        title: b('3連を聴く', 'Hear the triplets'),
        instruction: b('1拍を3つに割った譜例です。1拍だけ細かくする感じを聴き取ろう。', 'One beat split into three. Notice that only one beat gets busy.'),
        rules: [b('音はルート1音だけ', 'Root only')],
        content: { source: 'root', rhythm: 'triplet' },
      },
      {
        title: b('細かい拍を混ぜる', 'Mix in a busy beat'),
        instruction: b('各拍の上のボタンで、その拍だけ3連や16分に切り替えよう。', 'Use the button above each beat to switch just that beat.'),
        rules: [b('3連と16分を1つずつ', 'One triplet beat and one 16th beat')],
        editable: {
          material: 'root-only', bars: 4, divisions: [1, 2, 3, 4], initial: 'empty', fixedPitch: true,
          conditions: { minNotes: 6, requireTriplet: true, requireSixteenth: true },
          requiredAction: 'any-change',
          task: b('3連と16分を1つずつ入れてみよう。', 'Include one triplet beat and one 16th beat.'),
        },
      },
    ],
    selfCheck: [
      b('細かい拍のあとでも次の拍の頭に戻れた', 'I landed back on the next beat cleanly'),
      b('全部を細かくせず1〜2か所に絞れた', 'I kept the busy beats to one or two spots'),
    ],
    trivia: {
      why: b('細かい音は「速く演奏できる」ためではなく、1か所だけ密度を上げて印象を作るための道具です。', 'Fast notes aren’t about speed — they raise the density in one spot to create an impression.'),
      mistakes: [b('全部16分にして平坦になる → 1小節に1か所だけにする', 'Making everything 16ths flattens it — limit it to one spot per bar')],
    },
    estimatedMinutes: 8,
  },

  // ================= 第2章 コードの中から使う音を選ぶ =================
  {
    id: 'n2-third',
    chapterId: 'ch2',
    title: b('各コードの3度を1音だけ置く', 'Place just the 3rd of each chord'),
    technicalName: b('3度', 'The 3rd'),
    outcome: b('3度1音だけで、コードの明るい・暗いを演奏し分けられる。', 'With just the 3rd you can sound the difference between bright and dark chords.'),
    progressionId: 'ii-V-I',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    keyLadder: LADDER_KEY,
    steps: [
      {
        title: b('3度を聴く', 'Hear the 3rd'),
        instruction: b('各コードの3度だけを鳴らした譜例です。明るさが変わるのを聴き取ろう。', 'Only the 3rd of each chord. Listen to the brightness change.'),
        rules: [b('音は3度1音だけ', 'The 3rd only')],
        content: { source: 'third' },
      },
      {
        title: b('3度でリズムを作る', 'Build a rhythm on the 3rd'),
        instruction: b('第1章のリズムのまま、音は各コードの3度だけで4小節を作ろう。', 'Keep your Chapter 1 rhythms, but use only each chord’s 3rd.'),
        rules: [b('使える音は3度だけ', 'The 3rd is the only note available')],
        editable: {
          material: 'third-only', bars: 4, divisions: [1, 2], initial: 'empty',
          conditions: { minNotes: 4, minRestBeatsPerBar: 1 },
          requiredAction: 'any-change',
          task: b('3度だけを使って、休みを入れた4小節を作ろう。', 'Build four bars from 3rds only, leaving rests.'),
        },
      },
    ],
    selfCheck: [
      b('Dm7が暗く、Cmaj7が明るく聞こえた', 'Dm7 sounded dark and Cmaj7 bright'),
      b('コードが変わると3度も変わるのが分かった', 'I noticed the 3rd move when the chord changed'),
    ],
    trivia: {
      why: b('3度はコードが明るいか暗いかを決める音です。ルートより雄弁で、この1音だけで「進行が分かって演奏している」響きになります。', 'The 3rd decides whether a chord is major or minor. It says more than the root — one note is enough to sound like you know the changes.'),
      mistakes: [b('音が単調に感じる → 音は1つでも、リズムを変えれば表情は変わります', 'Feels monotonous — one note is fine; change the rhythm instead')],
    },
    estimatedMinutes: 7,
  },
  {
    id: 'n2-guide',
    chapterId: 'ch2',
    title: b('各コードの3度と7度だけを演奏する', 'Play only the 3rd and 7th'),
    technicalName: b('ガイドトーン', 'Guide tones'),
    outcome: b('3度と7度の2音だけで、コードが進む感じを出せる。', 'Two notes — the 3rd and 7th — are enough to make the changes audible.'),
    progressionId: 'ii-V-I',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    keyLadder: LADDER_KEY,
    steps: [
      {
        title: b('2音で進行を聴く', 'Hear the changes in two notes'),
        instruction: b('各コードの3度と7度だけの譜例です。2音でも進行が分かるのを確かめよう。', 'Only 3rds and 7ths. Check that two notes still spell the changes.'),
        rules: [b('使う音は3度と7度だけ', '3rds and 7ths only')],
        content: { source: 'guide-tones', rhythm: 'basic' },
      },
      {
        title: b('ガイドトーンで4小節作る', 'Build four bars from guide tones'),
        instruction: b('3度と7度だけを使って、休みも入れながら4小節を作ろう。', 'Build four bars from 3rds and 7ths, leaving some rests.'),
        rules: [b('使える音は3度と7度だけ', 'Only 3rds and 7ths available')],
        editable: {
          material: 'guide-tone', bars: 4, divisions: [1, 2], initial: 'empty',
          conditions: { minNotes: 4, minRestBeats: 2 },
          requiredAction: 'any-change',
          task: b('3度と7度だけで4小節を作ろう。', 'Build four bars from 3rds and 7ths.'),
        },
      },
    ],
    selfCheck: [
      b('2音だけでもコードが変わったのが分かった', 'Two notes were enough to hear the chord change'),
      b('G7だけ落ち着かない響きになった', 'Only G7 sounded unsettled'),
    ],
    trivia: {
      why: b('3度と7度はコードの性格を決める2音です。G7ではこの2音が増4度(トライトーン)になり、それが「早く解決したい」の正体です。', 'The 3rd and 7th define a chord’s character. On G7 they form a tritone — that is what makes it want to resolve.'),
      mistakes: [b('音が足りなく感じる → まず2音で進行が見えることを確かめる。増やすのは次のレッスン', 'Feels too thin — first prove two notes work; you add more next lesson')],
    },
    estimatedMinutes: 8,
  },
  {
    id: 'n2-chordtone',
    chapterId: 'ch2',
    title: b('コードトーン4音から選んで作る', 'Choose from the four chord tones'),
    technicalName: b('コードトーン', 'Chord tones'),
    outcome: b('1-3-5-7の4音から選んで、自分の4小節を作れる。', 'You can pick from 1-3-5-7 and build four bars of your own.'),
    progressionId: 'ii-V-I',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    keyLadder: LADDER_KEY,
    steps: [
      {
        title: b('4つの音を聴く', 'Hear the four notes'),
        instruction: b('各コードの1-3-5-7を順に鳴らした譜例です。伸ばしても濁らない音を耳に入れよう。', 'The 1-3-5-7 of each chord in order. These are the notes you can hold without clashing.'),
        rules: [b('使う音は1-3-5-7', 'Use 1-3-5-7')],
        content: { source: 'chord-tones', arpPattern: 'up' },
      },
      {
        title: b('リズムと音を組み合わせる', 'Combine rhythm and pitch'),
        instruction: b('リズムを作ってから、▲▼で音を選ぼう。表情も1つ以上付けてみよう。', 'Build the rhythm first, then pick pitches with ▲▼. Add at least one articulation.'),
        rules: [b('休みを2拍以上', 'At least 2 beats of rest'), b('表情を1つ以上', 'At least one articulation')],
        editable: {
          material: 'chord-tone', bars: 4, divisions: [1, 2], initial: 'empty', allowArticulation: true,
          conditions: { minNotes: 6, minRestBeats: 2, requireArticulation: true },
          requiredAction: 'any-change',
          task: b('音を6個以上、休みを2拍以上入れて、表情も付けよう。', 'Use 6+ notes, 2+ beats of rest, and one articulation.'),
        },
      },
    ],
    selfCheck: [
      b('全部の音がコードに合って聞こえた', 'Every note fit its chord'),
      b('表情を変えると印象が変わるのが分かった', 'Articulation changed the character'),
    ],
    trivia: {
      why: b('1-3-5-7は伸ばしても濁らない「安全地帯」です。迷ったらここに戻れます。同じ音でもアクセント・短く・長くで別の音楽になります。', 'The 1-3-5-7 are safe ground — you can hold them without clashing. And the same notes become different music with accents, staccato and tenuto.'),
      mistakes: [b('音を詰め込みすぎる → 休みを2拍残す', 'Cramming in notes — keep 2 beats of rest')],
    },
    estimatedMinutes: 9,
  },
  {
    id: 'n2-blues-through',
    chapterId: 'ch2',
    title: b('12小節ブルースをコードトーンで通す', 'Take the 12-bar blues with chord tones'),
    outcome: b('12小節を通して作り、その中のii-V-Iを見つけられる。', 'You can build a full 12 bars and spot the ii-V-I inside it.'),
    progressionId: 'blues',
    isThrough: true,
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      {
        title: b('12小節の地図を見る', 'See the map'),
        instruction: b('ルートだけで12小節をなぞった譜例です。落ち着く場所と落ち着かない場所を聴き分けよう。', 'The 12 bars traced with roots only. Hear which bars settle and which don’t.'),
        rules: [b('1・3・7・11小節目が落ち着く場所', 'Bars 1, 3, 7 and 11 are the settled ones'), b('9-10-11小節はDm7-G7-C7', 'Bars 9-10-11 are Dm7-G7-C7')],
        content: { source: 'root', rhythm: 'basic' },
      },
      {
        title: b('12小節を作る', 'Build all 12 bars'),
        instruction: b('コードトーンだけで12小節を作ろう。9-10-11小節は4小節の練習と同じ形だよ。', 'Build 12 bars from chord tones. Bars 9-10-11 are the same shape you practised.'),
        rules: [b('休みを4拍以上', 'At least 4 beats of rest')],
        editable: {
          material: 'chord-tone', bars: 12, divisions: [1, 2], initial: 'empty',
          conditions: { minNotes: 12, minRestBeats: 4 },
          requiredAction: 'any-change',
          task: b('12小節をコードトーンで作って、通して聴いてみよう。', 'Build all 12 bars from chord tones and play it through.'),
        },
      },
    ],
    selfCheck: [
      b('12小節を迷わず最後まで追えた', 'I followed all 12 bars without getting lost'),
      b('9-10-11小節が4小節の練習と同じ形だと分かった', 'I saw that bars 9-10-11 match the four-bar exercise'),
    ],
    trivia: {
      why: b('ブルースの9-10-11小節はDm7-G7-C7、つまりここまで練習してきたii-V-Iそのものです。4小節の練習は、曲の一部を切り出したものでした。', 'Bars 9-10-11 of a blues are Dm7-G7-C7 — the very ii-V-I you have been practising. The four-bar exercise was a slice of a real tune.'),
      mistakes: [b('12小節が長くて迷う → 4小節ずつ3ブロックに分けて数える', 'Twelve bars feels long — count it as three blocks of four')],
    },
    estimatedMinutes: 10,
  },

  // ================= 第3章 拍の頭と裏を使い分けて音を置く =================
  {
    id: 't3-landing',
    chapterId: 'ch3',
    title: b('解決するコードの1拍目に音を置く', 'Put a note on beat 1 of the resolution'),
    technicalName: b('着地', 'Landing'),
    outcome: b('解決先の1拍目に音を置いて、「終わった」と聞こえるフレーズを作れる。', 'You can land on beat 1 of the resolving chord so the phrase sounds finished.'),
    progressionId: 'ii-V-I',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    keyLadder: LADDER_KEY,
    steps: [
      {
        title: b('頭に置いて着地させる', 'Land on the downbeat'),
        instruction: b('3小節目(Cmaj7)の1拍目に音を置いて、4小節を作ろう。', 'Build four bars with a note on beat 1 of bar 3 (Cmaj7).'),
        rules: [b('3小節目の1拍目に音を置く', 'A note must sound on beat 1 of bar 3')],
        editable: {
          material: 'chord-tone', bars: 4, divisions: [1, 2], initial: 'empty',
          conditions: { minNotes: 5, requireDownbeatOnBar: [3] },
          requiredAction: 'any-change',
          task: b('3小節目の1拍目に音を置いて作ろう。', 'Place a note on beat 1 of bar 3.'),
        },
      },
      {
        title: b('わざと外して聴き比べる', 'Miss it on purpose and compare'),
        instruction: b('今度は3小節目を裏拍から始めてみよう。着地の感じが消えるのを聴き比べよう。', 'Now start bar 3 on an offbeat. Hear the sense of arrival disappear.'),
        rules: [b('3小節目は裏拍から始める', 'Bar 3 must start on an offbeat')],
        editable: {
          material: 'chord-tone', bars: 4, divisions: [1, 2], initial: 'empty',
          conditions: { minNotes: 5, requireOffbeatStartOnBar: [3] },
          requiredAction: 'any-change',
          task: b('3小節目を裏拍から始めて、さっきと聴き比べよう。', 'Start bar 3 on an offbeat and compare with the last one.'),
        },
      },
    ],
    selfCheck: [
      b('頭に音があるときだけ「帰ってきた」と聞こえた', 'Only the downbeat version sounded like arriving'),
      b('着地の音を自分で決められた', 'I chose my own landing note'),
    ],
    trivia: {
      why: b('Cmaj7は落ち着く場所です。落ち着く場所の1拍目に音があると「着いた」と聞こえます。外すと宙ぶらりんな感じが残ります。', 'Cmaj7 is where things settle. A note on its downbeat reads as arrival; miss it and the phrase stays suspended.'),
      mistakes: [b('着地の音を短く切ってしまう → 着地は長めに置くと決まりやすい', 'Clipping the landing — hold it a little longer')],
    },
    estimatedMinutes: 9,
  },
  {
    id: 't3-offbeat-start',
    chapterId: 'ch3',
    title: b('1小節目を裏拍から始める', 'Start bar 1 on an offbeat'),
    technicalName: b('オフビート・スタート', 'Offbeat entry'),
    outcome: b('落ち着かない小節を裏拍から始めて、前へ転がる感じを出せる。', 'Starting an unsettled bar on an offbeat makes the line roll forward.'),
    progressionId: 'ii-V-I',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    keyLadder: LADDER_KEY,
    steps: [
      {
        title: b('裏拍から始める', 'Enter on the offbeat'),
        instruction: b('1小節目(Dm7)の最初の音を、1拍裏か2拍裏に置こう。', 'Put the first note of bar 1 (Dm7) on the “and” of beat 1 or 2.'),
        rules: [b('1小節目は裏拍から始める', 'Bar 1 must start on an offbeat')],
        editable: {
          material: 'chord-tone', bars: 4, divisions: [1, 2], initial: 'empty',
          conditions: { minNotes: 5, requireOffbeatStartOnBar: [1] },
          requiredAction: 'any-change',
          task: b('1小節目を裏拍から始めてみよう。', 'Start bar 1 on an offbeat.'),
        },
      },
      {
        title: b('頭から始めて聴き比べる', 'Start on the beat and compare'),
        instruction: b('今度は1拍目ちょうどから始めてみよう。硬さの違いを聴き比べよう。', 'Now start squarely on beat 1 and hear how much stiffer it feels.'),
        rules: [b('1小節目の1拍目に音を置く', 'A note must sound on beat 1 of bar 1')],
        editable: {
          material: 'chord-tone', bars: 4, divisions: [1, 2], initial: 'empty',
          conditions: { minNotes: 5, requireDownbeatOnBar: [1] },
          requiredAction: 'any-change',
          task: b('1小節目を1拍目から始めて、さっきと聴き比べよう。', 'Start bar 1 on the downbeat and compare.'),
        },
      },
    ],
    selfCheck: [
      b('裏から入ったほうが前へ進む感じがした', 'The offbeat entry pushed forward more'),
      b('どちらの入り方も自分で選べた', 'I could choose either entry on purpose'),
    ],
    trivia: {
      why: b('Dm7はまだ落ち着いていない場所です。落ち着いていない場所を裏拍から始めると、フレーズが前へ転がり出します。', 'Dm7 has not settled yet. Entering an unsettled bar off the beat sets the line rolling.'),
      mistakes: [b('裏拍のつもりが表に戻る → 第1章「裏拍から音を出す」に戻って口ずさむ', 'Drifting back onto the beat — revisit Chapter 1 and sing it')],
    },
    estimatedMinutes: 9,
  },
  {
    id: 't3-anticipate',
    chapterId: 'ch3',
    title: b('小節線をまたいで次の頭へつなげる', 'Carry a note into the next downbeat'),
    technicalName: b('食い', 'Anticipation'),
    outcome: b('G7の終わりから音を伸ばして、次の小節へ食い込ませられる。', 'You can carry a note out of G7 and into the next bar.'),
    progressionId: 'ii-V-I',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    keyLadder: LADDER_KEY,
    steps: [
      {
        title: b('食い込ませる', 'Anticipate the landing'),
        instruction: b('2小節目から3小節目へ、「→のばす」で音を食い込ませよう。', 'Use “hold” to carry a note from bar 2 into bar 3.'),
        rules: [b('2小節目から3小節目へ食い込む', 'A note must cross from bar 2 into bar 3')],
        editable: {
          material: 'chord-tone', bars: 4, divisions: [1, 2], initial: 'empty',
          conditions: { minNotes: 5, requireCrossBarHoldInto: [3] },
          requiredAction: 'any-change',
          task: b('2小節目から3小節目へ音を食い込ませよう。', 'Carry a note from bar 2 into bar 3.'),
        },
      },
    ],
    selfCheck: [
      b('解決が一段強く聞こえた', 'The resolution hit harder'),
      b('食い込んでも拍を見失わなかった', 'I kept my place through the anticipation'),
    ],
    trivia: {
      why: b('一番落ち着かないG7から、落ち着くCmaj7へ。その到着を半拍早めるのが「食い」です。第1章で作った食いが、ここで意味を持ちます。', 'From the most unsettled chord to the most settled one — arriving half a beat early is the anticipation. The Chapter 1 exercise pays off here.'),
      mistakes: [b('食いのあと拍が分からなくなる → クリックの2・4拍だけを頼りに数える', 'Losing the beat afterwards — count only the 2-and-4 click')],
    },
    estimatedMinutes: 8,
  },
  {
    id: 't3-combine',
    chapterId: 'ch3',
    title: b('裏拍で始めて食い込んで頭で着地する', 'Enter off, anticipate, land on the beat'),
    outcome: b('助走・食い・着地を1本の4小節にまとめられる。', 'You can put entry, anticipation and landing into a single four bars.'),
    progressionId: 'ii-V-I',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    keyLadder: LADDER_KEY,
    steps: [
      {
        title: b('3つを同時に使う', 'All three at once'),
        instruction: b('1小節目は裏拍から、2小節目から食い込み、3小節目の頭で着地する4小節を作ろう。', 'Bar 1 enters off the beat, bar 2 carries over, bar 3 lands on the downbeat.'),
        rules: [
          b('1小節目は裏拍から', 'Bar 1 starts offbeat'),
          b('3小節目へ食い込む', 'Carry into bar 3'),
          b('3小節目の1拍目に音', 'A note sounds on beat 1 of bar 3'),
        ],
        editable: {
          material: 'chord-tone', bars: 4, divisions: [1, 2], initial: 'empty',
          conditions: { minNotes: 6, requireOffbeatStartOnBar: [1], requireCrossBarHoldInto: [3], requireDownbeatOnBar: [3] },
          requiredAction: 'any-change',
          task: b('裏拍で始めて、食い込んで、頭で着地する4小節を作ろう。', 'Enter off the beat, carry over, and land on the downbeat.'),
        },
      },
      {
        title: b('表情を役割に合わせる', 'Match the articulation to the role'),
        instruction: b('助走は短く、着地は長く。表情を付けて役割の違いを出そう。', 'Keep the approach short and the landing long. Use articulation to show the difference.'),
        rules: [b('表情を1つ以上', 'At least one articulation')],
        editable: {
          material: 'chord-tone', bars: 4, divisions: [1, 2], initial: 'empty', allowArticulation: true,
          conditions: { minNotes: 6, requireOffbeatStartOnBar: [1], requireCrossBarHoldInto: [3], requireDownbeatOnBar: [3], requireArticulation: true },
          requiredAction: 'any-change',
          task: b('助走を短く、着地を長くして、表情の違いを付けよう。', 'Shorten the approach, lengthen the landing.'),
        },
      },
    ],
    selfCheck: [
      b('4小節が1つの流れとしてつながった', 'The four bars formed one line'),
      b('どこが助走でどこが着地か自分で言えた', 'I could name the approach and the landing'),
    ],
    trivia: {
      why: b('落ち着かない場所は前へ、落ち着く場所は拍の頭に。この2つを守るだけで、同じ音でもジャズらしく聞こえます。', 'Push forward where the harmony is unsettled; land on the beat where it settles. Two rules, and the same notes start to swing.'),
      mistakes: [b('3つを同時に意識できない → 1つずつ前のレッスンに戻って作り直す', 'Too much at once — go back a lesson and rebuild one rule at a time')],
    },
    estimatedMinutes: 10,
  },
  {
    id: 't3-blues-through',
    chapterId: 'ch3',
    title: b('11小節目の1拍目に着地させる', 'Land on beat 1 of bar 11'),
    outcome: b('12小節の中に「帰ってきた」瞬間を1回作れる。', 'You can create one clear moment of arrival in a whole chorus.'),
    progressionId: 'blues',
    isThrough: true,
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      {
        title: b('着地を1回決める', 'Land once'),
        instruction: b('11小節目(C7)の1拍目に音を置こう。あとは自由に12小節を作ろう。', 'Put a note on beat 1 of bar 11 (C7). The rest of the 12 bars is up to you.'),
        rules: [b('11小節目の1拍目に音を置く', 'A note must sound on beat 1 of bar 11'), b('休みを4拍以上', 'At least 4 beats of rest')],
        editable: {
          material: 'chord-tone', bars: 12, divisions: [1, 2], initial: 'empty',
          conditions: { minNotes: 12, minRestBeats: 4, requireDownbeatOnBar: [11] },
          requiredAction: 'any-change',
          task: b('11小節目の1拍目に着地させて、12小節を作ろう。', 'Land on beat 1 of bar 11 and build the whole 12 bars.'),
        },
      },
    ],
    selfCheck: [
      b('1コーラスの中に着地が1回あった', 'There was one clear arrival in the chorus'),
      b('11小節目が「帰ってきた」場所だと分かった', 'I felt bar 11 as the homecoming'),
    ],
    trivia: {
      why: b('ブルースの11小節目は、9-10小節のDm7-G7から解決するC7です。1コーラスで一番「帰ってきた」場所になります。', 'Bar 11 is the C7 that resolves the Dm7-G7 of bars 9-10 — the strongest homecoming in the chorus.'),
      mistakes: [b('どこが着地か分からなくなる → 9-10-11小節だけ先に作る', 'Losing track of the landing — build bars 9-10-11 first')],
    },
    estimatedMinutes: 10,
  },

  // ================= 第4章 コードが変わる小節間を半音で繋げる =================
  {
    id: 'c4-seven-three',
    chapterId: 'ch4',
    title: b('終わりを7度、次の頭を3度にする', 'End on the 7th, start on the 3rd'),
    technicalName: b('7度→3度', '7th → 3rd'),
    outcome: b('7度から次の3度へ、半音で動く道を作れる。', 'You can build a line where the 7th steps down a half step to the next 3rd.'),
    progressionId: 'ii-V-I',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    keyLadder: LADDER_KEY,
    steps: [
      {
        title: b('半音でつながる道を聴く', 'Hear the half-step path'),
        instruction: b('小節の終わりを7度、次の頭を3度にした譜例です。半音しか動いていないのを確かめよう。', 'Bars end on the 7th and begin on the 3rd. Notice the melody only moves a half step.'),
        rules: [b('7度 → 次の3度は半音', 'The 7th moves a half step to the next 3rd')],
        content: { source: 'target' },
      },
      {
        title: b('自分でつなぐ', 'Connect it yourself'),
        instruction: b('ガイドトーンだけを使って、小節の終わりを7度、次の頭を3度にしよう。', 'Using guide tones only, end each bar on the 7th and start the next on the 3rd.'),
        rules: [b('使える音は3度と7度だけ', 'Only 3rds and 7ths available')],
        editable: {
          material: 'guide-tone', bars: 4, divisions: [1, 2], initial: 'empty',
          conditions: { minNotes: 4 },
          requiredAction: 'any-change',
          task: b('小節の終わりを7度、次の小節の頭を3度にしてつなげよう。', 'End on the 7th, begin the next bar on the 3rd.'),
        },
      },
    ],
    selfCheck: [
      b('7度の次に3度が半音で来るのが聴こえた', 'I heard the 7th step into the 3rd'),
      b('コードが変わってもフレーズが切れなかった', 'The line kept going across the change'),
    ],
    trivia: {
      why: b('Dm7の7度はC、G7の3度はB。G7の7度はF、Cmaj7の3度はE。どちらも半音です。コードは大きく変わっても、メロディは隣に動くだけで済みます。', 'Dm7’s 7th is C and G7’s 3rd is B. G7’s 7th is F and Cmaj7’s 3rd is E. Half steps both times — the chords move a long way, the melody moves next door.'),
      mistakes: [b('7度と3度が分からなくなる → 度数表示をオンにする', 'Losing track of which is which — turn on the degree display')],
    },
    estimatedMinutes: 9,
  },
  {
    id: 'c4-target',
    chapterId: 'ch4',
    title: b('フレーズの最後を次のコードの3度にする', 'End the phrase on the next 3rd'),
    technicalName: b('ターゲットノート', 'Target notes'),
    outcome: b('フレーズの最後を、狙った3度に着地させられる。', 'You can aim your phrase endings at the 3rd of the chord.'),
    progressionId: 'ii-V-I',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    keyLadder: LADDER_KEY,
    steps: [
      {
        title: b('着地点を聴く', 'Hear the target'),
        instruction: b('各小節の頭で3度に着地する譜例です。着地の瞬間を耳で覚えよう。', 'Each bar lands on the 3rd. Memorise the sound of that arrival.'),
        rules: [b('着地はいつも3度', 'The target is always the 3rd')],
        content: { source: 'landing-approach', targetDegree: 'third' },
      },
      {
        title: b('自分で着地させる', 'Land it yourself'),
        instruction: b('フレーズの最後の音を、その小節のコードの3度にしよう。', 'Make the last note of your phrase the 3rd of that bar’s chord.'),
        rules: [b('最後の音はその小節の3度', 'The final note is that bar’s 3rd')],
        editable: {
          material: 'chord-tone', bars: 4, divisions: [1, 2], initial: 'empty',
          conditions: { minNotes: 5, minRestBeats: 1, requireEndOn3rd: true },
          requiredAction: 'any-change',
          task: b('最後の音を、その小節のコードの3度で終わらせよう。', 'End on the 3rd of that bar’s chord.'),
        },
      },
    ],
    selfCheck: [
      b('狙った音に着地できた', 'I hit the note I aimed for'),
      b('コードが変わる瞬間に正しい音にいられた', 'I was on the right note when the chord changed'),
    ],
    trivia: {
      why: b('「コードが変わる瞬間に正しい音に居る」— これがコード感のあるアドリブの正体です。途中は多少外れても、着地さえ合っていればコードは伝わります。', 'Being on the right note at the moment of change is what “playing the changes” means. The middle can wander; the landing is what people hear.'),
      mistakes: [b('最後の音が3度にならない → 度数表示をオンにして▲▼で合わせる', 'Missing the 3rd — turn on degrees and adjust with ▲▼')],
    },
    estimatedMinutes: 9,
  },
  {
    id: 'c4-approach',
    chapterId: 'ch4',
    title: b('着地の直前に半音の音を挟む', 'Slip a half step in before the landing'),
    technicalName: b('アプローチノート', 'Approach notes'),
    outcome: b('着地する音の半音上か下を直前に置いて、着地を飾れる。', 'You can decorate a landing with a half step just before it.'),
    progressionId: 'ii-V-I',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      {
        title: b('半音下から入る', 'Approach from below'),
        instruction: b('着地の半音下から入る譜例です。助走は短く、着地は長いのを聴こう。', 'Entering from a half step below. The approach is short, the landing long.'),
        rules: [b('助走は短く、着地は長く', 'Short approach, long landing')],
        content: { source: 'approach-pair', approachFrom: 'below' },
      },
      {
        title: b('上下から挟む', 'Enclose it'),
        instruction: b('半音上と半音下の両方から挟んで着地する譜例です。', 'Enclosing the target from above and below before landing.'),
        content: { source: 'enclosure' },
      },
      {
        title: b('自分で助走を置く', 'Place your own approach'),
        instruction: b('着地の直前に、半音上か半音下の音を1つ置こう。', 'Put one note a half step above or below, right before your landing.'),
        rules: [b('最後の音はその小節の3度', 'The final note is that bar’s 3rd'), b('半音の音も選べます', 'Chromatic notes are available here')],
        editable: {
          material: 'chromatic', bars: 4, divisions: [1, 2], initial: 'empty',
          conditions: { minNotes: 5, requireEndOn3rd: true },
          requiredAction: 'any-change',
          task: b('着地の直前に半音の音を挟んでみよう。', 'Slip a half step in just before the landing.'),
        },
      },
    ],
    selfCheck: [
      b('助走の音を短く、着地を長く演奏し分けられた', 'I kept the approach short and the landing long'),
      b('半音の音が濁らずに聞こえた', 'The chromatic note didn’t sound wrong'),
    ],
    trivia: {
      why: b('半音の音はコードに無くても、短く鳴らしてすぐ解決すれば濁りません。この一瞬の緊張がジャズらしさを作ります。', 'A chromatic note is fine if it’s short and resolves right away. That flicker of tension is what makes the line sound like jazz.'),
      mistakes: [b('助走を長く演奏して間違いに聞こえる → ささやいてから言い切るイメージで', 'Holding the approach too long sounds like a mistake — whisper it, then say the landing')],
    },
    estimatedMinutes: 10,
  },
  {
    id: 'c4-blues-through',
    chapterId: 'ch4',
    title: b('各コードの変わり目で3度に着地する', 'Land on the 3rd at every change'),
    outcome: b('12小節を通して、コードの変わり目ごとに着地させられる。', 'You can land at every chord change through a whole chorus.'),
    progressionId: 'blues',
    isThrough: true,
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      {
        title: b('着地でつないで12小節', 'Twelve bars of landings'),
        instruction: b('12小節を作って、最後の音をその小節のコードの3度で終わらせよう。', 'Build 12 bars and end on the 3rd of the final bar’s chord.'),
        rules: [b('最後の音はその小節の3度', 'The final note is that bar’s 3rd'), b('休みを4拍以上', 'At least 4 beats of rest')],
        editable: {
          material: 'chord-tone', bars: 12, divisions: [1, 2], initial: 'empty',
          conditions: { minNotes: 12, minRestBeats: 4, requireEndOn3rd: true },
          requiredAction: 'any-change',
          task: b('12小節を作って、3度で着地して終わろう。', 'Build 12 bars and finish on the 3rd.'),
        },
      },
    ],
    selfCheck: [
      b('1コーラス通して切れ目がなかった', 'The chorus held together without breaks'),
      b('着地を意識して作れた', 'I built it around the landings'),
    ],
    trivia: {
      why: b('ブルースはコードの変わり目が多い分、着地の練習に向いています。変わり目ごとに3度へ着地できれば、進行はもう聞き手に伝わっています。', 'A blues changes often, which makes it ideal landing practice. Hit the 3rd at each change and your listener hears the form.'),
    },
    estimatedMinutes: 10,
  },

  // ================= 第5章 同じ形を繰り返して1コーラスにする =================
  {
    id: 'm5-motif',
    chapterId: 'ch5',
    title: b('短い形を作って全小節にコピーする', 'Build one shape and copy it everywhere'),
    technicalName: b('モチーフ', 'Motif'),
    outcome: b('2〜4音の短い形を作り、全小節へコピーして繰り返せる。', 'You can build a 2-4 note shape and copy it through every bar.'),
    progressionId: 'ii-V-I',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    keyLadder: LADDER_KEY,
    steps: [
      {
        title: b('繰り返しを聴く', 'Hear the repetition'),
        instruction: b('同じ形が4小節くり返される譜例です。音はコードに合わせて変わっているのを聴こう。', 'One shape repeated for four bars — the pitches shift to fit each chord.'),
        rules: [b('形は同じ、音はコードに合わせる', 'Same shape, notes follow the chord')],
        content: { source: 'sample-motif', motifVariant: 'repeat' },
      },
      {
        title: b('種を作って広げる', 'Plant it and spread it'),
        instruction: b('1小節目に短い形を作り、「⧉前の小節をコピー」で全小節へ広げよう。', 'Build a short shape in bar 1, then use “copy previous bar” to spread it.'),
        rules: [b('1小節目は音4つまで', 'Up to 4 notes in bar 1')],
        editable: {
          material: 'chord-tone', bars: 4, divisions: [1, 2], initial: 'empty',
          conditions: { minNotes: 6, maxNotes: 16 },
          requiredAction: 'any-change',
          task: b('短い形を作って、コピーで全小節に広げよう。', 'Build a short shape and copy it across all bars.'),
        },
      },
    ],
    selfCheck: [
      b('同じ形が繰り返されて聞こえた', 'The repetition came through'),
      b('コピーした音が各コードに合っていた', 'The copied notes fit each chord'),
    ],
    trivia: {
      why: b('「⧉前の小節をコピー」は、形をそのままに音だけ各コードの度数へ合わせます。同じ形なのにコードが変わると響きが変わります。', 'The copy button keeps the shape and remaps the pitches to each chord’s degrees. Same shape, new colour.'),
      mistakes: [b('繰り返しを手抜きに感じる → 聴き手は繰り返しで初めて形を覚えます', 'Repetition feels lazy — but repetition is how a listener learns your idea')],
    },
    estimatedMinutes: 9,
  },
  {
    id: 'm5-vary',
    chapterId: 'ch5',
    title: b('コピーした小節の最後の音だけ変える', 'Change only the last note of one bar'),
    technicalName: b('モチーフの発展', 'Development'),
    outcome: b('繰り返した形の1か所だけを変えて、展開を作れる。', 'You can change one spot in a repeated shape to move the story on.'),
    progressionId: 'ii-V-I',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      {
        title: b('リズムだけ変えた例を聴く', 'Hear a rhythm variation'),
        instruction: b('音はそのままリズムだけを変えた譜例です。同じ形に聞こえるか確かめよう。', 'Same notes, different rhythm. Check that it still sounds like the same idea.'),
        content: { source: 'sample-motif', motifVariant: 'rhythm' },
      },
      {
        title: b('最後の音だけ変えた例を聴く', 'Hear an ending variation'),
        instruction: b('最後の音だけを変えた譜例です。変えた1音がどれか聴き取ろう。', 'Only the final note changed. Spot which one.'),
        content: { source: 'sample-motif', motifVariant: 'landing' },
      },
      {
        title: b('自分で1か所変える', 'Change one spot yourself'),
        instruction: b('並んでいる音のうち、最後の音だけを変えてみよう。', 'Of the notes laid out here, change only the last one.'),
        rules: [b('変えるのは1か所だけ', 'Change one thing only')],
        editable: {
          material: 'chord-tone', bars: 4, divisions: [1, 2], initial: 'quarters',
          conditions: { minNotes: 6 },
          requiredAction: 'pitch-change',
          task: b('最後の音だけを変えてみよう。', 'Change only the final note.'),
        },
      },
    ],
    selfCheck: [
      b('変えた1か所が耳に残った', 'The one change stood out'),
      b('全部変えずに済ませられた', 'I resisted changing everything'),
    ],
    trivia: {
      why: b('一度に変えるのは1つだけ。リズムか、最後の音か。両方変えると別のフレーズになり、繰り返しの効果が消えます。', 'Change one thing: the rhythm or the last note. Change both and it becomes a different phrase — the repetition stops working.'),
    },
    estimatedMinutes: 9,
  },
  {
    id: 'm5-call-response',
    chapterId: 'ch5',
    title: b('前半2小節に似た形で後半2小節を作る', 'Answer your first two bars'),
    technicalName: b('コール＆レスポンス', 'Call and response'),
    outcome: b('前半の「問い」に後半で「答える」4小節を作れる。', 'You can write four bars that ask a question and answer it.'),
    progressionId: 'ii-V-I',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      {
        title: b('問いと答えを聴く', 'Hear the call and response'),
        instruction: b('前半と後半が呼び交わす譜例です。似ているのに終わり方が違うのを聴こう。', 'The two halves call to each other — alike, but they end differently.'),
        content: { source: 'sample-motif', motifVariant: 'alternate' },
      },
      {
        title: b('自分で答える', 'Write the answer'),
        instruction: b('前半2小節で問いを作り、後半2小節は似た形で終わり方だけ変えよう。', 'Ask with bars 1-2, then answer with a similar shape that ends differently.'),
        rules: [b('休みを2拍以上', 'At least 2 beats of rest')],
        editable: {
          material: 'chord-tone', bars: 4, divisions: [1, 2], initial: 'empty',
          conditions: { minNotes: 6, minRestBeats: 2 },
          requiredAction: 'any-change',
          task: b('前半2小節と似た形で、後半2小節を作ろう。', 'Build bars 3-4 to echo bars 1-2.'),
        },
      },
    ],
    selfCheck: [
      b('前半と後半がつながって聞こえた', 'The halves connected'),
      b('会話のような流れになった', 'It felt like a conversation'),
    ],
    trivia: {
      why: b('前半が問い(ii-V)、後半が答え(I)。ii-V-Iという進行そのものが問いと答えの形をしています。', 'The ii-V asks and the I answers. The progression itself is already a call and response.'),
    },
    estimatedMinutes: 9,
  },
  {
    id: 'm5-blues-through',
    chapterId: 'ch5',
    title: b('2小節ずつ問いと答えを交互に作る', 'Trade two-bar calls and responses'),
    outcome: b('12小節の中で問いと答えを交互に置ける。', 'You can trade calls and responses across a whole chorus.'),
    progressionId: 'blues',
    isThrough: true,
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      {
        title: b('12小節で掛け合う', 'Trade through 12 bars'),
        instruction: b('2小節ずつ、問い・答えを交互に作って12小節を埋めよう。', 'Fill the 12 bars two bars at a time, alternating call and response.'),
        rules: [b('休みを6拍以上', 'At least 6 beats of rest')],
        editable: {
          material: 'chord-tone', bars: 12, divisions: [1, 2], initial: 'empty',
          conditions: { minNotes: 12, minRestBeats: 6 },
          requiredAction: 'any-change',
          task: b('2小節ずつ問いと答えを交互に作ろう。', 'Alternate call and response every two bars.'),
        },
      },
    ],
    selfCheck: [
      b('掛け合いのように聞こえた', 'It sounded like trading'),
      b('休みを十分に残せた', 'I left enough space'),
    ],
    trivia: {
      why: b('休みは「答えを待つ時間」です。2小節ごとに間があると、次のフレーズが答えとして聞こえます。', 'A rest is the space where an answer is expected. Leave one every two bars and the next phrase reads as a reply.'),
    },
    estimatedMinutes: 10,
  },

  // ================= 第6章 ブルースで1コーラスのソロを作る =================
  {
    id: 'b6-bluenote',
    chapterId: 'ch6',
    title: b('3度と5度を半音下げて演奏する', 'Flatten the 3rd and 5th'),
    technicalName: b('ブルーノート', 'Blue notes'),
    outcome: b('ブルーノートを混ぜて、ブルースらしい響きを出せる。', 'You can mix in blue notes for an instantly bluesy sound.'),
    progressionId: 'blues',
    defaultBpm: 70,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      {
        title: b('ブルーノートを聴く', 'Hear the blue note'),
        instruction: b('3度が半音下がる瞬間の「ブルースの顔」を聴き取ろう。', 'Listen for the moment the 3rd drops a half step — that’s the blues face.'),
        content: { source: 'blue-note-demo' },
      },
      {
        title: b('ブルースの音で作る', 'Build with blues notes'),
        instruction: b('ブルースの音を使って、4小節を作ろう。', 'Build four bars from the blues palette.'),
        rules: [b('ブルーノートを1つ以上', 'At least one blue note')],
        editable: {
          material: 'blues', bars: 4, divisions: [1, 2], initial: 'empty',
          conditions: { minNotes: 5, minRestBeats: 1 },
          requiredAction: 'any-change',
          task: b('ブルーノートを入れて4小節を作ってみよう。', 'Build four bars including a blue note.'),
        },
      },
    ],
    selfCheck: [
      b('ブルーノートの一瞬の緊張が聴こえた', 'I heard the blue note bite'),
      b('使いすぎずに済んだ', 'I didn’t overuse it'),
    ],
    trivia: {
      why: b('ブルーノートは半音下げた3度・5度です。使いすぎると全部が同じ色になるので、1コーラスに数回で十分効きます。', 'Blue notes are the flattened 3rd and 5th. A few per chorus is plenty — overuse and everything turns the same colour.'),
    },
    estimatedMinutes: 8,
  },
  {
    id: 'b6-riff',
    chapterId: 'ch6',
    title: b('1小節のリフを12小節くり返す', 'Repeat one riff for 12 bars'),
    technicalName: b('リフ', 'Riff'),
    outcome: b('1つのリフだけで12小節を持たせられる。', 'You can hold a full chorus together with a single riff.'),
    progressionId: 'blues',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      {
        title: b('リフを聴く', 'Hear the riff'),
        instruction: b('1小節の形が12小節続く譜例です。変わらないことの強さを聴こう。', 'One bar repeated for twelve. Hear the strength of not changing.'),
        content: { source: 'blues-riff' },
      },
      {
        title: b('リフで12小節通す', 'Take the riff through'),
        instruction: b('1小節のリフを作って、コピーで12小節に広げよう。', 'Build a one-bar riff and copy it across all twelve.'),
        editable: {
          material: 'blues', bars: 12, divisions: [1, 2], initial: 'empty',
          conditions: { minNotes: 12 },
          requiredAction: 'any-change',
          task: b('1小節のリフを12小節に広げよう。', 'Spread your one-bar riff across 12 bars.'),
        },
      },
    ],
    selfCheck: [
      b('1つの形で12小節持たせられた', 'One shape carried the whole chorus'),
      b('変えない勇気を持てた', 'I had the nerve to leave it alone'),
    ],
    trivia: {
      why: b('リフはブルースの背骨です。「変えない勇気」が1コーラスの体力を作ります。', 'Riffs are the backbone of the blues. The nerve to stay put is what carries a chorus.'),
    },
    estimatedMinutes: 9,
  },
  {
    id: 'b6-shape',
    chapterId: 'ch6',
    title: b('音数を増やして減らして起伏を作る', 'Build and release by note count'),
    technicalName: b('ソロの設計', 'Shaping a solo'),
    outcome: b('前半・中盤・後半で音数を変えて、起伏のあるソロを設計できる。', 'You can shape a solo by changing how many notes you play in each section.'),
    progressionId: 'blues',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      {
        title: b('使える音を確かめる', 'Check your palette'),
        instruction: b('各コードで使えるスケールの一覧です。前半は少なく、中盤で増やし、最後は減らす — 口ずさんで決めよう。', 'The scales available on each chord. Sing the shape first: sparse, then busy, then sparse again.'),
        content: { source: 'scale' },
      },
      {
        title: b('起伏をつけて作る', 'Build the arc'),
        instruction: b('前半は音を少なく、中盤で増やし、最後は減らして12小節を作ろう。', 'Fewer notes at the start, more in the middle, fewer again at the end.'),
        rules: [b('休みを6拍以上', 'At least 6 beats of rest')],
        editable: {
          material: 'blues', bars: 12, divisions: [1, 2], initial: 'empty',
          conditions: { minNotes: 12, minRestBeats: 6 },
          requiredAction: 'any-change',
          task: b('前半は少なく、中盤で増やし、最後は減らして作ろう。', 'Start sparse, build, then thin out again.'),
        },
      },
    ],
    selfCheck: [
      b('静かに始めて盛り上げて終われた', 'I started quiet, built, and closed'),
      b('ずっと同じ密度にならなかった', 'The density changed through the chorus'),
    ],
    trivia: {
      why: b('うまい人のソロは音が多いのではなく、密度が動いています。ずっと同じ密度だと、どんなに正しい音でも平坦に聞こえます。', 'Good solos aren’t denser — their density moves. A constant texture sounds flat no matter how correct the notes are.'),
    },
    estimatedMinutes: 10,
  },
  {
    id: 'b6-chorus',
    chapterId: 'ch6',
    title: b('12小節のソロを自分で作る', 'Write your own 12-bar solo'),
    outcome: b('ここまでの道具を全部使って、12小節のソロを完成できる。', 'You can finish a 12-bar solo using everything from the course.'),
    progressionId: 'blues',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    steps: [
      {
        title: b('1コーラスを完成させる', 'Finish the chorus'),
        instruction: b('ここまでの技を全部使って12小節を作り、自分の楽器で最後まで演奏しよう。', 'Use everything you have learned, then play it through on your instrument.'),
        rules: [b('休みを4拍以上', 'At least 4 beats of rest')],
        editable: {
          material: 'blues', bars: 12, divisions: [1, 2, 3, 4], initial: 'empty', allowArticulation: true,
          conditions: { minNotes: 12, minRestBeats: 4 },
          requiredAction: 'any-change',
          task: b('12小節を最後まで作って、演奏してみよう。', 'Build all 12 bars, then play them.'),
        },
      },
    ],
    selfCheck: [
      b('ソロに始まり・中間・終わりを感じた', 'The solo had a beginning, middle and end'),
      b('作った1コーラスを自分の楽器で最後まで演奏できた', 'I played my chorus through on my instrument'),
    ],
    trivia: {
      why: b('ここで作った1コーラスがあなたの最初の「持ちネタ」です。次のレッスンで、これを別のキーへ移します。', 'This chorus is your first keeper. In the next lesson you’ll move it to another key.'),
    },
    estimatedMinutes: 12,
  },
  {
    id: 'b6-transpose',
    chapterId: 'ch6',
    title: b('同じ設計でC→F→B♭と作り直す', 'Rebuild it in C, F and B♭'),
    technicalName: b('移調', 'Transposing'),
    outcome: b('同じ設計のソロを、別のキーでも作り直せる。', 'You can rebuild the same solo design in another key.'),
    progressionId: 'blues',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    tempoLadder: LADDER_BPM,
    keyLadder: LADDER_KEY,
    steps: [
      {
        title: b('キーを変えて作り直す', 'Change key and rebuild'),
        instruction: b('キーをFに変えて、さっきと同じ設計で12小節を作ろう。慣れたらB♭でも。', 'Switch to F and rebuild the same design. Then try B♭.'),
        rules: [b('設計は変えず、キーだけ変える', 'Same design, new key')],
        editable: {
          material: 'blues', bars: 12, divisions: [1, 2], initial: 'empty', allowArticulation: true,
          conditions: { minNotes: 12, minRestBeats: 4 },
          requiredAction: 'any-change',
          task: b('キーを変えて、同じ設計でもう一度作ってみよう。', 'Change the key and build the same design again.'),
        },
      },
    ],
    selfCheck: [
      b('別のキーでも同じ形が作れた', 'The same shape worked in a new key'),
      b('キーが変わっても迷わなかった', 'The key change didn’t throw me'),
    ],
    trivia: {
      why: b('コース修了です! 「別のキーでも同じことができる」はジャズで最も価値のある力です。自由練習の「フレーズを作る」で、枯葉進行など別の進行にも広げてみましょう。', 'Course complete! Doing the same thing in any key is the most valuable skill in jazz. Take it to Free Practice → Build a phrase and try other forms, such as Autumn Leaves.'),
    },
    estimatedMinutes: 12,
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
