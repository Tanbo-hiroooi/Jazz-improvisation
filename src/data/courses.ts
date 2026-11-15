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
/**
 * リズム譜の1ブロック(4小節)。1枚の譜面に並べ、再生しながら続けて演奏する。
 * bars の書式は theory/rhythmScore.ts を参照。
 */
export interface RhythmBlock {
  /** 譜面の上に出す短い見出し */
  label: Bi;
  /** 再生中に1行だけ出す、やること */
  hint: Bi;
  /** 3周目「自分の音で」に使ってよいコードの音(第2章)。無ければ3周目は「ひとりで」 */
  free?: ('R' | '3' | '5' | '7')[];
  /** このブロックだけキーを移す(半音)。覚えたフレーズを別のキーで弾く練習(第3章) */
  keyShift?: number;
  bars: string[];
}

export interface StepContent {
  source:
    | 'root' | 'third' | 'seventh' | 'chord-tones' | 'guide-tones' | 'target' | 'approach'
    | 'approach-pair' | 'enclosure' | 'landing-approach' | 'scale' | 'tension' | 'custom-path'
    | 'sample-motif' | 'blues-riff' | 'blue-note-demo'
    /** 第1章・第2章: 1枚の長いリズム譜(rhythmBlocks) */
    | 'rhythm';
  /** source='rhythm' のブロック */
  rhythmBlocks?: RhythmBlock[];
  /** source='rhythm' の音符の下の文字。既定は口ずさみ(第1章)、'degree' は度数(第2章) */
  rhythmLabel?: 'degree';
  /** フレーズを覚えるレッスン: 「3周目は譜面を隠す」の切り替えを出す */
  memorize?: boolean;
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
  /** レッスン一覧で章の中を区切る見出し(第1章の「基本」「実戦のリズム」など) */
  part?: Bi;
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
}

export interface Course {
  id: string;
  title: Bi;
  description: Bi;
  chapterIds: string[];
}

const b = (ja: string, en: string): Bi => ({ ja, en });

export const COURSES: Course[] = [
  {
    id: 'rhythm-first',
    title: b('リズムから始めるアドリブ入門', 'Rhythm-First Improvisation'),
    description: b(
      '理論の暗記からではなく、ジャズらしいノリを体に入れることから始めるコースです。リズム、コードの音、フレーズ、その場で作る、の順に進み、最後は曲の中で演奏します。',
      'Start with the jazz feel, not theory. Rhythm, chord tones, phrases, then making it up as you go — and finally playing on a tune.',
    ),
    // 章IDは追加順の名残で不ぞろい(ch5 = 第6章、ch6 = 第7章)。並びはこの配列、番号はタイトルで管理する
    chapterIds: ['ch1', 'ch2', 'rhythm2', 'phrases', 'improv', 'ch5', 'ch6', 'tune'],
  },
];

export const CHAPTERS: Chapter[] = [
  {
    id: 'ch1',
    title: b('第1章: リズムでスウィングする', 'Ch. 1: Swing through rhythm'),
    purpose: b('1枚の譜面を聴いて、続けて演奏する。まず1音で、基本のノリを体に入れる。', 'Hear one long score, then play it straight through. On one note, get the basic feel into your body.'),
  },
  {
    id: 'ch2',
    title: b('第2章: コードの音を選ぶ', 'Ch. 2: Choose notes from the chord'),
    purpose: b('コード記号から音を見つけて、リズムに乗せる。聴いて、一緒に演奏して、最後は自分の音で。', 'Find the notes from a chord symbol and put them into rhythm. Listen, play along, then play your own notes.'),
  },
  {
    id: 'rhythm2',
    title: b('第3章: ソロで使うリズム', 'Ch. 3: Rhythms from real solos'),
    purpose: b('ジャズのソロで実際に使うリズムを覚える。リズムの単語、助走、アクセント、間。', 'Learn the rhythms real solos are made of: rhythm words, pickups, accents and space.'),
  },
  {
    id: 'phrases',
    title: b('第4章: フレーズを覚えて使う', 'Ch. 4: Learn phrases and use them'),
    purpose: b('ii-V-I の短いフレーズを覚えて、別のキーでも演奏する。ソロの材料を増やす。', 'Learn short ii-V-I phrases and play them in other keys — building material for your solos.'),
  },
  {
    id: 'improv',
    title: b('第5章: その場で作る', 'Ch. 5: Make it up as you go'),
    purpose: b('覚えたフレーズを足場に、制限を少しずつ外して自分の演奏へ進む。', 'Using the phrases you know as footing, remove the limits one at a time until the playing is yours.'),
  },
  {
    id: 'ch5',
    title: b('第6章: 1つの形を育てる', 'Ch. 6: Grow one shape'),
    purpose: b('短い形を繰り返し、少し変え、問いと答えにする。ソロにまとまりを作る。', 'Repeat a short shape, vary it, and turn it into question and answer — what holds a solo together.'),
  },
  {
    id: 'ch6',
    title: b('第7章: ブルースでソロ', 'Ch. 7: Solo on the blues'),
    purpose: b('ブルーノート、リフ、音数の起伏。最後は2コーラスを自分で演奏する。', 'Blue notes, riffs and density. Finish by playing two choruses of your own.'),
  },
  {
    id: 'tune',
    title: b('第8章: 曲で使う', 'Ch. 8: Use it on a tune'),
    purpose: b('「枯葉」の進行で、長調と短調のii-V-Iを続けて演奏する。', 'Play through the major and minor ii-V-Is of the Autumn Leaves changes.'),
  },
];

export const LESSONS: Lesson[] = [
  // ================= 第1章 リズムでスウィングする =================
  // 前半「基本」3レッスン + 後半「実戦のリズム」6レッスン + 締めくくり。
  // どれも1枚の長いリズム譜(4小節×4ブロック)。聴く→一緒に→ひとりで、を周回して演奏する。
  {
    id: 'r1-swing',
    chapterId: 'ch1',
    title: b('スウィングに乗る', 'Ride the swing'),
    outcome: b('2・4拍のクリックに乗って、跳ねる8分と裏拍のリズムを演奏しよう。', 'Ride the 2-and-4 click with bouncing 8ths and offbeats.'),
    progressionId: 'ii-V-I',
    defaultBpm: 90,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('スウィングに乗る', 'Ride the swing'),
        instruction: b('2・4拍のクリックに乗って、跳ねる8分と裏拍のリズムを演奏しよう。', 'Ride the 2-and-4 click with bouncing 8ths and offbeats.'),
        content: { source: 'rhythm', rhythmBlocks: [
          { label: b('スウィング8分', 'Swing 8ths'), hint: b('8分を「ドゥダ」と跳ねて', 'Bounce the 8ths: doo-dah'), bars: ['8 8 8 8 8 8 8 8', '8 8 8 8 8 8 8 8', '8 8 8 8 8 8 8 8', '4 4 2'] },
          { label: b('裏拍だけ', 'Offbeats only'), hint: b('オモテを休んで、裏だけ', 'Rest on the beat, play the and'), bars: ['r8 8 r8 8 r8 8 r8 8', 'r8 8 r8 8 r8 8 r8 8', 'r8 8 r8 8 r8 8 r8 8', 'r8 8 r8 8 r2'] },
          { label: b('チャールストン', 'Charleston'), hint: b('1拍目と2拍目の裏', 'Beat 1 and the and of 2'), bars: ['4. 8 r2', '4. 8 r2', '4. 8 r2', '4. 8 r2'] },
          { label: b('2・4拍に置く', 'Sit on 2 and 4'), hint: b('クリックと同じ2・4拍で、間をとって', 'Play with the click on 2 and 4, leaving space'), bars: ['r4 4 r4 4', 'r4 4 r4 4', '4. 8 r2', 'r4 4 r2'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('ジャズのリズム隊は2・4拍を刻み、8分音符は長短に跳ねます。この2つが揃うと、同じ音でもジャズに聞こえます。', 'The rhythm section marks 2 and 4, and jazz 8ths are long-short. Together they make even one note sound like jazz.'),
      mistakes: [b('クリックを1・3拍と勘違いする → クリックは2・4拍', 'Hearing the click as 1 and 3 — it is on 2 and 4')],
    },
  },
  {
    id: 'r1-forward',
    chapterId: 'ch1',
    title: b('食いで前へ進む', 'Lean forward with anticipations'),
    outcome: b('拍や小節線の少し手前で音を出して、前へ進むノリを作ろう。', 'Play just ahead of the beat or barline to push the groove forward.'),
    progressionId: 'ii-V-I',
    defaultBpm: 90,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('食いで前へ進む', 'Lean forward with anticipations'),
        instruction: b('拍や小節線の少し手前で音を出して、前へ進むノリを作ろう。', 'Play just ahead of the beat or barline to push the groove forward.'),
        content: { source: 'rhythm', rhythmBlocks: [
          { label: b('4拍目の裏で食う', 'Anticipate the bar'), hint: b('次の小節の頭を半拍早く', 'Play the next downbeat half a beat early'), bars: ['4 4 4 r8 8_', '4 r4 r2', '4 4 4 r8 8_', '4 r4 r2'] },
          { label: b('2拍目の裏で食う', 'Anticipate beat 3'), hint: b('3拍目を半拍早く', 'Play beat 3 half a beat early'), bars: ['4 r8 8_ 4 r4', '4 r8 8_ 4 r4', 'r4 r8 8_ 4 4', '2 r2'] },
          { label: b('裏から入るチャールストン', 'Reverse Charleston'), hint: b('1拍目の裏と3拍目', 'The and of 1, then beat 3'), bars: ['r8 4. 4 r4', 'r8 4. 4 r4', 'r8 4. 4 r4', 'r8 4. 4 r4'] },
          { label: b('食いと休み', 'Anticipations and space'), hint: b('食いと休みを混ぜて', 'Mix anticipations with rests'), bars: ['r8 4. 4 r8 8_', '4 r4 r2', '4. 8 r4 r8 8_', '2 r2'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('拍の頭ちょうどに置き続けると行進曲になります。半拍早く出すと、そこに推進力が生まれます。', 'Landing squarely on every beat sounds like a march. Arriving half a beat early creates drive.'),
      mistakes: [b('食いのあと拍を見失う → 食った音の長さを数えずに、次の2・4拍を聴く', 'Losing the beat after an anticipation — listen for the next 2 and 4')],
    },
  },
  {
    id: 'r1-triplet',
    chapterId: 'ch1',
    title: b('3連を混ぜる', 'Mix in triplets'),
    outcome: b('1拍だけ3連にして、リズムに細かい彩りを混ぜよう。', 'Turn a single beat into triplets to add fine color.'),
    progressionId: 'ii-V-I',
    defaultBpm: 90,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('3連を混ぜる', 'Mix in triplets'),
        instruction: b('1拍だけ3連にして、リズムに細かい彩りを混ぜよう。', 'Turn a single beat into triplets to add fine color.'),
        content: { source: 'rhythm', rhythmBlocks: [
          { label: b('1拍だけ3連', 'One triplet beat'), hint: b('1拍を3つに', 'Split one beat into three'), bars: ['t8 t8 t8 4 r4 4', 't8 t8 t8 4 r4 4', '4 t8 t8 t8 r4 4', '2 r2'] },
          { label: b('3連を続ける', 'Keep the triplets going'), hint: b('2拍続けて3つずつ', 'Two beats of triplets in a row'), bars: ['t8 t8 t8 t8 t8 t8 4 r4', 't8 t8 t8 t8 t8 t8 4 r4', 't8 t8 t8 t8 t8 t8 4 r4', '2 r2'] },
          { label: b('スウィングを3連で', 'Swing as triplets'), hint: b('「ター・タ」は3連の1つ目と3つ目', 'Swing is the first and last of a triplet'), bars: ['t4 t8 t4 t8 t4 t8 t4 t8', 't4 t8 t4 t8 t4 t8 t4 t8', 't4 t8 t4 t8 t4 t8 t4 t8', 't4 t8 t4 t8 r2'] },
          { label: b('3連で食う', 'Anticipate with triplets'), hint: b('3連の最後から次の小節へ', 'From the last triplet into the next bar'), bars: ['t8 t8 t8 4 4 r4', '8 8 t8 t8 t8 2', '4 4 4 t8 t8 t8_', '4 r4 r2'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('スウィングの跳ねは3連が土台です。3連を1拍だけ混ぜると、そこだけ密度が上がって印象が残ります。', 'Swing is built on triplets. One triplet beat raises the density in one spot and makes it stand out.'),
      mistakes: [b('3連のあと次の拍に戻れない → 3連の次の拍の頭を少し強く', 'Losing the next beat after a triplet — lean on the next downbeat')],
    },
  },
  {
    id: 'r2-words',
    chapterId: 'rhythm2',
    title: b('リズムの単語を覚える', 'Learn rhythmic words'),
    outcome: b('ジャズのソロでよく使う、裏拍で終わる短いリズムを覚えよう。', 'Learn short rhythms from jazz solos that end on an offbeat.'),
    progressionId: 'ii-V-I',
    defaultBpm: 100,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('リズムの単語を覚える', 'Learn rhythmic words'),
        instruction: b('ジャズのソロでよく使う、裏拍で終わる短いリズムを覚えよう。', 'Learn short rhythms from jazz solos that end on an offbeat.'),
        content: { source: 'rhythm', rhythmBlocks: [
          { label: b('2拍目から4拍目の裏まで', 'Beat 2 to the and of 4'), hint: b('最後の音は短く強く', 'Make the last note short and strong'), bars: ['r4 8 8 8 8 8 8/as', 'r1', 'r4 8 8 8 8 8 8/as', 'r1'] },
          { label: b('1拍目の裏から4拍目の裏まで', 'The and of 1 to the and of 4'), hint: b('裏で入って裏で終わる', 'Start on an and, end on an and'), bars: ['r8 8 8 8 8 8 8 8/as', 'r1', 'r8 8 8 8 8 8 8 8/as', 'r1'] },
          { label: b('4拍目の裏から入る', 'Enter on the and of 4'), hint: b('前の小節の終わりから', 'Start at the end of the previous bar'), bars: ['r2 r4 r8 8', '8 8 8 8 8/as r8 r4', 'r2 r4 r8 8', '8 8 8 8 8/as r8 r4'] },
          { label: b('「ドゥ・バッ」で締める', 'End with doo-BAP'), hint: b('2音で短く締める', 'Close with two short notes'), bars: ['r4 8 8 8 8 8 8', '4 8 8/as r2', 'r8 8 8 8 8 8 8 8', '8 8/as r2 r4'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('ビバップの奏者は、裏拍で始めて裏拍で終わる短いリズムを単語のように使い回します。形を覚えると、ソロの入り方と終わり方に迷わなくなります。', 'Bebop players reuse short rhythms that start and end on offbeats, like words. Knowing them tells you how to begin and end a phrase.'),
      mistakes: [b('最後の音が長くなる → 「バッ」と短く切る', 'The last note rings on — cut it short: bap')],
    },
  },
  {
    id: 'r2-pickup',
    chapterId: 'rhythm2',
    title: b('1拍目へ向かって弾く', 'Aim for beat 1'),
    outcome: b('小節の手前から始めて、次の1拍目に着地しよう。', 'Start before the bar and land on the next beat 1.'),
    progressionId: 'ii-V-I',
    defaultBpm: 100,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('1拍目へ向かって弾く', 'Aim for beat 1'),
        instruction: b('小節の手前から始めて、次の1拍目に着地しよう。', 'Start before the bar and land on the next beat 1.'),
        content: { source: 'rhythm', rhythmBlocks: [
          { label: b('3拍目の裏から', 'From the and of 3'), hint: b('1拍目の長い音へ', 'Into a long note on beat 1'), bars: ['r2 r8 8 8 8', '2/t r2', 'r2 r8 8 8 8', '2/t r2'] },
          { label: b('4拍目から', 'From beat 4'), hint: b('2つの音で1拍目へ', 'Two notes into beat 1'), bars: ['r2 r4 8 8', '2/t r2', 'r2 r4 8 8', '2/t r2'] },
          { label: b('2拍目から長い助走', 'A long run-up from beat 2'), hint: b('たっぷり進んで着地', 'Travel, then land'), bars: ['r4 8 8 8 8 8 8', '2/t r2', 'r4 8 8 8 8 8 8', '2/t r2'] },
          { label: b('3拍目にも着地', 'Land on beat 3 too'), hint: b('1拍目と3拍目の両方へ', 'Aim for beat 1 and beat 3'), bars: ['r2 r8 8 8 8', '4/t r8 8 4/t r4', 'r2 r8 8 8 8', '4/t r8 8 4/t r4'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('1拍目はフレーズの始まりではなく、向かっていく着地点です。手前から助走をつけると、フレーズが前へ進みます。', 'Beat 1 is where a phrase arrives, not where it starts. A run-up from before the bar makes the line move forward.'),
      mistakes: [b('1拍目から弾き始めてしまう → 助走の音から数える', 'Starting on beat 1 — count from the pickup notes')],
    },
  },
  {
    id: 'r2-motif',
    chapterId: 'rhythm2',
    title: b('1つの形をずらして回す', 'Move one shape around'),
    outcome: b('2つの音の短い形を、置き場所を変えながら何度も使おう。', 'Reuse one short two-note shape while moving where it falls.'),
    progressionId: 'ii-V-I',
    defaultBpm: 100,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('1つの形をずらして回す', 'Move one shape around'),
        instruction: b('2つの音の短い形を、置き場所を変えながら何度も使おう。', 'Reuse one short two-note shape while moving where it falls.'),
        content: { source: 'rhythm', rhythmBlocks: [
          { label: b('置き場所を変える', 'Move the start'), hint: b('同じ形を半拍ずつ後ろへ', 'Shift the same shape half a beat each time'), bars: ['8 4 r8 r2', 'r8 8 4 r2', 'r4 8 4 r8 r4', 'r4 r8 8 4 r4'] },
          { label: b('1音足す', 'Add a note'), hint: b('形を3つの音に', 'Grow the shape to three notes'), bars: ['8 8 4 r2', 'r8 8 8 4 r8 r4', 'r4 8 8 4 r4', 'r2 8 8 4'] },
          { label: b('間を詰める', 'Squeeze it'), hint: b('形を続けて並べる', 'Play the shape back to back'), bars: ['8 4 8 4 r4', '8 4 8 4 8 8/s', 'r8 8 4 8 4 r8', '4/t r4 r2'] },
          { label: b('間を広げる', 'Stretch it'), hint: b('形を倍の長さに', 'Play the shape twice as long'), bars: ['4 2 r4', 'r4 4 2', '8 4 r8 r2', 'r8 8 4 r2'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('ソニー・ロリンズは「St. Thomas」で2つの音の形を、置き場所を変えて何度も使っています。音を増やさなくても、リズムだけで話が進みます。', 'Sonny Rollins keeps moving one two-note shape around in “St. Thomas.” The story moves forward through rhythm alone.'),
      mistakes: [b('形がずれると拍を見失う → 2・4拍のクリックを聴き続ける', 'Losing the beat when the shape moves — keep hearing the 2-and-4 click')],
    },
  },
  {
    id: 'r2-accent',
    chapterId: 'rhythm2',
    title: b('裏拍にアクセントを置く', 'Accent the offbeats'),
    outcome: b('裏拍を強く、低い音を弱くして、ジャズらしい抑揚をつけよう。', 'Lean on the offbeats and ghost the low notes for a jazz lilt.'),
    progressionId: 'ii-V-I',
    defaultBpm: 100,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('裏拍にアクセントを置く', 'Accent the offbeats'),
        instruction: b('裏拍を強く、低い音を弱くして、ジャズらしい抑揚をつけよう。', 'Lean on the offbeats and ghost the low notes for a jazz lilt.'),
        content: { source: 'rhythm', rhythmBlocks: [
          { label: b('裏拍を強く', 'Strong offbeats'), hint: b('「ドゥバ」の「バ」を強く', 'Lean on the bah of doo-bah'), bars: ['8 8:3/a 8:5 8:7/a 8:8 8:7/a 8:5 8:3/a', '8 8:3/a 8:5 8:7/a 8:8 8:7/a 8:5 8:3/a', '8 8:3/a 8:5 8:7/a 8:8 8:7/a 8:5 8:3/a', '8 8:3/a 8:5 8:7/as r2'] },
          { label: b('一番高い音を強く', 'Accent the top note'), hint: b('頂上の音にだけアクセント', 'Accent only the highest note'), bars: ['8 8:3 8:5 8:7 8:5 8:8/a 8:7 8:5', '8 8:3 8:5 8:7 8:5 8:8/a 8:7 8:5', '8 8:3 8:5 8:7 8:5 8:8/a 8:7 8:5', '8:3 8/as r2 r4'] },
          { label: b('低い裏拍の音を弱く', 'Ghost the low offbeats'), hint: b('括弧の音はほとんど聞こえないくらい', 'Notes in brackets are barely heard'), bars: ['8:8 8:5/g 8:7 8:3/g 8:5 8/g 8:3 8/g', '8:8 8:5/g 8:7 8:3/g 8:5 8/g 8:3 8/g', '8:8 8:5/g 8:7 8:3/g 8:5 8/g 8:3 8/g', '8:5 8:3/g 4 r2'] },
          { label: b('全部を組み合わせる', 'Put it all together'), hint: b('強く・弱く・最後は短く', 'Strong, ghosted, and a short ending'), bars: ['8 8:3/a 8:5 8:8/a 8:7 8:5/g 8:3 8/as', '8 8:3/a 8:5 8:8/a 8:7 8:5/g 8:3 8/as', '8 8:3/a 8:5 8:8/a 8:7 8:5/g 8:3 8/as', '8:5 8:3/g 8/as r8 r2'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('管楽器奏者は裏拍をタンギングして表拍へつなぎ、低い裏拍の音はほとんど鳴らしません。この強弱がスウィングの揺れを生みます。', 'Horn players tongue the offbeats, slur into the beat, and barely sound the low offbeat notes. That contrast is what makes it swing.'),
      mistakes: [b('全部の音を同じ強さで弾く → 裏拍だけを口ずさんでから弾く', 'Every note the same volume — sing just the offbeats first')],
    },
  },
  {
    id: 'r2-triplet',
    chapterId: 'rhythm2',
    title: b('3連で揺らす', 'Rock with triplets'),
    outcome: b('3連で飾ったり、3つずつまとめたりして、リズムを揺らそう。', 'Decorate with triplets and group notes in threes to rock the rhythm.'),
    progressionId: 'ii-V-I',
    defaultBpm: 90,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('3連で揺らす', 'Rock with triplets'),
        instruction: b('3連で飾ったり、3つずつまとめたりして、リズムを揺らそう。', 'Decorate with triplets and group notes in threes to rock the rhythm.'),
        content: { source: 'rhythm', rhythmBlocks: [
          { label: b('8分の流れに3連を1つ', 'One triplet in the flow'), hint: b('8分の途中で1拍だけ飾る', 'Decorate one beat inside a line of 8ths'), bars: ['8 8 t8 t8 t8 8 8 4', '8 8 8 8 t8 t8 t8 4', '8 8 t8 t8 t8 8 8 4', '2 r2'] },
          { label: b('8分と3連を交互に', 'Alternate 8ths and triplets'), hint: b('2つと3つを入れ替えて', 'Switch between twos and threes'), bars: ['8 8 t8 t8 t8 8 8 t8 t8 t8', '8 8 t8 t8 t8 8 8 t8 t8 t8', '8 8 t8 t8 t8 8 8 t8 t8 t8', 't8 t8 t8 4 r2'] },
          { label: b('3つずつまとめる', 'Group in threes'), hint: b('3つごとのアクセントが小節をまたいで回る', 'An accent every three notes rolls across the bars'), bars: ['8/a 8 8 8/a 8 8 8/a 8', '8 8/a 8 8 8/a 8 8 8/a', '8 8 8/a 8 8 8/a 8 8', '4/a r4 r2'] },
          { label: b('4分3連', 'Quarter-note triplets'), hint: b('2拍に3つ、ゆったり', 'Three notes across two beats, laid back'), bars: ['t4 t4 t4 2', '4 4 t4 t4 t4', 't4 t4 t4 t4 t4 t4', '2/t r2'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('ドラムのシンバルは3連系で刻み、ベースは4分で歩きます。3つのまとまりや4分3連は、その2つのノリを重ねて揺らす道具です。', 'The ride cymbal feels triplets while the bass walks in quarters. Groups of three and quarter-note triplets play one feel against the other.'),
      mistakes: [b('3つずつのまとまりで拍を見失う → アクセントではなく2・4拍を聴く', 'Losing the beat in groups of three — listen to 2 and 4, not the accents')],
    },
  },
  {
    id: 'r2-phrase',
    chapterId: 'rhythm2',
    title: b('間と長さでソロを組む', 'Shape a solo with space'),
    outcome: b('フレーズの長さと音の多さを変えて、話すように演奏しよう。', 'Vary phrase length and density so it sounds like speech.'),
    progressionId: 'ii-V-I',
    defaultBpm: 100,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('間と長さでソロを組む', 'Shape a solo with space'),
        instruction: b('フレーズの長さと音の多さを変えて、話すように演奏しよう。', 'Vary phrase length and density so it sounds like speech.'),
        content: { source: 'rhythm', rhythmBlocks: [
          { label: b('1小節弾いて1小節休む', 'Play a bar, rest a bar'), hint: b('弾いたら同じだけ休む', 'Rest as long as you played'), bars: ['r8 8 8 8 8 8 4', 'r1', '8 8 4 r8 8 4', 'r1'] },
          { label: b('1小節半のフレーズ', 'A bar-and-a-half phrase'), hint: b('小節の途中で終わる', 'End in the middle of a bar'), bars: ['r8 8 8 8 8 8 8 8', '8 8 8/as r8 r4 8 8', '8 8 8 8 8 8 8/as r8', 'r1'] },
          { label: b('3拍目から始める', 'Start on beat 3'), hint: b('小節線をまたいで続ける', 'Carry on across the barline'), bars: ['r2 8 8 8 8', '8 8 4/as r2', 'r2 8 8 8 8', '4 8 8/as r2'] },
          { label: b('少ない→多い→少ない', 'Few, many, few'), hint: b('音の数で山を作る', 'Build a peak with the number of notes'), bars: ['r4 4 r2', 'r8 8 8 8 r2', '8 8 8 8 t8 t8 t8 8 8', '2/t r2'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('フレーズを2小節・4小節ぴったりで区切ると単調になります。長さと音数を変えると、会話のような流れが生まれます。', 'Phrases that always last exactly two or four bars sound square. Changing length and density makes it sound like conversation.'),
      mistakes: [b('休みで拍を見失う → 休みの間も2・4拍を数える', 'Losing the beat in the rests — keep counting 2 and 4')],
    },
  },
  {
    id: 'r2-solo',
    chapterId: 'rhythm2',
    title: b('1音でリズムのソロを弾く', 'Play a one-note rhythm solo'),
    outcome: b('12小節ブルースで、ここまでのリズムを1コーラス通そう。', 'Put everything together over one chorus of 12-bar blues.'),
    progressionId: 'blues',
    defaultBpm: 110,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('1音でリズムのソロを弾く', 'Play a one-note rhythm solo'),
        instruction: b('12小節ブルースで、ここまでのリズムを1コーラス通そう。', 'Put everything together over one chorus of 12-bar blues.'),
        content: { source: 'rhythm', rhythmBlocks: [
          { label: b('単語と間', 'Words and space'), hint: b('裏で入って裏で終わる', 'Start and end on offbeats'), bars: ['r4 8 8 8 8 8 8/as', 'r1', 'r8 8 8 8 8/a 8 4', 'r2 r8 8 8 8_'] },
          { label: b('助走とずらし', 'Run-ups and shifts'), hint: b('1拍目へ向かい、形をずらす', 'Aim for beat 1, then move the shape'), bars: ['4/t r4 8 4 r8', 'r8 8 4 r2', 'r2 r8 8 8 8', '2/t r2'] },
          { label: b('3連と締め', 'Triplets and the ending'), hint: b('揺らして、短く締める', 'Rock it, then close short'), bars: ['8 8 t8 t8 t8 8 8 8 8', 't4 t4 t4 8 8 8 8', '8/a 8 8/a 8 8/a 8 4', '4 8 8/as r2'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('リズムだけでソロが成り立つことを体験します。音が1つでも、リズムと間があれば音楽になります。', 'Feel how a solo can stand on rhythm alone. Even with one note, rhythm and space make music.'),
      mistakes: [b('最初から最後まで弾き続ける → ブロックごとの休みを必ず守る', 'Playing non-stop — keep the rests in every block')],
    },
  },

  // ================= 第2章 コードの音を選ぶ =================
  // 第1章のリズムのまま、使う音をコードの中から選ぶ。前半「コードの音を知る」5レッスン +
  // 後半「選んで並べる」3レッスン + ブルースで締めくくり。どれも1枚の譜面(4小節×ブロック)。
  // ブロックの free は3周目「自分の音で」に使ってよい音。音符の下には度数を出す。
  {
    id: 'c2-find-third',
    chapterId: 'ch2',
    part: b('コードの音を知る', 'Know the chord tones'),
    title: b('コードから3度を探す', 'Find the 3rd in the chord'),
    outcome: b('コード記号を見て、そのコードの3度を演奏しよう。', 'Read a chord symbol and play its 3rd.'),
    progressionId: 'ii-V-I',
    defaultBpm: 70,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('コードから3度を探す', 'Find the 3rd in the chord'),
        instruction: b('コード記号を見て、そのコードの3度を演奏しよう。', 'Read a chord symbol and play its 3rd.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', rhythmBlocks: [
          { label: b('度数を見て', 'Read the degrees'), hint: b('積んだ音の下から2番目が3度', 'The 3rd is the second note from the bottom'), free: ['3'], bars: ['1:C3', '1:C3', '1:C3', '1:C3'] },
          { label: b('積んだ音から', 'From the stacked notes'), hint: b('度数のない和音から見つけて弾く。弾く瞬間に答えが光る', 'Find it in the unlabeled chord and play it. The answer lights up as you play'), free: ['3'], bars: ['1:C3/n', '1:C3/n', '1:C3/n', '1:C3/n'] },
          { label: b('記号だけで', 'From the symbol alone'), hint: b('コード記号だけを見て弾く。弾く瞬間に答えが光る', 'Read only the chord symbol and play. The answer lights up as you play'), free: ['3'], bars: ['1:3/h', '1:3/h', '1:3/h', '1:3/h'] },
          { label: b('キーFで', 'In F'), hint: b('別のキーでも、記号だけを見て弾く', 'Another key — read only the symbols and play'), free: ['3'], keyShift: 5, bars: ['1:3/h', '1:3/h', '1:3/h', '1:3/h'] },
          { label: b('キーB♭で', 'In B♭'), hint: b('別のキーでも、記号だけを見て弾く', 'Another key — read only the symbols and play'), free: ['3'], keyShift: 10, bars: ['1:3/h', '1:3/h', '1:3/h', '1:3/h'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('3度は、ルートから数えて3つ目の音です。m(マイナー)が付くコードは半音低い♭3になります。Dm7ならF、G7ならB、Cmaj7ならE。', 'The 3rd is the third note up from the root. Chords with an m (minor) take the half-step-lower ♭3: F in Dm7, B in G7, E in Cmaj7.'),
      mistakes: [b('記号だけになると迷う → まずルートを見つけ、そこから1つ飛ばしで上へ数える', 'Lost once only the symbol is left — find the root first, then count up skipping one note')],
    },
  },
  {
    id: 'c2-third',
    chapterId: 'ch2',
    part: b('コードの音を知る', 'Know the chord tones'),
    title: b('3度をリズムに乗せる', 'Put the 3rd into rhythm'),
    outcome: b('第1章のリズムのまま、各コードの3度を演奏しよう。', 'Keep the Chapter 1 rhythms and play the 3rd of each chord.'),
    progressionId: 'ii-V-I',
    defaultBpm: 90,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('3度をリズムに乗せる', 'Put the 3rd into rhythm'),
        instruction: b('第1章のリズムのまま、各コードの3度を演奏しよう。', 'Keep the Chapter 1 rhythms and play the 3rd of each chord.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', rhythmBlocks: [
          { label: b('3度を伸ばす', 'Hold the 3rd'), hint: b('コードが変わると3度の色も変わる', 'The 3rd changes color with the chord'), free: ['3'], bars: ['4.:3 8:3 r2', '4.:3 8:3 r2', '4.:3 8:3_ 2:3', '1:3'] },
          { label: b('裏で3度', '3rds on the and'), hint: b('裏拍だけで3度を', 'Play the 3rd on the offbeats only'), free: ['3'], bars: ['r8 8:3 r8 8:3 r8 8:3 r8 8:3', 'r8 8:3 r8 8:3 r8 8:3 r8 8:3', 'r8 8:3 r8 8:3 r8 8:3 r8 8:3', 'r8 8:3 r8 8:3 r2'] },
          { label: b('ルートと3度', 'Root and 3rd'), hint: b('オモテはルート、裏は3度', 'Root on the beat, 3rd on the and'), free: ['R', '3'], bars: ['8 8:3 8 8:3 8 8:3 8 8:3', '8 8:3 8 8:3 8 8:3 8 8:3', '8 8:3 8 8:3 8 8:3 8 8:3', '8 8:3 4:3 r2'] },
          { label: b('次の3度を先取り', 'Anticipate the next 3rd'), hint: b('小節の最後の裏で、次のコードの3度を出す', 'On the last and, play the next chord’s 3rd'), free: ['R', '3'], bars: ['4:3 r4 r4 r8 8:3>_', '4 r4 r4 r8 8:3>_', '2 r2', '4:3 4 2:3'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('3度はコードが明るいか暗いかを決める音です。ルートより雄弁で、この1音だけで「進行が分かって演奏している」響きになります。', 'The 3rd decides whether a chord is major or minor. It says more than the root — one note is enough to sound like you know the changes.'),
      mistakes: [b('3度がどの音か迷う → 音符の下の度数を見ながら、まず1周目を聴く', 'Not sure which note is the 3rd — read the degree under each note and listen to pass 1 first')],
    },
  },
  {
    id: 'c2-find-seventh',
    chapterId: 'ch2',
    part: b('コードの音を知る', 'Know the chord tones'),
    title: b('コードから7度を探す', 'Find the 7th in the chord'),
    outcome: b('コード記号を見て、そのコードの7度を演奏しよう。', 'Read a chord symbol and play its 7th.'),
    progressionId: 'ii-V-I',
    defaultBpm: 70,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('コードから7度を探す', 'Find the 7th in the chord'),
        instruction: b('コード記号を見て、そのコードの7度を演奏しよう。', 'Read a chord symbol and play its 7th.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', rhythmBlocks: [
          { label: b('度数を見て', 'Read the degrees'), hint: b('積んだ音のいちばん上が7度', 'The 7th is the top note of the stack'), free: ['7'], bars: ['1:C7', '1:C7', '1:C7', '1:C7'] },
          { label: b('積んだ音から', 'From the stacked notes'), hint: b('度数のない和音から見つけて弾く。弾く瞬間に答えが光る', 'Find it in the unlabeled chord and play it. The answer lights up as you play'), free: ['7'], bars: ['1:C7/n', '1:C7/n', '1:C7/n', '1:C7/n'] },
          { label: b('記号だけで', 'From the symbol alone'), hint: b('コード記号だけを見て弾く。弾く瞬間に答えが光る', 'Read only the chord symbol and play. The answer lights up as you play'), free: ['7'], bars: ['1:7/h', '1:7/h', '1:7/h', '1:7/h'] },
          { label: b('キーFで', 'In F'), hint: b('別のキーでも、記号だけを見て弾く', 'Another key — read only the symbols and play'), free: ['7'], keyShift: 5, bars: ['1:7/h', '1:7/h', '1:7/h', '1:7/h'] },
          { label: b('キーB♭で', 'In B♭'), hint: b('別のキーでも、記号だけを見て弾く', 'Another key — read only the symbols and play'), free: ['7'], keyShift: 10, bars: ['1:7/h', '1:7/h', '1:7/h', '1:7/h'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('7度はルートのすぐ下(1オクターブ上のルートから下がった音)です。maj7はルートの半音下、m7と7は全音下の♭7になります。Dm7ならC、G7ならF、Cmaj7ならB。', 'The 7th sits just below the octave root: a half step below it in maj7, a whole step below (♭7) in m7 and 7 chords. C in Dm7, F in G7, B in Cmaj7.'),
      mistakes: [b('maj7と7で迷う → 「maj7は半音下、それ以外は全音下」とだけ覚える', 'Mixing up maj7 and 7 — remember just: maj7 is a half step below the root, the others a whole step')],
    },
  },
  {
    id: 'c2-guide',
    chapterId: 'ch2',
    part: b('コードの音を知る', 'Know the chord tones'),
    title: b('3度と7度で進行を描く', 'Draw the changes with 3rds and 7ths'),
    technicalName: b('ガイドトーン', 'Guide tones'),
    outcome: b('3度と7度の2音だけで、コードが進む感じを出そう。', 'Make the changes audible with just the 3rd and 7th.'),
    progressionId: 'ii-V-I',
    defaultBpm: 90,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('3度と7度で進行を描く', 'Draw the changes with 3rds and 7ths'),
        instruction: b('3度と7度の2音だけで、コードが進む感じを出そう。', 'Make the changes audible with just the 3rd and 7th.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', rhythmBlocks: [
          { label: b('3度から7度へ', '3rd to 7th'), hint: b('1拍目に3度、裏で7度', '3rd on beat 1, 7th on the and'), free: ['3', '7'], bars: ['4:3 r8 8:7 r2', '4:3 r8 8:7 r2', '4:3 r8 8:7 r2', '4:3 r8 8:7 r2'] },
          { label: b('7度から3度へ', '7th to 3rd'), hint: b('今度は7度から', 'Now start from the 7th'), free: ['3', '7'], bars: ['4:7 r8 8:3 r2', '4:7 r8 8:3 r2', '4:7 r8 8:3 r2', '2:7 2:3'] },
          { label: b('2・4拍に置く', 'Sit on 2 and 4'), hint: b('クリックと一緒に、短く', 'Short, together with the click'), free: ['3', '7'], bars: ['r4 4:3/s r4 4:7/s', 'r4 4:3/s r4 4:7/s', 'r4 4:3/s r4 4:7/s', 'r4 4:3/s r2'] },
          { label: b('短いフレーズで', 'In short phrases'), hint: b('裏から入る短いリズムに2音を載せる', 'Put the two notes on short offbeat rhythms'), free: ['3', '7'], bars: ['r8 8:3 8:7 8:3/s r2', 'r4 r8 8:7 8:3 8:7/as r4', 'r8 8:3 8:7 8:3 4:7 r4', '2:3 r2'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('3度と7度はコードの性格を決める2音です。G7ではこの2音が増4度(トライトーン)になり、それが「早く解決したい」の正体です。', 'The 3rd and 7th define a chord’s character. On G7 they form a tritone — that is what makes it want to resolve.'),
      mistakes: [b('音が足りなく感じる → 2音でも進行が聞こえることを先に確かめる。増やすのは次のレッスン', 'Feels too thin — first hear that two notes spell the changes; you add more next lesson')],
    },
  },
  {
    id: 'c2-arpeggio',
    chapterId: 'ch2',
    part: b('コードの音を知る', 'Know the chord tones'),
    title: b('4つの音を順に並べる', 'Line up the four chord tones'),
    technicalName: b('コードトーン・アルペジオ', 'Chord-tone arpeggios'),
    outcome: b('1-3-5-7の4音を、スウィング8分で上り下りしよう。', 'Run 1-3-5-7 up and down in swing 8ths.'),
    progressionId: 'ii-V-I',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('4つの音を順に並べる', 'Line up the four chord tones'),
        instruction: b('1-3-5-7の4音を、スウィング8分で上り下りしよう。', 'Run 1-3-5-7 up and down in swing 8ths.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', rhythmBlocks: [
          { label: b('上る', 'Up'), hint: b('1-3-5-7と上る', 'Climb 1-3-5-7'), free: ['R', '3', '5', '7'], bars: ['8 8:3 8:5 8:7 8 8:3 8:5 8:7', '8 8:3 8:5 8:7 8 8:3 8:5 8:7', '8 8:3 8:5 8:7 8 8:3 8:5 8:7', '8 8:3 8:5 8:7 2:8'] },
          { label: b('下る', 'Down'), hint: b('7-5-3-1と下る', 'Come down 7-5-3-1'), free: ['R', '3', '5', '7'], bars: ['8:7 8:5 8:3 8 8:7 8:5 8:3 8', '8:7 8:5 8:3 8 8:7 8:5 8:3 8', '8:7 8:5 8:3 8 8:7 8:5 8:3 8', '8:7 8:5 8:3 8 2'] },
          { label: b('3度から', 'From the 3rd'), hint: b('3度から上って、7度で止める', 'Start on the 3rd, stop on the 7th'), free: ['R', '3', '5', '7'], bars: ['8:3 8:5 8:7 8:8 8:3 8:5 8:7 8:8', '8:3 8:5 8:7 8:8 8:3 8:5 8:7 8:8', '8:3 8:5 8:7 8:8 8:3 8:5 8:7 8:8', '8:3 8:5 8:7 8:8 4:7 r4'] },
          { label: b('上って下る', 'Up and back'), hint: b('いちばん高い音を強く', 'Accent the top note'), free: ['R', '3', '5', '7'], bars: ['8 8:3 8:5 8:7 8:8/a 8:7 8:5 8:3', '8 8:3 8:5 8:7 8:8/a 8:7 8:5 8:3', '8 8:3 8:5 8:7 8:8/a 8:7 8:5 8:3', '2:3 r2'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('1-3-5-7は伸ばしても濁らない「安全地帯」です。テンポの中で上り下りできると、どこからでも安全な音に戻れます。', 'The 1-3-5-7 are safe ground — you can hold them without clashing. Running them in time means you can always get back to a safe note.'),
      mistakes: [b('8分が走る → テンポを下げて、2・4拍のクリックに合わせる', 'Rushing the 8ths — lower the tempo and lock onto the 2-and-4 click')],
    },
  },
  {
    id: 'c2-words',
    chapterId: 'ch2',
    part: b('選んで並べる', 'Choose and arrange'),
    title: b('同じリズムで音を変える', 'Same rhythm, new notes'),
    outcome: b('リズムはそのまま、使うコードの音だけを変えよう。', 'Keep the rhythm and change only which chord tones you use.'),
    progressionId: 'ii-V-I',
    defaultBpm: 90,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('同じリズムで音を変える', 'Same rhythm, new notes'),
        instruction: b('リズムはそのまま、使うコードの音だけを変えよう。', 'Keep the rhythm and change only which chord tones you use.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', rhythmBlocks: [
          { label: b('1と3', '1 and 3'), hint: b('裏で入って、短く強く締める', 'Enter on the and, close short and strong'), free: ['R', '3'], bars: ['r8 8 8:3 8 8:3/as r8 r4', 'r8 8 8:3 8 8:3/as r8 r4', 'r8 8 8:3 8 8:3/as r8 r4', 'r8 8 8:3 8 8:3/as r8 r4'] },
          { label: b('3と5', '3 and 5'), hint: b('同じリズムで、3度と5度', 'Same rhythm, 3rd and 5th'), free: ['3', '5'], bars: ['r8 8:3 8:5 8:3 8:5/as r8 r4', 'r8 8:3 8:5 8:3 8:5/as r8 r4', 'r8 8:3 8:5 8:3 8:5/as r8 r4', 'r8 8:3 8:5 8:3 8:5/as r8 r4'] },
          { label: b('5と7', '5 and 7'), hint: b('同じリズムで、5度と7度', 'Same rhythm, 5th and 7th'), free: ['5', '7'], bars: ['r8 8:5 8:7 8:5 8:7/as r8 r4', 'r8 8:5 8:7 8:5 8:7/as r8 r4', 'r8 8:5 8:7 8:5 8:7/as r8 r4', 'r8 8:5 8:7 8:5 8:7/as r8 r4'] },
          { label: b('小節ごとに変える', 'Change every bar'), hint: b('上る・下るを小節ごとに', 'Go up or down, bar by bar'), free: ['R', '3', '5', '7'], bars: ['r8 8 8:3 8:5 8:7/as r8 r4', 'r8 8:7 8:5 8:3 8/as r8 r4', 'r8 8:3 8:5 8:7 8:8/as r8 r4', 'r8 8:8 8:7 8:5 8:3/as r8 r4'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('ジャズ奏者はリズムの形を先に決めて、音だけを入れ替えて練習します。リズムが同じなら、音の選び方の違いがはっきり聞こえます。', 'Jazz players often fix a rhythm and swap only the notes. With the rhythm held still, the difference your note choice makes is easy to hear.'),
      mistakes: [b('音を変えるとリズムが崩れる → 先に1音でリズムだけ演奏してから音を戻す', 'The rhythm falls apart when the notes change — play the rhythm on one note first, then bring the notes back')],
    },
  },
  {
    id: 'c2-contour',
    chapterId: 'ch2',
    part: b('選んで並べる', 'Choose and arrange'),
    title: b('跳んで、戻る', 'Leap and come back'),
    outcome: b('コードの音どうしを跳んで、フレーズに上がり下がりを付けよう。', 'Leap between chord tones and give the phrase a rise and fall.'),
    progressionId: 'ii-V-I',
    defaultBpm: 90,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('跳んで、戻る', 'Leap and come back'),
        instruction: b('コードの音どうしを跳んで、フレーズに上がり下がりを付けよう。', 'Leap between chord tones and give the phrase a rise and fall.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', rhythmBlocks: [
          { label: b('上へ跳ぶ', 'Leap up'), hint: b('1から5、1オクターブ上の1へ', 'From 1 to 5, up to the high 1'), free: ['R', '5'], bars: ['8 8:5 4:8 r2', '8 8:5 4:8 r2', '8 8:5 4:8 r2', '8 8:5 4:8 r2'] },
          { label: b('上から降りる', 'Come down from the top'), hint: b('高い1から7、5へ', 'From the high 1 down to 7 and 5'), free: ['R', '3', '5', '7'], bars: ['8:8 8:7 4:5 r2', '8:8 8:7 4:5 r2', '8:8 8:7 4:5 r2', '8:8 8:7 8:5 8:3 2'] },
          { label: b('いちばん高い音を強く', 'Accent the top'), hint: b('上りきった音にアクセント', 'Accent the note at the top'), free: ['R', '3', '5', '7'], bars: ['8 8:3 8:5 8:8/a 8:5 8:3 4', '8 8:3 8:5 8:8/a 8:5 8:3 4', '8 8:3 8:5 8:8/a 8:5 8:3 4', '8 8:3 8:5 8:8/as r2'] },
          { label: b('山の形', 'A hill shape'), hint: b('上って、高い所で強く、戻る', 'Climb, hit the top, come back down'), free: ['R', '3', '5', '7'], bars: ['r8 8 8:3 8:5 8:7 8:8/a 4:7', 'r8 8:3 8:5 8:7 8:8/a 8:7 4:5', 'r8 8 8:3 8:5 8:8/a 8:7 8:5 8:3', '2:3 r2'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('音が順番に並ぶだけだと平らに聞こえます。跳んで戻る形と、いちばん高い音のアクセントで、フレーズに山ができます。', 'Notes in plain order sound flat. Leaps that come back, and an accent on the top note, give the phrase a peak.'),
      mistakes: [b('跳んだ先の音が外れる → 跳ぶ前の音と跳んだ先の音を、ゆっくり交互に鳴らしてから', 'Missing the note you leap to — first alternate the two notes slowly')],
    },
  },
  {
    id: 'c2-landing',
    chapterId: 'ch2',
    part: b('選んで並べる', 'Choose and arrange'),
    title: b('解決で着地する', 'Land on the resolution'),
    technicalName: b('着地', 'Landing'),
    outcome: b('落ち着くコード(Cmaj7)の3度に、狙って着地しよう。', 'Aim for the 3rd of the settling chord (Cmaj7) and land on it.'),
    progressionId: 'ii-V-I',
    defaultBpm: 90,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('解決で着地する', 'Land on the resolution'),
        instruction: b('落ち着くコード(Cmaj7)の3度に、狙って着地しよう。', 'Aim for the 3rd of the settling chord (Cmaj7) and land on it.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', rhythmBlocks: [
          { label: b('1拍目ちょうどに', 'Right on beat 1'), hint: b('Cmaj7の1拍目に3度を置く', 'Put the 3rd on beat 1 of Cmaj7'), free: ['R', '3', '5', '7'], bars: ['r8 8:3 8:5 8:7 r2', 'r8 8:7 8:5 8:3 r2', '2:3/t r2', 'r1'] },
          { label: b('食って着地', 'Arrive early'), hint: b('G7の最後の裏から、Cmaj7の3度へ', 'From the last and of G7 into the 3rd of Cmaj7'), free: ['R', '3', '5', '7'], bars: ['r8 8:3 8:5 8:7 r2', 'r8 8:7 8:5 8:3 r4 r8 8:3>_', '2 r2', 'r1'] },
          { label: b('助走から着地', 'Run up and land'), hint: b('G7の後半から1拍目へ向かう', 'From the second half of G7, head for beat 1'), free: ['R', '3', '5', '7'], bars: ['4:3 r4 r2', 'r2 8 8:3 8:5 8:7', '2:3/t r2', 'r1'] },
          { label: b('3つを合わせる', 'All three together'), hint: b('裏で入り、食って、3度で着地', 'Enter on the and, arrive early, land on the 3rd'), free: ['R', '3', '5', '7'], bars: ['r8 8:3 8:5 8:7 8:8 8:7 r4', 'r8 8:7 8:5 8:3 r4 r8 8:3>_', '2 r8 8:5 8:3 8', '2:3 r2'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('いちばん落ち着かないG7から、落ち着くCmaj7へ。その到着の瞬間に3度があると「帰ってきた」と聞こえます。半拍早めると、前へ進む勢いも付きます。', 'From the most unsettled chord to the most settled one. A 3rd at the moment of arrival sounds like coming home — and arriving half a beat early adds forward motion.'),
      mistakes: [b('着地の前に音が詰まる → 着地の音を先に決めて、そこから逆算する', 'Crowding the notes before the landing — pick the landing note first and work back from it')],
    },
  },
  {
    id: 'c2-scale',
    chapterId: 'ch2',
    part: b('選んで並べる', 'Choose and arrange'),
    title: b('コードの音を音階でつなぐ', 'Join chord tones with the scale'),
    outcome: b('拍の頭にコードの音を置いて、そのあいだを音階の音でつなごう。', 'Put chord tones on the beats and join them with scale notes.'),
    progressionId: 'ii-V-I',
    defaultBpm: 90,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('コードの音を音階でつなぐ', 'Join chord tones with the scale'),
        instruction: b('拍の頭にコードの音を置いて、そのあいだを音階の音でつなごう。', 'Put chord tones on the beats and join them with scale notes.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', rhythmBlocks: [
          { label: b('音階で上って下りる', 'Up and down the scale'), hint: b('拍の頭にコードの音が来る', 'Chord tones fall on the beats'), bars: ['8:=D4 8:=E4 8:=F4 8:=G4 8:=A4 8:=B4 8:=C5 8:=D5', '8:=F5 8:=E5 8:=D5 8:=C5 8:=B4 8:=A4 8:=G4 8:=F4', '2:=E4 r2', 'r1'] },
          { label: b('短く上って着地', 'A short climb to the landing'), hint: b('後半から入り、次の頭でコードの音へ', 'Enter in the second half and reach a chord tone on the next downbeat'), bars: ['r2 8:=D4 8:=E4 8:=F4 8:=A4', '4:=B4 r4 8:=G4 8:=A4 8:=B4 8:=D5', '2:=E5 r2', 'r1'] },
          { label: b('上から下りる', 'Come down from above'), hint: b('下りるときも、拍の頭はコードの音', 'Going down, the beats are still chord tones'), bars: ['r2 8:=A4 8:=G4 8:=F4 8:=E4', '4:=D4 r4 8:=D5 8:=C5 8:=B4 8:=A4', '2:=G4 r2', 'r1'] },
          { label: b('続きを作る', 'Finish it yourself'), hint: b('G7から先は自分で。拍の頭にコードの音を', 'From G7 on it is yours. Keep chord tones on the beats'), bars: ['8:=D4 8:=E4 8:=F4 8:=G4 8:=A4 8:=B4 8:=C5 8:=D5', 'own', 'own', 'r1'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('コードの音だけだと線が跳びます。あいだを音階の音でつなぐと、なめらかな線になります。拍の頭にコードの音があれば、進行は聞こえたままです。', 'Chord tones alone make a line that leaps. Joining them with scale notes makes it smooth, and with chord tones on the beats the changes stay audible.'),
      mistakes: [b('どの音階か迷う → キーの音階(Cならドレミファソラシ)だけでよい', 'Not sure which scale — the scale of the key (C major in C) is all you need')],
    },
  },
  {
    id: 'c2-blues',
    chapterId: 'ch2',
    title: b('ブルースをコードの音で1コーラス', 'A blues chorus on chord tones'),
    outcome: b('12小節ブルースを、コードの音だけで1コーラス通そう。', 'Take one chorus of 12-bar blues using chord tones only.'),
    progressionId: 'blues',
    defaultBpm: 100,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('ブルースをコードの音で1コーラス', 'A blues chorus on chord tones'),
        instruction: b('12小節ブルースを、コードの音だけで1コーラス通そう。', 'Take one chorus of 12-bar blues using chord tones only.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', rhythmBlocks: [
          { label: b('3度を中心に', 'Center on the 3rd'), hint: b('C7とF7の3度を聴き分ける', 'Hear the 3rds of C7 and F7'), free: ['R', '3', '5', '7'], bars: ['r8 8:3 8:5 8:3 4 r4', 'r8 8:3 8:5 8:3 4 r4', 'r8 8:3 8:5 8:7 8:8 8:7 4:5', '2:3 r2'] },
          { label: b('7度も使う', 'Bring in the 7th'), hint: b('F7の♭7を長く', 'Lean on the ♭7 of F7'), free: ['R', '3', '5', '7'], bars: ['4:7/t r8 8:5 8:3 8 r4', 'r8 8:3 8:5 8:7 4:8 r4', '4:7 r8 8:5 8:3 8 r4', 'r2 r8 8:3 8:5 8:7'] },
          { label: b('ii-Vで着地', 'Land after the ii-V'), hint: b('G7から食って、C7の3度へ', 'From G7, arrive early on the 3rd of C7'), free: ['R', '3', '5', '7'], bars: ['4:8 8:7 8:5 8:3 8 r4', 'r8 8:7 8:5 8:3 r4 r8 8:3>_', '2 r8 8:3 8:5 8:7', '4:3 r4 8:3 8:7 r4'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('ブルースの9-10-11小節はDm7-G7-C7。このレッスンまでに練習したii-V-Iの着地が、そのまま曲の中に出てきます。', 'Bars 9-10-11 of a blues are Dm7-G7-C7 — the ii-V-I landing you just practised appears right inside the tune.'),
      mistakes: [b('12小節で迷う → 4小節ずつの3ブロックで数える', 'Getting lost in 12 bars — count it as three blocks of four')],
    },
  },

  // ================= 第4章(id: phrases) フレーズを覚えて使う =================
  // ii-V-I の短い定番フレーズを1レッスンに1つ。A そのまま → B・C 別のキー(keyShift) → D 前半だけ書いて後半は自分(own)。
  // 音は「:=音名」でキーCのまま書く。フレーズは特定の録音の採譜ではなく、よく使われる形。
  {
    id: 'p3-1',
    chapterId: 'phrases',
    title: b('順に下って3度へ', 'Step down to the 3rd'),
    outcome: b('ii-V-I のフレーズを1つ覚えて、3つのキーで演奏しよう。', 'Learn one ii-V-I phrase and play it in three keys.'),
    progressionId: 'ii-V-I',
    defaultBpm: 90,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('順に下って3度へ', 'Step down to the 3rd'),
        instruction: b('ii-V-I のフレーズを1つ覚えて、3つのキーで演奏しよう。', 'Learn one ii-V-I phrase and play it in three keys.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', memorize: true, rhythmBlocks: [
          { label: b('覚える', 'Learn it'), hint: b('3度から順に下り、次のコードの3度に着地', 'Step down from the 3rd and land on the next chord’s 3rd'), bars: ['r2 8:=F5 8:=E5 8:=D5 8:=C5', '4:=B4 r4 8:=B4 8:=A4 8:=G4 8:=F4', '2:=E4 r2', 'r1'] },
          { label: b('キーFで', 'In F'), hint: b('同じ形をキーFで', 'The same shape in F'), keyShift: 5, bars: ['r2 8:=F5 8:=E5 8:=D5 8:=C5', '4:=B4 r4 8:=B4 8:=A4 8:=G4 8:=F4', '2:=E4 r2', 'r1'] },
          { label: b('キーB♭で', 'In B♭'), hint: b('同じ形をキーB♭で', 'The same shape in B♭'), keyShift: 10, bars: ['r2 8:=F5 8:=E5 8:=D5 8:=C5', '4:=B4 r4 8:=B4 8:=A4 8:=G4 8:=F4', '2:=E4 r2', 'r1'] },
          { label: b('続きを作る', 'Finish it yourself'), hint: b('書いてある出だしに続けて、G7から先は自分で', 'Continue from the written opening; from G7 on it is yours'), bars: ['r2 8:=F5 8:=E5 8:=D5 8:=C5', 'own', 'own', 'r1'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('7度から次のコードの3度へ半音で下りる動きが、ii-V-I の線の芯です。順に下るだけで、その動きが2回続きます。', 'The 7th falling a half step to the next chord’s 3rd is the core of a ii-V-I line. Stepping down gives you that move twice in a row.'),
      mistakes: [b('別のキーで迷う → 音名ではなく「何度から何度へ」で覚える', 'Lost in another key — remember it as degrees, not note names')],
    },
  },
  {
    id: 'p3-2',
    chapterId: 'phrases',
    title: b('分散和音で上って3度へ', 'Arpeggio up to the 3rd'),
    outcome: b('ii-V-I のフレーズを1つ覚えて、3つのキーで演奏しよう。', 'Learn one ii-V-I phrase and play it in three keys.'),
    progressionId: 'ii-V-I',
    defaultBpm: 90,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('分散和音で上って3度へ', 'Arpeggio up to the 3rd'),
        instruction: b('ii-V-I のフレーズを1つ覚えて、3つのキーで演奏しよう。', 'Learn one ii-V-I phrase and play it in three keys.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', memorize: true, rhythmBlocks: [
          { label: b('覚える', 'Learn it'), hint: b('1-3-5-7と上り、次のコードの3度へ下りる', 'Climb 1-3-5-7, then drop to the next chord’s 3rd'), bars: ['r2 8:=D4 8:=F4 8:=A4 8:=C5', '4:=B4 r4 8:=G4 8:=B4 8:=D5 8:=F5', '2:=E5 r2', 'r1'] },
          { label: b('キーFで', 'In F'), hint: b('同じ形をキーFで', 'The same shape in F'), keyShift: 5, bars: ['r2 8:=D4 8:=F4 8:=A4 8:=C5', '4:=B4 r4 8:=G4 8:=B4 8:=D5 8:=F5', '2:=E5 r2', 'r1'] },
          { label: b('キーB♭で', 'In B♭'), hint: b('同じ形をキーB♭で', 'The same shape in B♭'), keyShift: 10, bars: ['r2 8:=D4 8:=F4 8:=A4 8:=C5', '4:=B4 r4 8:=G4 8:=B4 8:=D5 8:=F5', '2:=E5 r2', 'r1'] },
          { label: b('続きを作る', 'Finish it yourself'), hint: b('書いてある出だしに続けて、G7から先は自分で', 'Continue from the written opening; from G7 on it is yours'), bars: ['r2 8:=D4 8:=F4 8:=A4 8:=C5', 'own', 'own', 'r1'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('第2章で練習した分散和音が、そのままフレーズになります。上りきった7度が、次の3度へ半音で下ります。', 'The arpeggios from Chapter 2 become a phrase as they are. The 7th at the top falls a half step to the next 3rd.'),
      mistakes: [b('別のキーで迷う → 音名ではなく「何度から何度へ」で覚える', 'Lost in another key — remember it as degrees, not note names')],
    },
  },
  {
    id: 'p3-3',
    chapterId: 'phrases',
    title: b('5度から下って3度へ', 'Down from the 5th'),
    outcome: b('ii-V-I のフレーズを1つ覚えて、3つのキーで演奏しよう。', 'Learn one ii-V-I phrase and play it in three keys.'),
    progressionId: 'ii-V-I',
    defaultBpm: 90,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('5度から下って3度へ', 'Down from the 5th'),
        instruction: b('ii-V-I のフレーズを1つ覚えて、3つのキーで演奏しよう。', 'Learn one ii-V-I phrase and play it in three keys.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', memorize: true, rhythmBlocks: [
          { label: b('覚える', 'Learn it'), hint: b('5度から分散和音で下り、次のコードの3度へ', 'Come down the arpeggio from the 5th to the next chord’s 3rd'), bars: ['r2 8:=A5 8:=F5 8:=D5 8:=C5', '4:=B4 r4 8:=D5 8:=B4 8:=G4 8:=F4', '2:=E4 r2', 'r1'] },
          { label: b('キーFで', 'In F'), hint: b('同じ形をキーFで', 'The same shape in F'), keyShift: 5, bars: ['r2 8:=A5 8:=F5 8:=D5 8:=C5', '4:=B4 r4 8:=D5 8:=B4 8:=G4 8:=F4', '2:=E4 r2', 'r1'] },
          { label: b('キーB♭で', 'In B♭'), hint: b('同じ形をキーB♭で', 'The same shape in B♭'), keyShift: 10, bars: ['r2 8:=A5 8:=F5 8:=D5 8:=C5', '4:=B4 r4 8:=D5 8:=B4 8:=G4 8:=F4', '2:=E4 r2', 'r1'] },
          { label: b('続きを作る', 'Finish it yourself'), hint: b('書いてある出だしに続けて、G7から先は自分で', 'Continue from the written opening; from G7 on it is yours'), bars: ['r2 8:=A5 8:=F5 8:=D5 8:=C5', 'own', 'own', 'r1'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('上から下りてくる形です。1・2と合わせた3つが、ii-V-I をつなぐ基本の骨組みです。', 'A shape that comes down from above. Together with phrases 1 and 2, these are the three basic outlines for connecting a ii-V-I.'),
      mistakes: [b('別のキーで迷う → 音名ではなく「何度から何度へ」で覚える', 'Lost in another key — remember it as degrees, not note names')],
    },
  },
  {
    id: 'p3-4',
    chapterId: 'phrases',
    title: b('9度まで上る', 'Up to the 9th'),
    outcome: b('ii-V-I のフレーズを1つ覚えて、3つのキーで演奏しよう。', 'Learn one ii-V-I phrase and play it in three keys.'),
    progressionId: 'ii-V-I',
    defaultBpm: 90,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('9度まで上る', 'Up to the 9th'),
        instruction: b('ii-V-I のフレーズを1つ覚えて、3つのキーで演奏しよう。', 'Learn one ii-V-I phrase and play it in three keys.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', memorize: true, rhythmBlocks: [
          { label: b('覚える', 'Learn it'), hint: b('3度から3-5-7-9と上る', 'Climb 3-5-7-9 from the 3rd'), bars: ['r2 8:=F4 8:=A4 8:=C5 8:=E5', '4:=D5 r4 8:=B4 8:=A4 8:=G4 8:=F4', '2:=E4 r2', 'r1'] },
          { label: b('キーFで', 'In F'), hint: b('同じ形をキーFで', 'The same shape in F'), keyShift: 5, bars: ['r2 8:=F4 8:=A4 8:=C5 8:=E5', '4:=D5 r4 8:=B4 8:=A4 8:=G4 8:=F4', '2:=E4 r2', 'r1'] },
          { label: b('キーB♭で', 'In B♭'), hint: b('同じ形をキーB♭で', 'The same shape in B♭'), keyShift: 10, bars: ['r2 8:=F4 8:=A4 8:=C5 8:=E5', '4:=D5 r4 8:=B4 8:=A4 8:=G4 8:=F4', '2:=E4 r2', 'r1'] },
          { label: b('続きを作る', 'Finish it yourself'), hint: b('書いてある出だしに続けて、G7から先は自分で', 'Continue from the written opening; from G7 on it is yours'), bars: ['r2 8:=F4 8:=A4 8:=C5 8:=E5', 'own', 'own', 'r1'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('3度から始めると、分散和音がコードの9度まで届きます。ルートを弾かない分、線が軽く聞こえます。', 'Starting on the 3rd, the arpeggio reaches the 9th. Leaving out the root makes the line sound lighter.'),
      mistakes: [b('別のキーで迷う → 音名ではなく「何度から何度へ」で覚える', 'Lost in another key — remember it as degrees, not note names')],
    },
  },
  {
    id: 'p3-5',
    chapterId: 'phrases',
    title: b('半音下から入る', 'Slide in from a half step below'),
    outcome: b('ii-V-I のフレーズを1つ覚えて、3つのキーで演奏しよう。', 'Learn one ii-V-I phrase and play it in three keys.'),
    progressionId: 'ii-V-I',
    defaultBpm: 90,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('半音下から入る', 'Slide in from a half step below'),
        instruction: b('ii-V-I のフレーズを1つ覚えて、3つのキーで演奏しよう。', 'Learn one ii-V-I phrase and play it in three keys.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', memorize: true, rhythmBlocks: [
          { label: b('覚える', 'Learn it'), hint: b('狙う音の半音下から入る', 'Enter from a half step below the target'), bars: ['r4 r8 8:=C#4 8:=D4 8:=F4 8:=A4 8:=C5', '4:=B4 r4 8:=G4 8:=F4 8:=D4 8:=D#4', '2:=E4 r2', 'r1'] },
          { label: b('キーFで', 'In F'), hint: b('同じ形をキーFで', 'The same shape in F'), keyShift: 5, bars: ['r4 r8 8:=C#4 8:=D4 8:=F4 8:=A4 8:=C5', '4:=B4 r4 8:=G4 8:=F4 8:=D4 8:=D#4', '2:=E4 r2', 'r1'] },
          { label: b('キーB♭で', 'In B♭'), hint: b('同じ形をキーB♭で', 'The same shape in B♭'), keyShift: 10, bars: ['r4 r8 8:=C#4 8:=D4 8:=F4 8:=A4 8:=C5', '4:=B4 r4 8:=G4 8:=F4 8:=D4 8:=D#4', '2:=E4 r2', 'r1'] },
          { label: b('続きを作る', 'Finish it yourself'), hint: b('書いてある出だしに続けて、G7から先は自分で', 'Continue from the written opening; from G7 on it is yours'), bars: ['r4 r8 8:=C#4 8:=D4 8:=F4 8:=A4 8:=C5', 'own', 'own', 'r1'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('狙う音の半音下を直前に置くと、コードにない音でもジャズらしく聞こえます。弱い拍(裏)に置くのがこつです。', 'A half step below the target, placed just before it, sounds like jazz even though it is outside the chord. Keep it on a weak part of the beat.'),
      mistakes: [b('別のキーで迷う → 音名ではなく「何度から何度へ」で覚える', 'Lost in another key — remember it as degrees, not note names')],
    },
  },
  {
    id: 'p3-6',
    chapterId: 'phrases',
    title: b('上下から囲んで着地', 'Surround the landing note'),
    outcome: b('ii-V-I のフレーズを1つ覚えて、3つのキーで演奏しよう。', 'Learn one ii-V-I phrase and play it in three keys.'),
    progressionId: 'ii-V-I',
    defaultBpm: 90,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('上下から囲んで着地', 'Surround the landing note'),
        instruction: b('ii-V-I のフレーズを1つ覚えて、3つのキーで演奏しよう。', 'Learn one ii-V-I phrase and play it in three keys.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', memorize: true, rhythmBlocks: [
          { label: b('覚える', 'Learn it'), hint: b('着地の音を上と下から挟む', 'Approach the landing note from above and below'), bars: ['r2 8:=F5 8:=E5 8:=D5 8:=C5', '4:=B4 r4 r8 8:=G4 8:=F4 8:=D#4', '2:=E4 r2', 'r1'] },
          { label: b('キーFで', 'In F'), hint: b('同じ形をキーFで', 'The same shape in F'), keyShift: 5, bars: ['r2 8:=F5 8:=E5 8:=D5 8:=C5', '4:=B4 r4 r8 8:=G4 8:=F4 8:=D#4', '2:=E4 r2', 'r1'] },
          { label: b('キーB♭で', 'In B♭'), hint: b('同じ形をキーB♭で', 'The same shape in B♭'), keyShift: 10, bars: ['r2 8:=F5 8:=E5 8:=D5 8:=C5', '4:=B4 r4 r8 8:=G4 8:=F4 8:=D#4', '2:=E4 r2', 'r1'] },
          { label: b('続きを作る', 'Finish it yourself'), hint: b('書いてある出だしに続けて、G7から先は自分で', 'Continue from the written opening; from G7 on it is yours'), bars: ['r2 8:=F5 8:=E5 8:=D5 8:=C5', 'own', 'own', 'r1'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('着地の音を、1つ上と半音下の2音で挟みます(囲み込み)。着地がはっきり聞こえます。', 'Surround the landing note with the note above and the half step below (an enclosure). It makes the landing unmistakable.'),
      mistakes: [b('別のキーで迷う → 音名ではなく「何度から何度へ」で覚える', 'Lost in another key — remember it as degrees, not note names')],
    },
  },
  {
    id: 'p3-7',
    chapterId: 'phrases',
    title: b('2小節の長い線', 'A long two-bar line'),
    outcome: b('ii-V-I のフレーズを1つ覚えて、3つのキーで演奏しよう。', 'Learn one ii-V-I phrase and play it in three keys.'),
    progressionId: 'ii-V-I',
    defaultBpm: 80,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('2小節の長い線', 'A long two-bar line'),
        instruction: b('ii-V-I のフレーズを1つ覚えて、3つのキーで演奏しよう。', 'Learn one ii-V-I phrase and play it in three keys.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', memorize: true, rhythmBlocks: [
          { label: b('覚える', 'Learn it'), hint: b('8分を2小節続けて、3度に着地', 'Two bars of 8ths, landing on the 3rd'), bars: ['8:=A4 8:=G4 8:=F4 8:=E4 8:=D4 8:=F4 8:=A4 8:=C5', '8:=B4 8:=D5 8:=F5 8:=A5 8:=G5 8:=F5 8:=D5 8:=D#5', '2:=E5 r2', 'r1'] },
          { label: b('キーFで', 'In F'), hint: b('同じ形をキーFで', 'The same shape in F'), keyShift: 5, bars: ['8:=A4 8:=G4 8:=F4 8:=E4 8:=D4 8:=F4 8:=A4 8:=C5', '8:=B4 8:=D5 8:=F5 8:=A5 8:=G5 8:=F5 8:=D5 8:=D#5', '2:=E5 r2', 'r1'] },
          { label: b('キーB♭で', 'In B♭'), hint: b('同じ形をキーB♭で', 'The same shape in B♭'), keyShift: 10, bars: ['8:=A4 8:=G4 8:=F4 8:=E4 8:=D4 8:=F4 8:=A4 8:=C5', '8:=B4 8:=D5 8:=F5 8:=A5 8:=G5 8:=F5 8:=D5 8:=D#5', '2:=E5 r2', 'r1'] },
          { label: b('続きを作る', 'Finish it yourself'), hint: b('書いてある出だしに続けて、G7から先は自分で', 'Continue from the written opening; from G7 on it is yours'), bars: ['8:=A4 8:=G4 8:=F4 8:=E4 8:=D4 8:=F4 8:=A4 8:=C5', 'own', 'own', 'r1'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('ここまでの形をつなぐと長い線になります。拍の頭にコードの音が来るので、長くても進行が聞こえます。', 'Joining the shapes so far gives a long line. Chord tones fall on the beats, so the changes stay audible.'),
      mistakes: [b('別のキーで迷う → 音名ではなく「何度から何度へ」で覚える', 'Lost in another key — remember it as degrees, not note names')],
    },
  },
  {
    id: 'p3-8',
    chapterId: 'phrases',
    title: b('3連で駆け上がる', 'Run up in triplets'),
    outcome: b('ii-V-I のフレーズを1つ覚えて、3つのキーで演奏しよう。', 'Learn one ii-V-I phrase and play it in three keys.'),
    progressionId: 'ii-V-I',
    defaultBpm: 90,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('3連で駆け上がる', 'Run up in triplets'),
        instruction: b('ii-V-I のフレーズを1つ覚えて、3つのキーで演奏しよう。', 'Learn one ii-V-I phrase and play it in three keys.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', memorize: true, rhythmBlocks: [
          { label: b('覚える', 'Learn it'), hint: b('3連で分散和音を上り、4分で着地へ', 'Run up the arpeggio in triplets, then walk into the landing'), bars: ['r2 t8:=D4 t8:=F4 t8:=A4 4:=C5', '4:=B4 r4 t8:=G4 t8:=B4 t8:=D5 4:=F5', '2:=E5 r2', 'r1'] },
          { label: b('キーFで', 'In F'), hint: b('同じ形をキーFで', 'The same shape in F'), keyShift: 5, bars: ['r2 t8:=D4 t8:=F4 t8:=A4 4:=C5', '4:=B4 r4 t8:=G4 t8:=B4 t8:=D5 4:=F5', '2:=E5 r2', 'r1'] },
          { label: b('キーB♭で', 'In B♭'), hint: b('同じ形をキーB♭で', 'The same shape in B♭'), keyShift: 10, bars: ['r2 t8:=D4 t8:=F4 t8:=A4 4:=C5', '4:=B4 r4 t8:=G4 t8:=B4 t8:=D5 4:=F5', '2:=E5 r2', 'r1'] },
          { label: b('続きを作る', 'Finish it yourself'), hint: b('書いてある出だしに続けて、G7から先は自分で', 'Continue from the written opening; from G7 on it is yours'), bars: ['r2 t8:=D4 t8:=F4 t8:=A4 4:=C5', 'own', 'own', 'r1'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('第1章の3連を分散和音に使います。8分の流れの中で、ここだけ速く聞こえます。', 'The triplets from Chapter 1, applied to an arpeggio. Against the 8th-note flow, this spot sounds quick.'),
      mistakes: [b('別のキーで迷う → 音名ではなく「何度から何度へ」で覚える', 'Lost in another key — remember it as degrees, not note names')],
    },
  },

  // ================= 第5章(id: improv) その場で作る =================
  // 制限を一段ずつ外す: リズムだけ自分 → 掛け合い → 着地だけ決める → ブルースで1コーラス。own の小節が自分の番。
  {
    id: 'i4-rhythm',
    chapterId: 'improv',
    title: b('リズムを変えて使う', 'Same notes, your rhythm'),
    outcome: b('覚えたフレーズの音はそのまま、リズムだけ変えて演奏しよう。', 'Keep the notes of a phrase you know and change only the rhythm.'),
    progressionId: 'ii-V-I',
    defaultBpm: 110,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('リズムを変えて使う', 'Same notes, your rhythm'),
        instruction: b('覚えたフレーズの音はそのまま、リズムだけ変えて演奏しよう。', 'Keep the notes of a phrase you know and change only the rhythm.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', rhythmBlocks: [
          { label: b('そのまま', 'As written'), hint: b('第4章の1つ目のフレーズ', 'The first phrase from Chapter 4'), bars: ['r2 8:=F5 8:=E5 8:=D5 8:=C5', '4:=B4 r4 8:=B4 8:=A4 8:=G4 8:=F4', '2:=E4 r2', 'r1'] },
          { label: b('最初の音を伸ばす', 'Hold the first note'), hint: b('入りを早めて、最初の音を長く', 'Enter earlier and hold the first note'), bars: ['r4 4.:=F5 8:=E5 8:=D5 8:=C5', '2:=B4 8:=B4 8:=A4 8:=G4 8:=F4', '2:=E4 r2', 'r1'] },
          { label: b('音を間引く', 'Leave notes out'), hint: b('音を減らして、間を作る', 'Drop some notes and leave space'), bars: ['r2 4:=F5 8:=D5 8:=C5', '4:=B4 r4 r4 8:=G4 8:=F4', '2:=E4 r2', 'r1'] },
          { label: b('自分のリズムで', 'Your own rhythm'), hint: b('同じ音の順で、リズムは自分で決める', 'Same order of notes, your own rhythm'), bars: ['own', 'own', 'own', 'r1'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('同じ音でも、リズムを変えると別のフレーズに聞こえます。1つのフレーズが何通りにも使えるようになります。', 'The same notes with a new rhythm sound like a new phrase. One phrase becomes many.'),
      mistakes: [b('リズムを変えると着地がずれる → Cmaj7の1拍目の3度だけは動かさない', 'The landing drifts when the rhythm changes — keep the 3rd on beat 1 of Cmaj7 fixed')],
    },
  },
  {
    id: 'i4-trade',
    chapterId: 'improv',
    title: b('掛け合い', 'Trade fours'),
    outcome: b('譜面の4小節を聴いて、次の4小節で自分のフレーズを返そう。', 'Hear four written bars, then answer with four bars of your own.'),
    progressionId: 'ii-V-I',
    defaultBpm: 110,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('掛け合い', 'Trade fours'),
        instruction: b('譜面の4小節を聴いて、次の4小節で自分のフレーズを返そう。', 'Hear four written bars, then answer with four bars of your own.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', rhythmBlocks: [
          { label: b('譜面の番', 'The score plays'), hint: b('よく聴く(一緒に弾いてもよい)', 'Listen closely (or play along)'), bars: ['r2 8:=D4 8:=F4 8:=A4 8:=C5', '4:=B4 r4 8:=G4 8:=B4 8:=D5 8:=F5', '2:=E5 r2', 'r1'] },
          { label: b('自分の番', 'Your answer'), hint: b('似た形でも、違う形でもよい。4小節で返す', 'Similar or different — answer in four bars'), bars: ['own', 'own', 'own', 'own'] },
          { label: b('譜面の番', 'The score plays'), hint: b('よく聴く(一緒に弾いてもよい)', 'Listen closely (or play along)'), bars: ['r2 8:=F5 8:=E5 8:=D5 8:=C5', '4:=B4 r4 r8 8:=G4 8:=F4 8:=D#4', '2:=E4 r2', 'r1'] },
          { label: b('自分の番', 'Your answer'), hint: b('最後はCmaj7の3度に着地してみる', 'Try landing on the 3rd of Cmaj7'), bars: ['own', 'own', 'own', 'own'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('ジャズでは奏者どうしが4小節ずつ交代で演奏します。聴いた直後に返すと、聴いたリズムや形が自然に自分の音に入ってきます。', 'Jazz players trade four bars back and forth. Answering right after you listen pulls the rhythm and shape you heard into your own playing.'),
      mistakes: [b('何を弾くか迷って止まる → 聴いたフレーズの最初の2音だけまねて始める', 'Freezing — start by copying just the first two notes you heard')],
    },
  },
  {
    id: 'i4-landing',
    chapterId: 'improv',
    title: b('着地だけ決めて弾く', 'Fix only the landing'),
    outcome: b('着地の音だけ決めて、そこへ向かう線は自分で作ろう。', 'Decide only the landing note and make your own line toward it.'),
    progressionId: 'ii-V-I',
    defaultBpm: 110,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('着地だけ決めて弾く', 'Fix only the landing'),
        instruction: b('着地の音だけ決めて、そこへ向かう線は自分で作ろう。', 'Decide only the landing note and make your own line toward it.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', rhythmBlocks: [
          { label: b('3度に着地', 'Land on the 3rd'), hint: b('Dm7とG7は自由に。Cmaj7の1拍目で3度へ', 'Dm7 and G7 are free. Reach the 3rd on beat 1 of Cmaj7'), bars: ['own', 'own', '2:3 r2', 'r1'] },
          { label: b('5度に着地', 'Land on the 5th'), hint: b('今度は5度へ', 'Now aim for the 5th'), bars: ['own', 'own', '2:5 r2', 'r1'] },
          { label: b('ルートに着地', 'Land on the root'), hint: b('ルートに着地すると、はっきり終わる', 'Landing on the root sounds final'), bars: ['own', 'own', '2 r2', 'r1'] },
          { label: b('着地も自分で', 'Choose the landing too'), hint: b('どの音に着地するかも自分で決める', 'Pick the landing note yourself'), bars: ['own', 'own', 'own', 'r1'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('即興は「次にどこへ行くか」を先に決めると楽になります。着地が決まっていれば、途中の音は多少外れても線としてまとまります。', 'Improvising gets easier when you decide where you are going first. With the landing fixed, the notes on the way hold together as a line.'),
      mistakes: [b('着地に間に合わない → G7の3〜4拍から弾き始めるだけでもよい', 'Not arriving in time — it is fine to start only on beats 3-4 of G7')],
    },
  },
  {
    id: 'i4-blues',
    chapterId: 'improv',
    title: b('ブルースで1コーラス', 'A blues chorus, more and more yours'),
    outcome: b('12小節ブルースで、書いてあるフレーズから少しずつ自分の演奏へ移ろう。', 'Over a 12-bar blues, move step by step from written phrases to your own playing.'),
    progressionId: 'blues',
    defaultBpm: 110,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('ブルースで1コーラス', 'A blues chorus, more and more yours'),
        instruction: b('12小節ブルースで、書いてあるフレーズから少しずつ自分の演奏へ移ろう。', 'Over a 12-bar blues, move step by step from written phrases to your own playing.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', rhythmBlocks: [
          { label: b('書いてあるフレーズ', 'Written phrase'), hint: b('まず書いてあるとおりに', 'First, play it as written'), bars: ['r8 8:3 8:5 8:3 4 r4', 'r8 8:3 8:5 8:3 4 r4', 'r8 8:3 8:5 8:7 8:8 8:7 4:5', '2:3 r2'] },
          { label: b('後半は自分で', 'Second half is yours'), hint: b('前の2小節に答えるつもりで', 'Answer the two bars before'), bars: ['4:7/t r8 8:5 8:3 8 r4', 'r8 8:3 8:5 8:7 4:8 r4', 'own', 'own'] },
          { label: b('全部自分で', 'All yours'), hint: b('G7からC7の3度へ着地してみる', 'Try landing on the 3rd of C7 after G7'), bars: ['own', 'own', 'own', 'own'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('1コーラスの中で、まねる・答える・自分で作る、を順に行います。実際のソロもこの3つの組み合わせです。', 'Within one chorus you copy, answer, and create. Real solos are made of the same three things.'),
      mistakes: [b('最後の4小節で迷う → 9・10小節目はii-V。第4章のフレーズがそのまま使える', 'Lost in the last four bars — bars 9-10 are a ii-V, so the Chapter 4 phrases fit as they are')],
    },
  },

  // ================= 第6章(id: ch5) 1つの形を育てる =================
  // 短い形(モチーフ)を繰り返し、少し変え、問いと答えにする。形はコードの度数で書くので、コードが変わると音も変わる。
  {
    id: 'm5-repeat',
    chapterId: 'ch5',
    title: b('同じ形を各コードで繰り返す', 'Repeat one shape on every chord'),
    technicalName: b('モチーフ', 'Motif'),
    outcome: b('短い形を1つ決めて、コードが変わっても同じ形を演奏しよう。', 'Pick one short shape and play it on every chord.'),
    progressionId: 'ii-V-I',
    defaultBpm: 110,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('同じ形を各コードで繰り返す', 'Repeat one shape on every chord'),
        instruction: b('短い形を1つ決めて、コードが変わっても同じ形を演奏しよう。', 'Pick one short shape and play it on every chord.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', rhythmBlocks: [
          { label: b('同じ形を繰り返す', 'Repeat the shape'), hint: b('3度→5度→3度を、コードごとに', '3rd–5th–3rd, on each chord'), bars: ['4:3 8:5 8:3 r2', '4:3 8:5 8:3 r2', '4:3 8:5 8:3 r2', '2:3 r2'] },
          { label: b('置き場所をずらす', 'Move it in the bar'), hint: b('同じ形を小節の後半に', 'The same shape in the second half of the bar'), bars: ['r2 4:3 8:5 8:3', 'r2 4:3 8:5 8:3', 'r2 4:3 8:5 8:3', 'r1'] },
          { label: b('向きを変える', 'Turn it around'), hint: b('3度から下へ', 'Down from the 3rd instead'), bars: ['4:3 8 8:3 r2', '4:3 8 8:3 r2', '4:3 8 8:3 r2', '2:3 r2'] },
          { label: b('自分で続ける', 'Carry it on'), hint: b('最初の形を、次のコードでも自分で', 'Play the opening shape yourself on the next chords'), bars: ['4:3 8:5 8:3 r2', 'own', 'own', 'r1'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('同じ形が繰り返されると、聴き手は「まとまり」を感じます。新しい音を探し続けるより、1つの形を使い回すほうがソロらしく聞こえます。', 'A repeated shape sounds like an idea. Reusing one shape sounds more like a solo than hunting for new notes all the time.'),
      mistakes: [b('コードが変わると形が崩れる → 「3度から始める」だけを守る', 'The shape falls apart when the chord changes — just keep “start on the 3rd”')],
    },
  },
  {
    id: 'm5-vary',
    chapterId: 'ch5',
    title: b('最後だけ変える', 'Change only the ending'),
    technicalName: b('モチーフの展開', 'Motif development'),
    outcome: b('同じ形を2回繰り返して、3回目だけ変えよう。', 'Play the shape twice the same, then change the third time.'),
    progressionId: 'ii-V-I',
    defaultBpm: 110,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('最後だけ変える', 'Change only the ending'),
        instruction: b('同じ形を2回繰り返して、3回目だけ変えよう。', 'Play the shape twice the same, then change the third time.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', rhythmBlocks: [
          { label: b('最後の音を上げる', 'Lift the last note'), hint: b('3回目は上へ抜ける', 'The third time, go up and out'), bars: ['4:3 8:5 8:3 r2', '4:3 8:5 8:3 r2', '4:3 8:5 8:7 4:8 r4', 'r1'] },
          { label: b('最後を伸ばす', 'Hold the ending'), hint: b('3回目は最後の音を長く', 'The third time, hold the last note'), bars: ['4:3 8:5 8:3 r2', '4:3 8:5 8:3 r2', '4:3 8:5 8:3_ 2:3', 'r1'] },
          { label: b('音を足す', 'Add notes'), hint: b('3回目は続きを足す', 'The third time, add a tail'), bars: ['4:3 8:5 8:3 r2', '4:3 8:5 8:3 r2', '4:3 8:5 8:3 8 8:3 4:5', 'r1'] },
          { label: b('自分で変える', 'Change it yourself'), hint: b('2回は同じ、3回目は自分で変える', 'Twice the same, the third time your own change'), bars: ['4:3 8:5 8:3 r2', '4:3 8:5 8:3 r2', 'own', 'r1'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('「同じ・同じ・違う」は、ジャズに限らず旋律の基本の作り方です。2回の繰り返しが期待を作り、3回目の変化が効きます。', '“Same, same, different” is how melodies are built in any style. Two repeats set up the expectation; the change lands on the third.'),
      mistakes: [b('3回とも変えてしまう → 2回目までは何も変えない', 'Changing all three — leave the first two exactly alike')],
    },
  },
  {
    id: 'm5-answer',
    chapterId: 'ch5',
    title: b('問いと答え', 'Call and response'),
    technicalName: b('コール＆レスポンス', 'Call and response'),
    outcome: b('2小節で問いかけて、次の2小節で答えよう。', 'Ask in two bars, answer in the next two.'),
    progressionId: 'ii-V-I',
    defaultBpm: 110,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('問いと答え', 'Call and response'),
        instruction: b('2小節で問いかけて、次の2小節で答えよう。', 'Ask in two bars, answer in the next two.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', rhythmBlocks: [
          { label: b('上がって問い、下がって答える', 'Ask going up, answer coming down'), hint: b('問いは上で終わり、答えは3度に下りる', 'The question ends high; the answer comes down to the 3rd'), bars: ['r8 8:3 8:5 8:7 2:8', 'r1', 'r8 8:8 8:7 8:5 2:3', 'r1'] },
          { label: b('同じリズムで答える', 'Answer in the same rhythm'), hint: b('リズムは同じ、向きは逆', 'Same rhythm, opposite direction'), bars: ['r4 4:3 8:5 8:7 r4', 'r1', 'r4 4:7 8:5 8:3 r4', 'r1'] },
          { label: b('答えを自分で', 'Your answer'), hint: b('書いてある問いに、自分で答える', 'Answer the written question yourself'), bars: ['r4 4:3 8:5 8:7 r4', 'r1', 'own', 'own'] },
          { label: b('問いも答えも自分で', 'Both yours'), hint: b('2小節で問い、2小節で答える', 'Two bars to ask, two bars to answer'), bars: ['own', 'own', 'own', 'own'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('ソロは一人の会話です。問いと答えの組にすると、フレーズとフレーズのあいだに自然な間が生まれます。', 'A solo is a conversation with yourself. Pairing a question with an answer leaves natural space between phrases.'),
      mistakes: [b('問いが長すぎて答えられない → 問いは3〜4音で十分', 'The question is too long to answer — three or four notes are enough')],
    },
  },
  {
    id: 'm5-blues',
    chapterId: 'ch5',
    title: b('ブルースで形を育てる', 'Grow a shape over the blues'),
    outcome: b('12小節ブルースを、1つの形を使い回して演奏しよう。', 'Play a 12-bar blues by reusing one shape.'),
    progressionId: 'blues',
    defaultBpm: 110,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('ブルースで形を育てる', 'Grow a shape over the blues'),
        instruction: b('12小節ブルースを、1つの形を使い回して演奏しよう。', 'Play a 12-bar blues by reusing one shape.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', rhythmBlocks: [
          { label: b('形を置く', 'State the shape'), hint: b('同じ形を3回', 'The same shape three times'), bars: ['4:3 8:5 8:3 r2', '4:3 8:5 8:3 r2', '4:3 8:5 8:3 r2', '2:3 r2'] },
          { label: b('続きは自分で', 'Carry it on'), hint: b('同じ形を自分で続ける', 'Keep the same shape going yourself'), bars: ['4:3 8:5 8:3 r2', '4:3 8:5 8:3 r2', 'own', 'own'] },
          { label: b('変えて締める', 'Change it to finish'), hint: b('同じ形を使いながら、最後だけ変えて締める', 'Use the same shape and change only the ending'), bars: ['own', 'own', 'own', 'own'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('ブルースの12小節は「同じ・同じ・違う」の形をしています。1つの形を使い回すだけで、1コーラスがまとまります。', 'The 12-bar blues is itself “same, same, different”. Reusing one shape is enough to hold a chorus together.'),
      mistakes: [b('途中で別の形に変えてしまう → 8小節目までは最初の形だけ', 'Switching shapes halfway — stay with the first shape through bar 8')],
    },
  },

  // ================= 第7章(id: ch6) ブルースでソロ =================
  // ブルーノート・リフ・音数の起伏を演奏で練習し、最後に2コーラスを自分で通す。ブルーノートは音名で書く(♭3→3 は D#→E と書く)。
  {
    id: 'b7-bluenote',
    chapterId: 'ch6',
    title: b('ブルーノートを混ぜる', 'Mix in the blue notes'),
    technicalName: b('ブルーノート', 'Blue notes'),
    outcome: b('♭3と♭5を混ぜて、ブルースらしい響きを出そう。', 'Mix in the ♭3 and ♭5 for the sound of the blues.'),
    progressionId: 'blues',
    defaultBpm: 110,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('ブルーノートを混ぜる', 'Mix in the blue notes'),
        instruction: b('♭3と♭5を混ぜて、ブルースらしい響きを出そう。', 'Mix in the ♭3 and ♭5 for the sound of the blues.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', rhythmBlocks: [
          { label: b('半音下から3度へ', 'Slide up into the 3rd'), hint: b('♭3から3度へ半音で上がる', 'Slide from the ♭3 up to the 3rd'), bars: ['r8 8:=D#4 8:=E4 8:=G4 4:=C5 r4', 'r8 8:=Eb4 8:=F4 8:=A4 4:=C5 r4', 'r8 8:=D#4 8:=E4 8:=G4 4:=C5 r4', '4:=G4 8:=Eb4 8:=C4 r2'] },
          { label: b('♭5を通って下りる', 'Down through the ♭5'), hint: b('5度から♭5を通って下りる', 'Come down from the 5th through the ♭5'), bars: ['r8 8:=C5 8:=Bb4 8:=G4 8:=Gb4 8:=F4 4:=Eb4', 'r1', 'r8 8:=G4 8:=Gb4 8:=F4 8:=Eb4 8:=C4 r4', 'r1'] },
          { label: b('ii-Vで着地', 'Land after the ii-V'), hint: b('最後は第4章の形で3度へ', 'Finish with a Chapter 4 shape into the 3rd'), bars: ['r2 8:=D4 8:=F4 8:=A4 8:=C5', '4:=B4 r4 8:=G4 8:=F4 8:=D4 8:=D#4', '2:=E4 r2', 'r1'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('♭3と♭5はコードの音から半音ずれた音です。短く通るだけで、ブルースの色が付きます。長く伸ばすより、次の音へ滑り込むのがこつです。', 'The ♭3 and ♭5 sit a half step away from chord tones. Passing through them briefly colors the line — slide into the next note rather than holding them.'),
      mistakes: [b('ブルーノートで止まってしまう → 必ず隣のコードの音へ進む', 'Stopping on a blue note — always move on to the chord tone next to it')],
    },
  },
  {
    id: 'b7-riff',
    chapterId: 'ch6',
    title: b('リフを繰り返す', 'Repeat a riff'),
    technicalName: b('リフ', 'Riff'),
    outcome: b('1小節のリフを、12小節くり返そう。', 'Repeat a one-bar riff through all 12 bars.'),
    progressionId: 'blues',
    defaultBpm: 120,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('リフを繰り返す', 'Repeat a riff'),
        instruction: b('1小節のリフを、12小節くり返そう。', 'Repeat a one-bar riff through all 12 bars.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', rhythmBlocks: [
          { label: b('リフを置く', 'State the riff'), hint: b('5度→7度→高い1度。最後を強く', '5th, 7th, high root — accent the last note'), bars: ['r4 8:5 8:7 4:8/a r4', 'r4 8:5 8:7 4:8/a r4', 'r4 8:5 8:7 4:8/a r4', 'r1'] },
          { label: b('コードが変わっても続ける', 'Keep it through the change'), hint: b('F7でも同じ形で', 'The same shape on F7'), bars: ['r4 8:5 8:7 4:8/a r4', 'r4 8:5 8:7 4:8/a r4', 'r4 8:5 8:7 4:8/a r4', 'r1'] },
          { label: b('リフで締める', 'Close with the riff'), hint: b('最後はルートで終わる', 'End on the root'), bars: ['r4 8:5 8:7 4:8/a r4', 'r4 8:5 8:7 4:8/a r4', '2 r2', 'r1'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('リフは、短い形を何度も繰り返す演奏です。音を変えなくても、繰り返すこと自体が勢いになります。', 'A riff is a short shape played again and again. Even with no new notes, the repetition itself builds drive.'),
      mistakes: [b('繰り返しに飽きて変えてしまう → 12小節、同じリズムを守る', 'Getting bored and changing it — keep the same rhythm for all 12 bars')],
    },
  },
  {
    id: 'b7-shape',
    chapterId: 'ch6',
    title: b('音数で起伏を作る', 'Shape the chorus with density'),
    outcome: b('少ない音で始めて、増やして、最後は収めよう。', 'Start with few notes, add more, then settle.'),
    progressionId: 'blues',
    defaultBpm: 120,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('音数で起伏を作る', 'Shape the chorus with density'),
        instruction: b('少ない音で始めて、増やして、最後は収めよう。', 'Start with few notes, add more, then settle.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', rhythmBlocks: [
          { label: b('少なく始める', 'Start sparse'), hint: b('長い音と間で始める', 'Begin with long notes and space'), bars: ['2:3 r2', 'r1', '4:5 4:3 r2', 'r1'] },
          { label: b('増やす', 'Add notes'), hint: b('8分を増やしていく', 'Bring in more 8ths'), bars: ['r8 8:3 8:5 8:7 4:8 r4', 'r8 8:8 8:7 8:5 4:3 r4', '8 8:3 8:5 8:7 8:8 8:7 8:5 8:3', '4 r4 r2'] },
          { label: b('山を作って収める', 'Peak, then settle'), hint: b('いちばん高い音を強く。最後は長い音で', 'Accent the top note, then end on a long note'), bars: ['8 8:3 8:5 8:7 8:8/a 8:7 8:5 8:3', '8:3 8:5 8:7 8:8/a 8:7 8:5 4:3', '2 r2', 'r1'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('ずっと同じ音数だと平らに聞こえます。少ない→多い→収める、の流れがあると、1コーラスが1つの話になります。', 'The same density throughout sounds flat. Sparse, then busy, then settling turns a chorus into one story.'),
      mistakes: [b('最初から音を詰める → 最初の4小節は3音まで', 'Starting too busy — no more than three notes in the first four bars')],
    },
  },
  {
    id: 'b7-solo',
    chapterId: 'ch6',
    title: b('2コーラスのソロ', 'A two-chorus solo'),
    outcome: b('書いてあるフレーズから始めて、2コーラスを自分のソロにしよう。', 'Start from a written phrase and make two choruses your own solo.'),
    progressionId: 'blues',
    defaultBpm: 120,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('2コーラスのソロ', 'A two-chorus solo'),
        instruction: b('書いてあるフレーズから始めて、2コーラスを自分のソロにしよう。', 'Start from a written phrase and make two choruses your own solo.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', rhythmBlocks: [
          { label: b('書いてあるフレーズ', 'Written phrase'), hint: b('まず書いてあるとおりに', 'First, as written'), bars: ['r8 8:=D#4 8:=E4 8:=G4 4:=C5 r4', 'r8 8:=Eb4 8:=F4 8:=A4 4:=C5 r4', 'r8 8:=D#4 8:=E4 8:=G4 4:=C5 r4', '4:=G4 8:=Eb4 8:=C4 r2'] },
          { label: b('後半は自分で', 'Second half is yours'), hint: b('前の2小節に答える', 'Answer the two bars before'), bars: ['r8 8:=C5 8:=Bb4 8:=G4 8:=Gb4 8:=F4 4:=Eb4', 'r1', 'own', 'own'] },
          { label: b('全部自分で', 'All yours'), hint: b('ii-Vから3度へ着地する', 'Land on the 3rd after the ii-V'), bars: ['own', 'own', 'own', 'own'] },
          { label: b('少なく始める', 'Start sparse'), hint: b('2コーラス目。音を少なく', 'Second chorus. Few notes'), bars: ['own', 'own', 'own', 'own'] },
          { label: b('増やして山を作る', 'Build to a peak'), hint: b('音を増やして、いちばん高い音へ', 'Add notes and reach your highest note'), bars: ['own', 'own', 'own', 'own'] },
          { label: b('締める', 'Close'), hint: b('最後はルートの長い音で終わる', 'End on a long root'), bars: ['own', 'own', '2 r2', 'r1'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('ここまでの材料(リズム、コードの音、フレーズ、形の繰り返し、ブルーノート、起伏)を、自分の順番で使います。うまくいかなかった所は、その章に戻れば練習できます。', 'Use everything so far — rhythm, chord tones, phrases, repeated shapes, blue notes, density — in your own order. Whatever felt weak has a chapter to go back to.'),
      mistakes: [b('何を弾くか迷って止まる → 1つの形を決めて、それだけで4小節通す', 'Freezing — pick one shape and get through four bars with it alone')],
    },
  },

  // ================= 第8章(id: tune) 曲で使う =================
  // 枯葉の進行(長調と短調の ii-V-I がつながった8小節)を2周=16小節で使う。音名で書くのは、7度→3度を半音でつなぐため。
  {
    id: 't8-guide',
    chapterId: 'tune',
    title: b('枯葉を3度と7度でなぞる', 'Trace Autumn Leaves with 3rds and 7ths'),
    outcome: b('枯葉の進行を、各コードの3度と7度でなぞろう。', 'Trace the Autumn Leaves changes with the 3rd and 7th of each chord.'),
    progressionId: 'autumn-leaves',
    defaultBpm: 100,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('枯葉を3度と7度でなぞる', 'Trace Autumn Leaves with 3rds and 7ths'),
        instruction: b('枯葉の進行を、各コードの3度と7度でなぞろう。', 'Trace the Autumn Leaves changes with the 3rd and 7th of each chord.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', rhythmBlocks: [
          { label: b('3度だけ(前半)', '3rds only (first half)'), hint: b('長調のii-V-I。コードごとに3度', 'The major ii-V-I. The 3rd of each chord'), bars: ['1:3', '1:3', '1:3', '1:3'] },
          { label: b('3度だけ(後半)', '3rds only (second half)'), hint: b('短調のii-V-I。コードごとに3度', 'The minor ii-V-I. The 3rd of each chord'), bars: ['1:3', '1:3', '1:3', 'r1'] },
          { label: b('3度と7度(前半)', '3rds and 7ths (first half)'), hint: b('3度から7度へ。7度は次の3度へ進む', '3rd to 7th — the 7th moves on to the next 3rd'), bars: ['2:3 2:7', '2:3 2:7', '2:3 2:7', '2:3 2:7'] },
          { label: b('3度と7度(後半)', '3rds and 7ths (second half)'), hint: b('短調でも同じ動き', 'The same motion in minor'), bars: ['2:3 2:7', '2:3 2:7', '1:3', 'r1'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('枯葉は、長調のii-V-Iと短調のii-V-Iがつながった曲です。まず3度と7度で、コードの移り変わりを耳に入れます。', 'Autumn Leaves joins a major ii-V-I to a minor one. Tracing the 3rds and 7ths first puts the changes in your ear.'),
      mistakes: [b('短調のコード(m7♭5、7♭9)で迷う → 第2章「コードから3度を探す」と同じ数え方', 'Lost on the minor-key chords (m7♭5, 7♭9) — count the same way as in Chapter 2')],
    },
  },
  {
    id: 't8-phrase',
    chapterId: 'tune',
    title: b('枯葉でフレーズを使う', 'Use your phrases on Autumn Leaves'),
    outcome: b('覚えたフレーズの形を、長調と短調のii-V-Iで演奏しよう。', 'Play the phrase shapes you know on the major and minor ii-V-I.'),
    progressionId: 'autumn-leaves',
    defaultBpm: 100,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('枯葉でフレーズを使う', 'Use your phrases on Autumn Leaves'),
        instruction: b('覚えたフレーズの形を、長調と短調のii-V-Iで演奏しよう。', 'Play the phrase shapes you know on the major and minor ii-V-I.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', rhythmBlocks: [
          { label: b('長調のii-V-I', 'Major ii-V-I'), hint: b('第4章の「分散和音で上る」と同じ形', 'The same shape as “Arpeggio up” in Chapter 4'), bars: ['r2 8:=D4 8:=F4 8:=A4 8:=C5', '4:=B4 r4 8:=G4 8:=B4 8:=D5 8:=F5', '2:=E5 r2', 'r1'] },
          { label: b('短調のii-V-I', 'Minor ii-V-I'), hint: b('同じ形を短調で。着地はAm7の3度', 'The same shape in minor. Land on the 3rd of Am7'), bars: ['r2 8:=B3 8:=D4 8:=F4 8:=A4', '4:=G#4 r4 8:=E4 8:=G#4 8:=B4 8:=D5', '2:=C5 r2', 'r1'] },
          { label: b('長調で自分の線を', 'Your line in major'), hint: b('覚えたフレーズでも、自分の線でもよい', 'A phrase you know, or a line of your own'), bars: ['own', 'own', 'own', 'r1'] },
          { label: b('短調で続きを作る', 'Finish it in minor'), hint: b('出だしに続けて、E7から先は自分で', 'Continue from the opening; from E7 on it is yours'), bars: ['r2 8:=B3 8:=D4 8:=F4 8:=A4', 'own', 'own', 'r1'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('覚えたフレーズは、形(何度から何度へ)で覚えていれば、短調でもそのまま使えます。曲はii-V-Iの組み合わせでできています。', 'If you know a phrase by its shape — which degree to which — it works in minor as it is. Tunes are made of ii-V-Is.'),
      mistakes: [b('短調で音が合わない → E7の3度(G♯)とAm7の3度(C)だけ先に確かめる', 'Notes sound wrong in minor — first check just the 3rd of E7 (G♯) and the 3rd of Am7 (C)')],
    },
  },
  {
    id: 't8-chorus',
    chapterId: 'tune',
    title: b('枯葉で自分のソロを', 'Your own solo on Autumn Leaves'),
    outcome: b('書いてあるフレーズから始めて、後半は自分のソロにしよう。', 'Start from written phrases and make the second half your own solo.'),
    progressionId: 'autumn-leaves',
    defaultBpm: 110,
    clickPattern: 'backbeat',
    steps: [
      {
        title: b('枯葉で自分のソロを', 'Your own solo on Autumn Leaves'),
        instruction: b('書いてあるフレーズから始めて、後半は自分のソロにしよう。', 'Start from written phrases and make the second half your own solo.'),
        content: { source: 'rhythm', rhythmLabel: 'degree', rhythmBlocks: [
          { label: b('長調のフレーズ', 'A phrase in major'), hint: b('順に下って3度へ', 'Step down to the 3rd'), bars: ['r2 8:=F5 8:=E5 8:=D5 8:=C5', '4:=B4 r4 8:=B4 8:=A4 8:=G4 8:=F4', '2:=E4 r2', 'r1'] },
          { label: b('短調のフレーズ', 'A phrase in minor'), hint: b('同じ形を短調で', 'The same shape in minor'), bars: ['r2 8:=D5 8:=C5 8:=B4 8:=A4', '4:=G#4 r4 8:=G#4 8:=F4 8:=E4 8:=D4', '2:=C4 r2', 'r1'] },
          { label: b('長調は自分で', 'Major, yours'), hint: b('着地の音を先に決める', 'Decide the landing note first'), bars: ['own', 'own', 'own', 'r1'] },
          { label: b('短調も自分で', 'Minor, yours'), hint: b('Am7に着地して終わる', 'Land on Am7 to finish'), bars: ['own', 'own', 'own', 'r1'] },
        ] },
      },
    ],
    selfCheck: [],
    trivia: {
      why: b('1周目でまねて、2周目で自分の演奏にします。別の曲でも、ii-V-Iを見つければ同じように演奏できます。', 'Copy on the first pass, play your own on the second. On any other tune, find the ii-V-Is and you can do the same.'),
      mistakes: [b('2周目で何も出てこない → 1周目のフレーズのリズムだけ変えて弾く', 'Nothing comes on the second pass — play the first-pass phrases with a new rhythm')],
    },
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
