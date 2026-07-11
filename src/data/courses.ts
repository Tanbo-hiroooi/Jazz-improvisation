// 練習コース: 「悩み→できるようになること→理由→ルール→STEP→確認」の流れで
// 段階的にアドリブを学ぶモードのデータ。UIから分離した純データ(日英対応)。

import type { StaffTab } from '../theory/modes';
import type { ArpPatternId, ToneRhythmId } from '../theory/phrases';
import type { ProgressionId } from '../theory/progressions';

/** 日英ペアの文章 */
export interface Bi {
  ja: string;
  en: string;
}

export interface PracticeStep {
  title: Bi;
  instruction: Bi;
}

export interface CommonMistake {
  problem: Bi;
  advice: Bi;
}

/** 「今回使う音」の1行(キーCでの例。音名は言語共通) */
export interface UsableNoteLine {
  chord: string;
  notes: string;
}

export interface Chapter {
  id: string;
  courseId: string;
  title: Bi;
  purpose: Bi;
}

export interface Lesson {
  id: string;
  courseId: string;
  chapterId: string;
  /** 分かりやすいメインタイトル */
  title: Bi;
  /** 専門用語の補足(例: Guide Tone/ガイドトーン) */
  technicalName?: string;
  /** こんな悩みを解決します */
  problem: Bi;
  /** 今日できるようになること(演奏がどう変わるか) */
  outcome: Bi;
  /** なぜこの練習をするのか */
  reason: Bi;
  /** 実際に使う場面 */
  realUseCases: Bi[];
  progressionId: ProgressionId;
  /** 譜面に表示する内容 */
  contentTab: StaffTab;
  toneRhythm?: ToneRhythmId;
  arpPattern?: ArpPatternId;
  scaleView?: 'scale' | 'tension';
  /** 今回使う音(キーCでの例文) */
  usableNotes?: UsableNoteLine[];
  /** 練習ルール(常時表示) */
  rules: Bi[];
  /** 小さな練習ステップ(2〜4個) */
  steps: PracticeStep[];
  /** うまくできているサイン */
  successSigns: Bi[];
  /** よくある失敗と対処 */
  commonMistakes: CommonMistake[];
  /** 今日のチェック */
  selfCheck: Bi[];
  /** 次のレッスンとのつながり */
  nextConnection?: Bi;
  estimatedMinutes?: number;
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
    id: 'adlib-basics',
    title: b('アドリブ入門コース', 'Improvisation Basics'),
    description: b(
      '「コードを見ても何を弾けばいいか分からない」から、「自分で短いフレーズを作れる」まで。6つの章で、悩み→理由→小さなステップの順に進みます。',
      'From “I don’t know what to play over these chords” to “I can build my own short phrases” — six chapters, each moving from a real struggle to small, doable steps.',
    ),
    chapterIds: ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6'],
  },
];

export const CHAPTERS: Chapter[] = [
  { id: 'ch1', courseId: 'adlib-basics', title: b('第1章: コードに合う音を選ぶ', 'Ch. 1: Choosing notes that fit the chord'), purpose: b('コードが鳴っている間に、安定して聞こえる音を選べるようになる。', 'Learn to choose notes that sound stable while a chord is playing.') },
  { id: 'ch2', courseId: 'adlib-basics', title: b('第2章: コードの変化を音で表す', 'Ch. 2: Showing the changes with your notes'), purpose: b('コードが変わったことを、少ない音で表現できるようになる。', 'Express each chord change with just a few notes.') },
  { id: 'ch3', courseId: 'adlib-basics', title: b('第3章: 次のコードへ自然に着地する', 'Ch. 3: Landing on the next chord'), purpose: b('次に鳴るコードを意識して、フレーズの終わりを作れるようになる。', 'Shape phrase endings with the next chord in mind.') },
  { id: 'ch4', courseId: 'adlib-basics', title: b('第4章: 音をフレーズに変える', 'Ch. 4: Turning notes into phrases'), purpose: b('正しい音を並べるだけでなく、始まりと終わりのある短いメロディーを作る。', 'Go beyond correct notes: make short melodies with a beginning and an end.') },
  { id: 'ch5', courseId: 'adlib-basics', title: b('第5章: 短いアイデアを発展させる', 'Ch. 5: Growing a small idea'), purpose: b('次々に新しい音を弾かず、1つのアイデアからまとまりのあるソロを作る。', 'Build a coherent solo from one idea instead of a stream of new notes.') },
  { id: 'ch6', courseId: 'adlib-basics', title: b('第6章: コード進行の中でまとめる', 'Ch. 6: Putting it together over a form'), purpose: b('覚えた技術を組み合わせ、長い進行の中でフレーズを構成する。', 'Combine your tools to shape phrases through a longer form.') },
];

export const LESSONS: Lesson[] = [
  // ================= 第1章 =================
  {
    id: 'c1-roots',
    courseId: 'adlib-basics',
    chapterId: 'ch1',
    title: b('コードの土台の音を確かめよう', 'Find each chord’s home base'),
    technicalName: 'Root/ルート',
    problem: b('コードネームを見ても、どの音から手を付けていいか分からない。', 'You see a chord symbol but have no idea which note to even start from.'),
    outcome: b('どのコードでも、迷わず「土台の音(ルート)」を鳴らせるようになります。', 'You’ll be able to play the home-base note (the root) of any chord without hesitating.'),
    reason: b('ルートはコードの住所のような音です。まずここが分かると、他のすべての音を「ルートから何番目か」で数えられるようになり、以降の練習が一気に楽になります。', 'The root is a chord’s home address. Once you know it, every other note can be counted from it — which makes everything that follows much easier.'),
    realUseCases: [
      b('初めて見るコード進行の下読み', 'Skimming a progression you’ve never seen'),
      b('セッションで曲の流れを見失ったときの復帰点', 'A recovery point when you get lost in a tune'),
    ],
    progressionId: 'ii-V-I',
    contentTab: 'chordtones',
    toneRhythm: 'basic',
    usableNotes: [
      { chord: 'Dm7', notes: 'D' },
      { chord: 'G7', notes: 'G' },
      { chord: 'Cmaj7', notes: 'C' },
    ],
    rules: [
      b('弾いてよいのはルート1音だけ', 'Play only the root — one note'),
      b('コードが変わったら次のルートへ', 'Move to the new root at each change'),
    ],
    steps: [
      { title: b('長く鳴らす', 'Hold it'), instruction: b('各コードでルートを1回だけ、小節いっぱい伸ばして弾きます。', 'Play each root once and hold it for the whole measure.') },
      { title: b('好きな拍で', 'Any beat'), instruction: b('同じルートを、弾き始める拍を変えて鳴らしてみます(2拍目から、4拍目からなど)。', 'Play the same roots, but vary which beat you enter on (beat 2, beat 4, ...).') },
    ],
    successSigns: [
      b('コードが変わる瞬間に、迷わず次のルートに移れる', 'You reach the next root without hesitation at each change'),
      b('伴奏と自分の音がぶつからず、溶けて聞こえる', 'Your note blends with the backing instead of clashing'),
    ],
    commonMistakes: [
      {
        problem: b('つまらなく感じて、つい他の音も弾きたくなる', 'It feels boring, and you’re tempted to add more notes'),
        advice: b('今回は我慢が正解です。1音で進行を追える集中力が、この先すべての土台になります。', 'Resisting is the whole point. Tracking a form with one note builds the focus everything else rests on.'),
      },
    ],
    selfCheck: [
      b('各コードのルートをすぐに見つけられた', 'I found each root instantly'),
      b('コードが変わる瞬間を音で表せた', 'My note marked each chord change'),
      b('進行を4周しても位置を見失わなかった', 'I kept my place for 4 loops of the form'),
    ],
    nextConnection: b('次は、ルートの上に積まれている「コードの仲間の音」を探しに行きます。', 'Next we’ll find the family of notes stacked on top of each root.'),
    estimatedMinutes: 5,
  },
  {
    id: 'c1-chordtones',
    courseId: 'adlib-basics',
    chapterId: 'ch1',
    title: b('コードに合う音を見つけよう', 'Find the notes that fit'),
    technicalName: 'Chord Tone/コードトーン',
    problem: b('スケールを覚えても、どの音なら安心して伸ばせるのか分からない。', 'You know your scales, but you’re never sure which notes are safe to sit on.'),
    outcome: b('各コードで「伸ばしても濁らない4つの音」を譜面と指で確認できるようになります。', 'You’ll know the four notes per chord you can hold without clashing — on the page and under your fingers.'),
    reason: b('コードトーン(1・3・5・7度)は、そのコードが鳴っている間の「安全地帯」です。アドリブの上手な人は、フレーズの大事な場所をこの4音に置いています。', 'Chord tones (1-3-5-7) are the safe zone while a chord rings. Good improvisers put the important moments of their lines on these four notes.'),
    realUseCases: [
      b('フレーズの最初の音・最後の音を決めるとき', 'Choosing the first and last note of a phrase'),
      b('長く伸ばす音を選ぶとき', 'Picking a note to sustain'),
    ],
    progressionId: 'ii-V-I',
    contentTab: 'chordtones',
    toneRhythm: 'basic',
    arpPattern: 'up',
    rules: [
      b('譜面の4つの音だけを使う', 'Use only the four notes on the staff'),
      b('まずは譜面どおり、下から順番に', 'First play them as written, bottom to top'),
    ],
    steps: [
      { title: b('譜面どおり', 'As written'), instruction: b('各コードの1・3・5・7度を、譜面のとおり4分音符で弾きます。', 'Play each chord’s 1-3-5-7 in quarter notes, as written.') },
      { title: b('下りも', 'Downhill too'), instruction: b('同じ4音を上から下へ。「並び方」は変えず、耳で場所を覚えます。', 'Now top to bottom. Same four notes — let your ears memorize where they live.') },
      { title: b('自由な順番', 'Free order'), instruction: b('4音を好きな順番で。ただし1小節に使うのは4音以内。', 'Any order you like, but no more than four notes per measure.') },
    ],
    successSigns: [
      b('コードごとに4音の場所がすぐ思い浮かぶ', 'You can instantly picture the four notes for each chord'),
      b('どの音で止まっても伴奏と濁らない', 'Wherever you stop, nothing clashes with the backing'),
    ],
    commonMistakes: [
      {
        problem: b('4音を毎回ルートから数え直して間に合わない', 'You re-count from the root every time and fall behind'),
        advice: b('テンポを落として大丈夫です。速さより「見ないで思い出せる」ことを優先してください。', 'Slow the tempo. Recalling without counting matters more than speed.'),
      },
    ],
    selfCheck: [
      b('各コードの1・3・5・7度の場所が分かった', 'I know where each chord’s 1-3-5-7 are'),
      b('伸ばしても濁らない音を選べた', 'I could pick notes that don’t clash when held'),
      b('進行を止まらずに回れた', 'I got through the form without stopping'),
    ],
    nextConnection: b('次は、この4音から2音だけ選んで「小さなフレーズ」を作ります。', 'Next, we’ll pick just two of these notes and make tiny phrases.'),
    estimatedMinutes: 8,
  },
  {
    id: 'c1-two-notes',
    courseId: 'adlib-basics',
    chapterId: 'ch1',
    title: b('2音だけの小さなフレーズを作ろう', 'Make tiny two-note phrases'),
    technicalName: 'Chord Tone Phrase/コードトーンフレーズ',
    problem: b('音はたくさん知っているのに、いざ弾くと何を言いたいのか分からない演奏になる。', 'You know plenty of notes, but your playing doesn’t seem to say anything.'),
    outcome: b('1小節にたった2音で、「言い切った感」のある短いフレーズを作れるようになります。', 'With just two notes per measure, you’ll make phrases that sound intentional and complete.'),
    reason: b('フレーズが伝わらない一番の原因は、音の多さです。2音に制限すると、どの音をどの拍に置くかを自然に考えるようになり、それがそのままフレーズ作りの思考になります。', 'The #1 reason lines don’t communicate is too many notes. A two-note limit forces you to choose which note goes on which beat — and that decision-making is phrase-building itself.'),
    realUseCases: [
      b('ソロの出だし(いきなり飛ばさず様子を見る)', 'Opening a solo without overplaying'),
      b('バラードなど音数を絞りたい場面', 'Ballads and any moment that wants space'),
    ],
    progressionId: 'ii-V-I',
    contentTab: 'chordtones',
    toneRhythm: 'basic',
    rules: [
      b('1小節に2音まで(コードトーンのみ)', 'Max two notes per measure (chord tones only)'),
      b('毎小節、必ず休符を残す', 'Leave a rest in every measure'),
    ],
    steps: [
      { title: b('2音を選ぶ', 'Choose two'), instruction: b('各コードで好きな2音を選び、「タン・(休み)・タン」のように弾きます。', 'Pick any two chord tones per chord and play them with space: “dah — (rest) — dah.”') },
      { title: b('置く拍を変える', 'Move the beats'), instruction: b('同じ2音のまま、置く拍を毎周変えてみます(1・3拍→2・4拍など)。', 'Keep the same two notes but change which beats they land on each time around.') },
    ],
    successSigns: [
      b('2音でも「フレーズを言い終えた」感じがする', 'Even two notes feel like a finished statement'),
      b('休符が怖くなくなってきた', 'Rests are starting to feel comfortable'),
    ],
    commonMistakes: [
      {
        problem: b('静けさが不安で音を足してしまう', 'The silence feels scary, so you fill it'),
        advice: b('休符の間も音楽は進んでいます。伴奏を聴く時間だと考えてください。', 'The music keeps moving through your rest. Treat it as time to listen to the band.'),
      },
    ],
    selfCheck: [
      b('1小節2音の制限を守れた', 'I stayed within two notes per measure'),
      b('毎小節に休符を入れられた', 'I rested in every measure'),
      b('どの拍に音を置くかを自分で決めた', 'I consciously chose which beats to play on'),
    ],
    nextConnection: b('第2章では、この少ない音数のまま「コードが変わった感じ」を出す音の選び方を学びます。', 'In Chapter 2, we’ll keep this economy but learn which notes make the chord changes audible.'),
    estimatedMinutes: 8,
  },

  // ================= 第2章 =================
  {
    id: 'c2-thirds',
    courseId: 'adlib-basics',
    chapterId: 'ch2',
    title: b('コードの表情を決める音を弾こう', 'Play the note that gives each chord its face'),
    technicalName: '3rd/3度',
    problem: b('コードが変わっているのに、自分の演奏はずっと同じ景色に聞こえる。', 'The chords are changing, but your lines sound like the same scenery the whole time.'),
    outcome: b('各コードの「3度」1音だけで、明るい/暗いというコードの表情を鳴らし分けられるようになります。', 'With one note — the 3rd — you’ll make each chord’s bright-or-dark character audible.'),
    reason: b('3度は、コードがメジャーかマイナーかを決める音です。ルートより雄弁で、この1音を押さえるだけで「コードを分かって弾いている」響きになります。', 'The 3rd decides whether a chord is major or minor. It says more than the root — hit it and you instantly sound like you know the changes.'),
    realUseCases: [
      b('コードが切り替わる瞬間の1音目', 'The first note right at a chord change'),
      b('フレーズの着地点', 'A landing note at the end of a phrase'),
    ],
    progressionId: 'ii-V-I',
    contentTab: 'guidetones',
    toneRhythm: 'basic',
    usableNotes: [
      { chord: 'Dm7', notes: 'F' },
      { chord: 'G7', notes: 'B' },
      { chord: 'Cmaj7', notes: 'E' },
    ],
    rules: [
      b('各コードで3度の1音だけを弾く', 'Play only the 3rd of each chord'),
      b('長く伸ばして、コードの表情を聴く', 'Hold it and listen to the chord’s character'),
    ],
    steps: [
      { title: b('3度を伸ばす', 'Hold the 3rd'), instruction: b('各コードの3度を小節いっぱい伸ばします。F→B→Eの流れを耳で覚えます。', 'Hold each 3rd for the full measure. Let F→B→E sink into your ears.') },
      { title: b('入りをずらす', 'Shift the entry'), instruction: b('同じ音のまま、弾き始めを2拍目や4拍目にずらしてみます。', 'Same notes, but enter on beat 2 or 4 instead of 1.') },
    ],
    successSigns: [
      b('1音なのにコードが変わったと分かる', 'One note is enough to hear the change'),
      b('マイナー(F)とメジャー(E)の表情の違いを感じる', 'You can feel minor (F) vs major (E) in the sound'),
    ],
    commonMistakes: [
      {
        problem: b('メロディーらしく聞こえなくて不安になる', 'It doesn’t sound like a melody, which feels wrong'),
        advice: b('問題ありません。今は格好よいソロではなく、コードの変化を音で感じる練習です。', 'That’s fine. We’re not building a cool solo yet — we’re learning to feel the changes in sound.'),
      },
    ],
    selfCheck: [
      b('各コードの3度をすぐ出せた', 'I found each 3rd right away'),
      b('コードの明暗の違いを聴き取れた', 'I heard the bright/dark difference'),
      b('4周しても進行を見失わなかった', 'I kept my place for 4 loops'),
    ],
    nextConnection: b('次は3度に7度を加え、2音を「近い場所」でつないでいきます。', 'Next we add the 7th and connect these notes by the shortest possible path.'),
    estimatedMinutes: 6,
  },
  {
    id: 'c2-guide-line',
    courseId: 'adlib-basics',
    chapterId: 'ch2',
    title: b('2音だけでコードの変化を表そう', 'Show the changes with just two notes'),
    technicalName: 'Guide Tone/ガイドトーン入門',
    problem: b('スケールの音を弾いているのに、コードが変わっても演奏が同じように聞こえる。', 'You’re playing the right scale, yet the changes don’t come through in your lines.'),
    outcome: b('各コードの特徴的な2音(3度と7度)を使い、少ない音数でコード進行を表現できるようになります。', 'Using each chord’s two character notes (3rd & 7th), you’ll express the whole progression with very few notes.'),
    reason: b('コードには、そのコードらしさを決める音があります。特に3度と7度を使うと、メジャーかマイナーか、安定か緊張かが伝わりやすくなります。しかもこの2音は、隣のコードへ半音か全音でなめらかにつながります。', 'Certain notes define a chord’s identity — above all the 3rd and 7th. They tell major from minor, tension from rest. Better yet, they connect to the next chord by just a half or whole step.'),
    realUseCases: [
      b('ii–V–Iでコードが切り替わる場所', 'Where the chords switch in a ii–V–I'),
      b('次のコードへ自然につなぎたい場所', 'Anywhere you want a seamless connection'),
      b('ジャズブルースの9〜12小節目', 'Bars 9–12 of a jazz blues'),
    ],
    progressionId: 'ii-V-I',
    contentTab: 'guidetones',
    toneRhythm: 'basic',
    usableNotes: [
      { chord: 'Dm7', notes: 'F または C' },
      { chord: 'G7', notes: 'B または F' },
      { chord: 'Cmaj7', notes: 'E または B' },
    ],
    rules: [
      b('使う音は各コード2音(3度か7度)だけ', 'Only two notes per chord: the 3rd or the 7th'),
      b('次のコードでは、今の音から一番近い方を選ぶ', 'At each change, move to whichever is closest'),
    ],
    steps: [
      { title: b('1本目の道', 'Path one'), instruction: b('各コードで1音だけ選び、長く弾きます。まずは F→F→E。メロディーを作ろうとしなくて構いません。', 'One long note per chord: F→F→E. Don’t try to make a melody yet.') },
      { title: b('2本目の道', 'Path two'), instruction: b('別の流れを試します: C→B→B。', 'Try the other thread: C→B→B.') },
      { title: b('リズムを付ける', 'Add rhythm'), instruction: b('音は変えずに、同じ音の流れへ自分でリズムを付けます。', 'Keep the same notes, but give the line your own rhythm.') },
    ],
    successSigns: [
      b('音数が少なくてもコードが変わった感じがする', 'The changes come through even with few notes'),
      b('音が大きく跳ばず、滑らかにつながる', 'The line moves smoothly, without big leaps'),
      b('コード進行を見失わず繰り返せる', 'You can loop the form without losing your place'),
    ],
    commonMistakes: [
      {
        problem: b('メロディーらしく聞こえない', 'It doesn’t sound like a melody'),
        advice: b('問題ありません。今回は格好よいソロではなく、コード同士を音でつなぐ感覚を練習しています。', 'That’s expected. We’re practicing how chords link by sound, not writing a solo.'),
      },
      {
        problem: b('音を増やしたくなる', 'You want to add more notes'),
        advice: b('今回は指定の2音だけで。増やすのは次のレッスン以降の役目です。', 'Stick to the two notes for now — adding more is the next lessons’ job.'),
      },
    ],
    selfCheck: [
      b('各コードの3度または7度を選べた', 'I chose the 3rd or 7th of each chord'),
      b('近い音へ移動できた', 'I moved to the nearest note'),
      b('コードが変わった感じを確認できた', 'I could hear each change'),
      b('進行を4周しても位置を見失わなかった', 'I kept my place for 4 loops'),
    ],
    nextConnection: b('次は、この音の流れを保ったまま、リズムだけで演奏を生き生きさせます。', 'Next we keep this thread of notes and bring it to life with rhythm alone.'),
    estimatedMinutes: 10,
  },
  {
    id: 'c2-rhythm-line',
    courseId: 'adlib-basics',
    chapterId: 'ch2',
    title: b('同じ音の流れにリズムを付けよう', 'Same notes, your rhythm'),
    technicalName: 'Rhythm Variation/リズム変奏',
    problem: b('正しい音を選べても、演奏がのっぺりして聞こえる。', 'Your note choices are right, but everything sounds flat and even.'),
    outcome: b('音を1つも変えずに、リズムだけで同じラインを3通りに聞かせられるようになります。', 'Without changing a single note, you’ll make one line sound three different ways through rhythm.'),
    reason: b('ジャズらしさの半分以上はリズムです。音選びとリズムを別々に練習すると、本番で両方を同時に考えなくて済むようになります。', 'More than half of the jazz sound is rhythm. Practicing rhythm separately from note choice means you won’t have to juggle both at once on the bandstand.'),
    realUseCases: [
      b('同じフレーズを2回使うときの2回目', 'The second time you play the same phrase'),
      b('演奏が単調になってきたと感じたとき', 'Whenever your solo starts feeling monotonous'),
    ],
    progressionId: 'ii-V-I',
    contentTab: 'guidetones',
    toneRhythm: 'charleston',
    rules: [
      b('音はガイドトーンの流れのまま変えない', 'Keep the guide-tone thread — no new notes'),
      b('1周ごとにリズムを変える', 'Change the rhythm every time around'),
    ],
    steps: [
      { title: b('お手本のリズム', 'Borrowed rhythm'), instruction: b('譜面のチャールストンのリズム(ターン・タッ)で弾きます。', 'Play the written Charleston rhythm: “daahh-dat.”') },
      { title: b('遅らせる', 'Delay it'), instruction: b('同じ音を、わざと2拍目から入って弾きます。', 'Same notes, but enter deliberately on beat 2.') },
      { title: b('自由なリズム', 'Your rhythm'), instruction: b('音は同じまま、自分のリズムを3パターン試します。', 'Keep the notes; invent three rhythms of your own.') },
    ],
    successSigns: [
      b('同じ音とは思えないほど印象が変わる', 'The same notes sound surprisingly different'),
      b('リズムを先に決めてから弾けるようになる', 'You can decide the rhythm before you play'),
    ],
    commonMistakes: [
      {
        problem: b('リズムを変えようとすると音まで変わってしまう', 'Changing the rhythm accidentally changes the notes'),
        advice: b('それだけ音とリズムが癒着している証拠です。テンポを落として分離しましょう。', 'That just shows notes and rhythm are glued together. Slow down and pry them apart.'),
      },
    ],
    selfCheck: [
      b('音を変えずにリズムだけ変えられた', 'I varied rhythm without changing notes'),
      b('3パターン以上のリズムを試した', 'I tried at least three rhythms'),
      b('リズムが単調にならなかった', 'The result didn’t feel monotonous'),
    ],
    nextConnection: b('第3章では、フレーズの「終わり方」— 次のコードへの着地を練習します。', 'Chapter 3 tackles how phrases end: landing on the next chord.'),
    estimatedMinutes: 8,
  },

  // ================= 第3章 =================
  {
    id: 'c3-target-third',
    courseId: 'adlib-basics',
    chapterId: 'ch3',
    title: b('次のコードへ着地しよう', 'Land on the next chord'),
    technicalName: 'Target Note/ターゲットノート',
    problem: b('フレーズがいつもコードの変わり目でぶつ切りになり、つながって聞こえない。', 'Your phrases keep getting chopped off at the barline — nothing connects.'),
    outcome: b('小節線をまたいで、次のコードの3度に「ぴたっと着地」できるようになります。', 'You’ll glide across the barline and land squarely on the next chord’s 3rd.'),
    reason: b('アドリブが上手く聞こえる人は、コードが変わる瞬間に正しい音に居ます。着地点を先に決めてから弾くと、フレーズの途中が多少揺れても、終わりで必ず説得力が出ます。', 'Players who sound like they know the changes are simply on the right note at the moment of change. Decide the landing first; even if the middle wobbles, the ending will convince.'),
    realUseCases: [
      b('ii–V–IのV→Iの瞬間', 'The V→I moment of a ii–V–I'),
      b('フレーズの締めくくり', 'Closing out any phrase'),
      b('2小節先を見据えたライン作り', 'Planning lines two bars ahead'),
    ],
    progressionId: 'ii-V-I',
    contentTab: 'target',
    usableNotes: [
      { chord: 'Dm7 → G7', notes: '着地は B' },
      { chord: 'G7 → Cmaj7', notes: '着地は E' },
    ],
    rules: [
      b('着地点は次のコードの3度', 'Land on the next chord’s 3rd'),
      b('着地は次の小節の1拍目、長めに', 'Arrive on beat 1 and hold it'),
    ],
    steps: [
      { title: b('着地点だけ', 'Landing only'), instruction: b('フレーズは弾かず、各小節の頭で「次の3度」だけを弾きます。', 'Skip the phrase: play only the landing 3rd on each downbeat.') },
      { title: b('助走を付ける', 'Add a runway'), instruction: b('4拍目に1音だけ助走を入れてから着地します(譜面の形)。', 'Add one approach note on beat 4, then land (as written).') },
      { title: b('自由な助走', 'Free runway'), instruction: b('前半2拍は自由に弾き、4拍目→着地だけ必ず守ります。', 'Improvise the first half of the bar; keep only the beat-4 approach and the landing.') },
    ],
    successSigns: [
      b('コードが変わる瞬間に正しい音に居る', 'You’re on the right note exactly when the chord changes'),
      b('小節線を越えるとき、フレーズが切れずに流れる', 'Lines flow across the barline instead of stopping'),
    ],
    commonMistakes: [
      {
        problem: b('着地が1拍目に間に合わない', 'You keep missing beat 1'),
        advice: b('4拍目から逆算しましょう。「着地の1音前」を決めておくと必ず間に合います。', 'Work backwards from beat 4. Pre-deciding the note before the landing guarantees you arrive on time.'),
      },
    ],
    selfCheck: [
      b('次のコードの3度を事前に把握できた', 'I knew the next 3rd before it came'),
      b('1拍目にきちんと着地できた', 'I landed cleanly on beat 1'),
      b('着地の解決感を味わえた', 'I could feel the resolution'),
    ],
    nextConnection: b('次は、着地をさらに強調する「半音下からの助走」を学びます。', 'Next: making landings even stronger with a half-step runway from below.'),
    estimatedMinutes: 10,
  },
  {
    id: 'c3-approach-below',
    courseId: 'adlib-basics',
    chapterId: 'ch3',
    title: b('半音下から着地を強調しよう', 'Approach from a half step below'),
    technicalName: 'Chromatic Approach/アプローチノート',
    problem: b('着地はできるようになったが、まだ「教科書どおり」の響きで、ジャズらしさが足りない。', 'Your landings work now, but they still sound textbook — not quite jazz.'),
    outcome: b('ターゲットの半音下から滑り込むだけで、同じ着地が一気にジャズの響きになります。', 'Sliding in from a half step below turns the same landing into an unmistakably jazz sound.'),
    reason: b('半音下の音は「次の音に行きたい」という強い引力を持っています。スケール外の音でも、短く弾いてすぐ解決すれば濁りません。むしろこの一瞬の緊張が、ジャズらしさの正体です。', 'A note a half step below the target pulls hard toward it. Even outside the scale, it won’t clash if it’s short and resolves immediately — that split second of tension is the jazz sound itself.'),
    realUseCases: [
      b('着地の直前(4拍目のウラなど)', 'Right before a landing (like the “and” of 4)'),
      b('同じフレーズを2回目に少し飾りたいとき', 'Decorating the repeat of a phrase'),
    ],
    progressionId: 'ii-V-I',
    contentTab: 'approach',
    usableNotes: [
      { chord: 'Cmaj7 の3度 E へ', notes: 'D♯ → E' },
      { chord: 'G7 の3度 B へ', notes: 'A♯ → B' },
    ],
    rules: [
      b('アプローチ音は短く(8分音符以下)', 'Approach notes stay short (8th or less)'),
      b('強拍で伸ばさない', 'Never sustain one on a strong beat'),
      b('1フレーズに1回だけ', 'One approach per phrase'),
    ],
    steps: [
      { title: b('2音セット', 'The pair'), instruction: b('「半音下→ターゲット」の2音だけを、各コードの3度に向けて弾きます。', 'Play just the pair — half step below → target — into each chord’s 3rd.') },
      { title: b('フレーズに埋め込む', 'Embed it'), instruction: b('前回の着地練習に、この2音セットを1回だけ混ぜます。', 'Take last lesson’s landing drill and slip the pair in once.') },
    ],
    successSigns: [
      b('ターゲットの音が前より輝いて聞こえる', 'Targets sound brighter than before'),
      b('スケール外の音を弾いても濁った感じがしない', 'The outside note never sounds wrong'),
    ],
    commonMistakes: [
      {
        problem: b('アプローチ音を長く弾いてしまい、間違えた音に聞こえる', 'You hold the approach note too long and it sounds like a mistake'),
        advice: b('長さがすべてです。「ささやいてから言い切る」イメージで、短く軽く。', 'Length is everything. Whisper the approach, then state the target.'),
      },
    ],
    selfCheck: [
      b('アプローチ音を短く弾けた', 'My approach notes stayed short'),
      b('ターゲットがはっきり聞こえた', 'Targets came through clearly'),
      b('半音の引力を感じた', 'I felt the chromatic pull'),
    ],
    nextConnection: b('次は反対側 — 半音上から、そして上下で挟む形に進みます。', 'Next: the other side — from above, and then surrounding the target from both sides.'),
    estimatedMinutes: 8,
  },
  {
    id: 'c3-enclosure',
    courseId: 'adlib-basics',
    chapterId: 'ch3',
    title: b('上下から挟んで着地しよう', 'Surround the landing'),
    technicalName: 'Enclosure/エンクロージャー',
    problem: b('半音下からの形は覚えたが、毎回同じでワンパターンになってきた。', 'The from-below move works, but it’s becoming your only trick.'),
    outcome: b('半音上から、さらに上下で挟む形を加えて、着地の引き出しが3種類になります。', 'Adding “from above” and “surround from both sides,” you’ll have three ways to land.'),
    reason: b('上下から挟む形(エンクロージャー)は、ビバップ以来ずっと使われ続けている定番の装飾です。ここまでの「着地」+「半音」の知識だけで、もうこの本格的な語彙に手が届きます。', 'The enclosure has been core jazz vocabulary since bebop. With your landing and half-step skills, this authentic device is already within reach.'),
    realUseCases: [
      b('ゆっくりのテンポで着地を印象づけたいとき', 'Making a landing memorable at slower tempos'),
      b('フレーズの頂点の音を飾るとき', 'Decorating the peak note of a line'),
    ],
    progressionId: 'ii-V-I',
    contentTab: 'approach',
    usableNotes: [
      { chord: 'Cmaj7 の3度 E へ', notes: 'F → D♯ → E' },
    ],
    rules: [
      b('挟む2音は短く、ターゲットは長く', 'Surrounding notes short, target long'),
      b('ターゲットはコードトーン(まず3度)', 'Target a chord tone (start with 3rds)'),
    ],
    steps: [
      { title: b('上から', 'From above'), instruction: b('「半音上(または全音上)→ターゲット」を各3度へ。', 'Play “step above → target” into each 3rd.') },
      { title: b('挟む', 'Surround'), instruction: b('「上→下→ターゲット」の3音セット(譜面の形)を弾きます。', 'Now the three-note set: above → below → target (as written).') },
      { title: b('選んで使う', 'Choose freely'), instruction: b('下から・上から・挟む、を自由に選びながら進行を回ります。', 'Loop the form, freely choosing below / above / surround.') },
    ],
    successSigns: [
      b('3種類の着地を意識的に使い分けられる', 'You can deliberately pick any of the three landings'),
      b('装飾を入れてもターゲットの存在感が消えない', 'Ornaments never bury the target'),
    ],
    commonMistakes: [
      {
        problem: b('挟む形でリズムが崩れる', 'The surround figure wrecks your time'),
        advice: b('まずテンポを大きく落とし、3音を「タタ・ターン」と口で歌ってから弾きましょう。', 'Drop the tempo and sing the figure — “da-da-daah” — before playing it.'),
      },
    ],
    selfCheck: [
      b('半音上からのアプローチができた', 'I approached from above'),
      b('上下で挟む形を弾けた', 'I played the surround figure'),
      b('ターゲットを長く保てた', 'I kept targets long'),
    ],
    nextConnection: b('第4章では視点を変え、音選びではなく「間」— 休符とリズムでフレーズを形づくります。', 'Chapter 4 shifts focus from note choice to space: shaping phrases with rests and rhythm.'),
    estimatedMinutes: 10,
  },

  // ================= 第4章 =================
  {
    id: 'c4-less-notes',
    courseId: 'adlib-basics',
    chapterId: 'ch4',
    title: b('弾かない勇気を身につけよう', 'The courage not to play'),
    technicalName: 'Space/休符・音数制限',
    problem: b('気づくと8分音符をずっと弾き続けていて、聴き手も自分も息が詰まる。', 'You catch yourself streaming endless 8th notes — no room to breathe for anyone.'),
    outcome: b('1小節2〜3音+休符で、「間」が生きたフレーズを演奏できるようになります。', 'With 2–3 notes and a rest per measure, your phrases will breathe.'),
    reason: b('名演ほど休符が多いものです。休符はサボりではなく、直前のフレーズを聴き手に味わわせ、次のフレーズを際立たせる仕事をしています。', 'The greatest solos are full of rests. Silence isn’t laziness — it lets the listener digest what you just said and makes the next phrase land harder.'),
    realUseCases: [
      b('ソロの前半で余白を作るとき', 'Creating space early in a solo'),
      b('バンドの他の音を聴きたいとき', 'When you need to hear the band'),
    ],
    progressionId: 'ii-V-I',
    contentTab: 'chordtones',
    toneRhythm: 'basic',
    rules: [
      b('1小節に2〜3音まで', '2–3 notes per measure, max'),
      b('2小節ごとに1拍以上の完全な休み', 'At least one full beat of silence every two measures'),
    ],
    steps: [
      { title: b('数える', 'Count them'), instruction: b('コードトーンから2〜3音選んで弾き、休みの拍を意識的に数えます。', 'Play 2–3 chord tones, consciously counting your beats of silence.') },
      { title: b('間を聴く', 'Listen to the gap'), instruction: b('休符の間、伴奏のコード音に耳を澄まします。次の音はその響きへの「返事」として選びます。', 'During each rest, listen to the backing chord. Choose your next note as a reply to it.') },
    ],
    successSigns: [
      b('休符の間も音楽が続いている感覚がある', 'The music keeps flowing through your silence'),
      b('休み明けの1音が前より説得力を持つ', 'The note after a rest carries more weight'),
    ],
    commonMistakes: [
      {
        problem: b('休むと「止まってしまった」ように感じる', 'Resting feels like stalling'),
        advice: b('それは弾き手だけの感覚です。聴き手には「余裕」に聞こえています。録音すると実感できます。', 'Only the player feels that. To listeners it sounds like confidence — record yourself and hear it.'),
      },
    ],
    selfCheck: [
      b('音数制限を守れた', 'I stayed within the note limit'),
      b('休符を数えながら弾けた', 'I counted my rests'),
      b('休み明けの音を意識して選んだ', 'I chose my re-entry notes deliberately'),
    ],
    nextConnection: b('次は、その「間」を作る場所を変えます — 1拍目を空けて、裏から入ります。', 'Next we move the space around: leaving beat 1 empty and entering off the beat.'),
    estimatedMinutes: 8,
  },
  {
    id: 'c4-offbeat',
    courseId: 'adlib-basics',
    chapterId: 'ch4',
    title: b('1拍目を休んで裏から入ろう', 'Skip beat 1, enter on the upbeat'),
    technicalName: 'Offbeat/裏拍スタート',
    problem: b('フレーズがいつも1拍目から始まり、行進曲のように四角四面に聞こえる。', 'Every phrase starts on beat 1 — your solo marches instead of swinging.'),
    outcome: b('1拍目を空けて裏拍から入るだけで、同じ音でも「泳ぐような」ジャズのノリになります。', 'Just by leaving beat 1 empty and entering on an upbeat, the same notes start to swim like jazz.'),
    reason: b('ジャズのフレーズは小節の頭を避けて始まることが非常に多いです。頭を空けると伴奏の音が聞こえ、裏から入ると推進力が生まれます。この1つの習慣だけで演奏の印象が大きく変わります。', 'Jazz phrases very often avoid starting on the downbeat. An empty beat 1 lets the band speak; an upbeat entry creates forward motion. This single habit transforms how you sound.'),
    realUseCases: [
      b('すべてのフレーズの出だし', 'The start of literally any phrase'),
      b('コンピングの合いの手に応えるとき', 'Answering a comping hit'),
    ],
    progressionId: 'ii-V-I',
    contentTab: 'chordtones',
    toneRhythm: 'offbeat',
    rules: [
      b('各小節の1拍目は必ず休符', 'Beat 1 of every measure is a rest'),
      b('入りは1拍目のウラか2拍目から', 'Enter on the “and” of 1 or on beat 2'),
    ],
    steps: [
      { title: b('譜面のとおり', 'As written'), instruction: b('裏拍だけのパターンを譜面どおりに弾き、休む→入るの感覚を掴みます。', 'Play the written offbeat pattern to feel the rest-then-enter cycle.') },
      { title: b('音を選び直す', 'Your notes'), instruction: b('リズムは裏拍のまま、音をコードトーンから自由に選び直します。', 'Keep the offbeat rhythm; choose your own chord tones.') },
      { title: b('混ぜる', 'Mix it'), instruction: b('裏拍スタートの小節と普通の小節を交互にして、違いを聴き比べます。', 'Alternate offbeat-start measures with normal ones and compare.') },
    ],
    successSigns: [
      b('1拍目の休みが不安でなくなる', 'The empty downbeat stops feeling scary'),
      b('裏から入った音が前のめりの推進力を持つ', 'Upbeat entries push the line forward'),
    ],
    commonMistakes: [
      {
        problem: b('裏拍のつもりが表に戻ってしまう', 'Your “upbeats” keep drifting back onto the beat'),
        advice: b('メトロノームの音を「表」、自分を「裏」と役割分担しましょう。声で「ん・タ」と歌ってから弾くと安定します。', 'Let the metronome own the downbeats and you own the upbeats. Singing “n-TAH” first helps lock it in.'),
      },
    ],
    selfCheck: [
      b('全小節で1拍目を休めた', 'I rested on every beat 1'),
      b('裏拍からの入りが安定した', 'My upbeat entries were steady'),
      b('ノリの違いを感じ取れた', 'I could feel the difference in groove'),
    ],
    nextConnection: b('次は2小節単位の会話 — 「問い」と「答え」でフレーズに物語を持たせます。', 'Next: two-bar conversations — giving your phrases a question and an answer.'),
    estimatedMinutes: 8,
  },
  {
    id: 'c4-call-response',
    courseId: 'adlib-basics',
    chapterId: 'ch4',
    title: b('問いかけと返事を作ろう', 'Make a question and an answer'),
    technicalName: 'Call & Response/コール&レスポンス',
    problem: b('フレーズを次々弾いているのに、全体がバラバラで「話」になっていない。', 'You play phrase after phrase, but they don’t add up to a story.'),
    outcome: b('2小節の「問い」に2小節の「答え」を返す、会話のようなまとまりを作れるようになります。', 'You’ll pair a two-bar question with a two-bar answer — phrases that talk to each other.'),
    reason: b('人がメロディーを「音楽的」と感じる大きな理由は、問いと答えの構造です。ブルースもゴスペルもジャズも、この呼吸で成り立っています。フレーズを対で考えるだけで、ソロに物語が生まれます。', 'We hear melody as musical largely because of question-answer structure — it powers blues, gospel and jazz alike. Thinking in pairs instantly gives your solo a narrative.'),
    realUseCases: [
      b('4小節・8小節単位のソロ構成', 'Organizing solos in 4- and 8-bar units'),
      b('他の奏者との掛け合い', 'Trading with another player'),
    ],
    progressionId: 'ii-V-I',
    contentTab: 'chordtones',
    toneRhythm: 'basic',
    rules: [
      b('前半2小節=問い、後半2小節=答え', 'Bars 1–2 ask; bars 3–4 answer'),
      b('答えは問いに似せる(リズムか音形を引用)', 'The answer echoes the question (its rhythm or shape)'),
      b('問いと答えの間に一呼吸の休符', 'Take a breath (rest) between them'),
    ],
    steps: [
      { title: b('問いだけ', 'Question only'), instruction: b('前半2小節で短い問いを弾き、後半2小節は完全に休みます。', 'Play a short question in bars 1–2; stay silent through bars 3–4.') },
      { title: b('答える', 'Answer it'), instruction: b('同じ問いを弾き、今度は後半で「似た形の返事」をします。終わりは3度か7度で。', 'Repeat the question, then reply with a similar shape — ending on a 3rd or 7th.') },
    ],
    successSigns: [
      b('4小節がひとつの会話に聞こえる', 'The four bars sound like one exchange'),
      b('答えの終わりに「言い終えた感」がある', 'The answer lands with a sense of completion'),
    ],
    commonMistakes: [
      {
        problem: b('答えが問いと無関係な新しいフレーズになる', 'Your answer turns into an unrelated new phrase'),
        advice: b('答えは創作ではなく「返事」です。問いのリズムをそのまま借りて、最後だけ変えるくらいで十分です。', 'An answer replies, it doesn’t invent. Borrow the question’s rhythm wholesale and change only the ending.'),
      },
    ],
    selfCheck: [
      b('問いと答えを対で作れた', 'I built question-answer pairs'),
      b('答えに問いの要素を引用できた', 'My answers quoted the questions'),
      b('間に休符を置けた', 'I breathed between them'),
    ],
    nextConnection: b('第5章では、この「引用」の考え方を発展させ、1つのアイデアを育てる練習に入ります。', 'Chapter 5 grows this idea of quotation into developing one small idea.'),
    estimatedMinutes: 10,
  },

  // ================= 第5章 =================
  {
    id: 'c5-motif',
    courseId: 'adlib-basics',
    chapterId: 'ch5',
    title: b('短いメロディーの種を作ろう', 'Plant a melodic seed'),
    technicalName: 'Motif/モチーフ',
    problem: b('アドリブ中、常に「次に何を弾こう」と考え続けて頭が疲れてしまう。', 'Improvising exhausts you — your brain is always scrambling for the next idea.'),
    outcome: b('2〜4音の「種」を1つ作って繰り返すだけで、考える量を減らしながらまとまりを出せるようになります。', 'One 2–4 note seed, repeated, gives you coherence while your brain finally gets to rest.'),
    reason: b('聴き手は繰り返しを「意図」として受け取ります。同じ形が戻ってくるだけで、即興が「作曲されたもの」のように聞こえ始めます。新しい音を探し続けるより、1つの種を植えて育てる方が音楽になります。', 'Listeners hear repetition as intention. When a shape returns, improvisation starts to sound composed. Growing one seed beats hunting for endless new notes.'),
    realUseCases: [
      b('ソロの出だしでアイデアを提示するとき', 'Stating your idea at the top of a solo'),
      b('緊張して頭が真っ白になったとき', 'When nerves wipe your mind blank'),
    ],
    progressionId: 'ii-V-I',
    contentTab: 'chordtones',
    toneRhythm: 'basic',
    rules: [
      b('モチーフは2〜4音・1小節以内', 'The motif: 2–4 notes, within one measure'),
      b('まずは変えずにそのまま繰り返す', 'First, repeat it exactly — no changes'),
    ],
    steps: [
      { title: b('種を作る', 'Make the seed'), instruction: b('コードトーンから2〜4音を選び、リズム込みで1つのモチーフを決めます。', 'Choose 2–4 chord tones and fix them into one motif, rhythm included.') },
      { title: b('植え続ける', 'Keep planting'), instruction: b('同じモチーフを各小節で繰り返します。コードが変わって響きが変化するのを聴きます。', 'Repeat it in every measure. Listen to how the changing chords recolor it.') },
    ],
    successSigns: [
      b('モチーフを暗記して迷わず繰り返せる', 'You repeat the motif from memory, no hesitation'),
      b('同じ音形なのにコードによって表情が変わって聞こえる', 'The same shape changes character over each chord'),
    ],
    commonMistakes: [
      {
        problem: b('繰り返しが「手抜き」に感じられて崩したくなる', 'Repeating feels like cheating, so you keep altering it'),
        advice: b('名手ほど堂々と繰り返します。まずは「変えない我慢」を練習してください。変えるのは次のレッスンです。', 'The masters repeat shamelessly. Practice the discipline of NOT changing it — variation is next lesson’s job.'),
      },
    ],
    selfCheck: [
      b('2〜4音のモチーフを決められた', 'I fixed a 2–4 note motif'),
      b('崩さずに繰り返せた', 'I repeated it intact'),
      b('コードによる響きの変化を聴けた', 'I heard the chords recolor it'),
    ],
    nextConnection: b('次は、この種に「一箇所だけ」変化を加えて育てます。', 'Next we grow the seed — changing exactly one thing at a time.'),
    estimatedMinutes: 8,
  },
  {
    id: 'c5-vary-one',
    courseId: 'adlib-basics',
    chapterId: 'ch5',
    title: b('一箇所だけ変えて育てよう', 'Change exactly one thing'),
    technicalName: 'Motif Development/モチーフ展開',
    problem: b('繰り返しはできるが、ずっと同じでは単調になりそうで、その先が分からない。', 'You can repeat, but you fear monotony — and don’t know where to go next.'),
    outcome: b('「リズムだけ」「最後の音だけ」を変える2つの技で、同じ種から違う花を咲かせられるようになります。', 'Two tools — vary only the rhythm, or only the last note — will grow different flowers from the same seed.'),
    reason: b('展開のコツは「ほとんど同じで、少しだけ違う」ことです。全部変えると別のフレーズになり、何も変えないと停滞します。一箇所だけの変化は、聴き手に「アイデアが育っている」と感じさせます。', 'Development means “mostly the same, slightly different.” Change everything and it’s a new phrase; change nothing and it stalls. One-spot variation tells the listener your idea is growing.'),
    realUseCases: [
      b('同じモチーフの2回目・3回目', 'The 2nd and 3rd appearances of your motif'),
      b('コーラスをまたいでアイデアを持ち越すとき', 'Carrying an idea into the next chorus'),
    ],
    progressionId: 'ii-V-I',
    contentTab: 'chordtones',
    toneRhythm: 'charleston',
    rules: [
      b('変えるのは毎回一箇所だけ', 'Change only one element per repeat'),
      b('「リズムだけ」か「最後の音だけ」', 'Either the rhythm or the final note'),
    ],
    steps: [
      { title: b('リズム変化', 'Rhythm shift'), instruction: b('前回のモチーフを、音はそのままリズムだけ変えて繰り返します。', 'Repeat your motif with the same notes but a new rhythm.') },
      { title: b('着地変化', 'New landing'), instruction: b('元のリズムに戻し、最後の音だけ別のコードトーンに変えます。', 'Restore the rhythm; change only the last note to another chord tone.') },
      { title: b('交互に', 'Alternate'), instruction: b('「そのまま→リズム変化→そのまま→着地変化」の順で4小節を回します。', 'Cycle four bars: original → rhythm change → original → landing change.') },
    ],
    successSigns: [
      b('変化させても元のモチーフだと分かる', 'Variations still sound like the original'),
      b('4小節がひとつの成長する話に聞こえる', 'The four bars tell one growing story'),
    ],
    commonMistakes: [
      {
        problem: b('気づくと二箇所以上変わっている', 'You end up changing two things at once'),
        advice: b('欲張りは展開の敵です。物足りないくらいが、聴き手にはちょうど良く聞こえます。', 'Greed kills development. What feels too subtle to you sounds just right to the listener.'),
      },
    ],
    selfCheck: [
      b('リズムだけの変化ができた', 'I varied rhythm only'),
      b('最後の音だけの変化ができた', 'I varied the last note only'),
      b('元の形が聴き手に伝わる範囲で変えられた', 'The original stayed recognizable'),
    ],
    nextConnection: b('次は、コードが変わる場所でモチーフを「進行に合わせて」動かします。', 'Next: moving the motif to follow the chords as they change.'),
    estimatedMinutes: 8,
  },
  {
    id: 'c5-sequence',
    courseId: 'adlib-basics',
    chapterId: 'ch5',
    title: b('コードに合わせて種を動かそう', 'Move the seed with the chords'),
    technicalName: 'Sequence/シークエンス',
    problem: b('モチーフを繰り返すと、コードによっては音がぶつかってしまう。', 'Sometimes your repeated motif collides with the new chord.'),
    outcome: b('モチーフの形を保ったまま、各コードに合う高さへ平行移動できるようになります。', 'You’ll slide the motif’s shape to fit each chord while keeping it recognizable.'),
    reason: b('形を保って高さを変える「シークエンス」は、バッハからジャズまで共通の展開技法です。コードトーンの知識(第1章)とモチーフ(第5章)がここで合流し、進行に寄り添う即興になります。', 'Keeping the shape while shifting pitch — the sequence — powers everything from Bach to bebop. Your chord-tone knowledge (Ch. 1) and motifs (Ch. 5) merge here into changes-aware improvising.'),
    realUseCases: [
      b('ii–V–Iをひとつのアイデアで通すとき', 'Riding one idea through a ii–V–I'),
      b('下降・上昇する進行での定番の見せ場', 'The classic move over descending or rising changes'),
    ],
    progressionId: 'ii-V-I',
    contentTab: 'chordtones',
    arpPattern: 'wave',
    rules: [
      b('モチーフの形(音の上下の並び)は変えない', 'Keep the motif’s contour intact'),
      b('各コードでコードトーンに乗るよう高さだけ調整', 'Adjust only the pitch so it sits on chord tones'),
    ],
    steps: [
      { title: b('形を確認', 'Know the shape'), instruction: b('譜面の「波」の形(1-3-5-3)を、まずCmaj7だけで往復します。', 'Loop the written “wave” shape (1-3-5-3) on Cmaj7 alone.') },
      { title: b('進行に乗せる', 'Ride the changes'), instruction: b('同じ形をDm7→G7→Cmaj7それぞれのコードトーンに乗せて移動します。', 'Slide the same shape onto the tones of Dm7 → G7 → Cmaj7.') },
      { title: b('自作の種で', 'Your own seed'), instruction: b('前回までの自分のモチーフでも同じことを試します。', 'Do the same with the motif you built in earlier lessons.') },
    ],
    successSigns: [
      b('形は同じなのに、各コードにきちんとハマる', 'The shape stays constant yet fits every chord'),
      b('「進行を分かって弾いている」響きがする', 'You sound like you’re playing the changes'),
    ],
    commonMistakes: [
      {
        problem: b('移動先の音を探すうちにリズムが止まる', 'Hunting for the new pitches breaks your time'),
        advice: b('先に各コードで「形の開始音」だけ決めておきましょう。開始音さえ分かれば、あとは形が導いてくれます。', 'Pre-choose just the starting note on each chord. Once you have that, the shape carries you.'),
      },
    ],
    selfCheck: [
      b('形を保ったまま移動できた', 'I moved the shape without breaking it'),
      b('各コードでコードトーンに乗れた', 'It sat on chord tones everywhere'),
      b('リズムを止めずに移動できた', 'My time never stopped'),
    ],
    nextConnection: b('最終章では、すべての道具を持って長いコード進行 — ジャズブルース — に出かけます。', 'In the final chapter, we take the whole toolkit out to a longer form: the jazz blues.'),
    estimatedMinutes: 10,
  },

  // ================= 第6章 =================
  {
    id: 'c6-form',
    courseId: 'adlib-basics',
    chapterId: 'ch6',
    title: b('進行を見失わずに演奏しよう', 'Never lose the form'),
    technicalName: 'Form/フォーム把握',
    problem: b('短い進行なら平気なのに、長くなると「今どこ?」と迷子になる。', 'Short progressions are fine, but longer ones leave you asking “wait, where are we?”'),
    outcome: b('12小節のジャズブルースを、4小節×3ブロックの地図として追えるようになります。', 'You’ll navigate the 12-bar jazz blues as a map of three 4-bar blocks.'),
    reason: b('長い進行は暗記ではなく「地図」で捉えます。ブルースは 起(1〜4)・展開(5〜8)・結(9〜12)の3ブロック。ブロックの入口だけ意識すれば、途中で迷っても次の入口で復帰できます。', 'You don’t memorize long forms — you map them. The blues has three blocks: statement (1–4), development (5–8), resolution (9–12). Track just the block entrances and you can always re-board at the next one.'),
    realUseCases: [
      b('セッションでブルースが始まったとき', 'When someone calls a blues at a session'),
      b('どんな曲でも「フォームで数える」習慣づくり', 'Building the habit of counting any tune in blocks'),
    ],
    progressionId: 'blues',
    contentTab: 'chordtones',
    toneRhythm: 'basic',
    rules: [
      b('演奏は各ブロックの1小節目だけ(ルート1音)', 'Play only bar 1 of each block — a single root'),
      b('残りの小節は数えることに集中', 'Spend the other bars just counting'),
    ],
    steps: [
      { title: b('入口だけ', 'Entrances only'), instruction: b('1・5・9小節目の頭でルートを1音。他は休んで小節を数えます。', 'One root at the top of bars 1, 5 and 9. Rest and count everywhere else.') },
      { title: b('変化に印を', 'Mark the turns'), instruction: b('コードが変わる小節(2, 7, 8, 9, 10...)でだけ音を出してみます。', 'Now sound a note only in the bars where the chord changes (2, 7, 8, 9, 10...).') },
    ],
    successSigns: [
      b('目を閉じても「今が何小節目か」言える', 'Eyes closed, you still know the bar number'),
      b('迷っても次のブロック頭で復帰できる', 'Even if you drift, you re-enter at the next block'),
    ],
    commonMistakes: [
      {
        problem: b('弾くことに集中すると数がずれる', 'Playing pulls your count off'),
        advice: b('まだ「良い音」を出そうとしないでください。この練習の主役は数える方で、音はおまけです。', 'Don’t try to sound good yet. Counting is the star here; the notes are garnish.'),
      },
    ],
    selfCheck: [
      b('12小節を3ブロックで捉えられた', 'I felt the 12 bars as three blocks'),
      b('4周回っても位置がずれなかった', 'Four loops, no drift'),
      b('コードが変わる小節を言い当てられた', 'I could name the bars where chords change'),
    ],
    nextConnection: b('次は、このブルースの上でこれまでの道具(ガイドトーン・着地)を使います。', 'Next we deploy your tools — guide tones and landings — on this blues.'),
    estimatedMinutes: 8,
  },
  {
    id: 'c6-blues-blocks',
    courseId: 'adlib-basics',
    chapterId: 'ch6',
    title: b('ブルースを4小節ずつ攻略しよう', 'Conquer the blues four bars at a time'),
    technicalName: 'Jazz Blues/ジャズブルース',
    problem: b('12小節をいきなり通すと、後半(9〜12小節)でいつも崩れる。', 'Running the full 12 bars, you always fall apart in the last four.'),
    outcome: b('ブロックごとに練習してから通すことで、鬼門の9〜12小節(ii–V)も安定して弾けるようになります。', 'Practicing block by block, even the tricky bars 9–12 (the ii–V) become solid.'),
    reason: b('ブルースの前半はコードが少なく、後半に難所が集中しています。均等に練習すると前半ばかり上手くなるので、ブロック分割で後半に時間を配分するのが近道です。', 'The blues front-loads easy bars and saves the hard ones for the end. Even practice makes you great at the easy part — splitting into blocks lets you invest where it counts.'),
    realUseCases: [
      b('ジャズブルースの9〜12小節目', 'Bars 9–12 of any jazz blues'),
      b('新しい曲の難所だけを取り出す練習法として', 'A template for isolating the hard bars of any tune'),
    ],
    progressionId: 'blues',
    contentTab: 'guidetones',
    toneRhythm: 'basic',
    rules: [
      b('使う音はガイドトーン(3度と7度)中心', 'Stick mostly to guide tones (3rds & 7ths)'),
      b('各ブロックを頭の中で「担当の4小節」と区切る', 'Mentally frame each block as “my four bars”'),
    ],
    steps: [
      { title: b('起(1〜4)', 'Bars 1–4'), instruction: b('最初の4小節だけを意識して、ガイドトーンでつなぎます(全体は流れたままでOK)。', 'Focus on the first four bars, connecting guide tones (the full form keeps looping — that’s fine).') },
      { title: b('展開(5〜8)', 'Bars 5–8'), instruction: b('次の4小節が来たときだけ弾き、他のブロックは休みます。', 'Play only when bars 5–8 come around; rest through the other blocks.') },
      { title: b('結(9〜12)', 'Bars 9–12'), instruction: b('難所のii–V(9〜10小節)へ集中。Dm7→G7の3度着地を思い出して。', 'Zero in on the ii–V (bars 9–10). Remember your 3rd landings on Dm7→G7.') },
    ],
    successSigns: [
      b('9〜12小節で崩れなくなる', 'Bars 9–12 stop falling apart'),
      b('ブロックの入れ替わりでフレーズを切り替えられる', 'You can shift ideas at each block boundary'),
    ],
    commonMistakes: [
      {
        problem: b('休みのブロックで集中が切れる', 'You zone out during your resting blocks'),
        advice: b('休みの間も頭の中でガイドトーンを歌い続けてください。「無音の練習」も練習です。', 'Keep singing the guide tones in your head while resting. Silent practice is still practice.'),
      },
    ],
    selfCheck: [
      b('ブロックごとに集中を切り替えられた', 'I could focus block by block'),
      b('9〜10小節のii–Vで着地できた', 'I landed through the bars 9–10 ii–V'),
      b('12小節を通しても崩れなかった', 'The full 12 bars held together'),
    ],
    nextConnection: b('最後は仕上げ — 1コーラスを「起承転結」のあるソロとして組み立てます。', 'The finale: assembling one full chorus with a real beginning, middle and end.'),
    estimatedMinutes: 12,
  },
  {
    id: 'c6-one-chorus',
    courseId: 'adlib-basics',
    chapterId: 'ch6',
    title: b('1コーラスの物語を作ろう', 'Tell a one-chorus story'),
    technicalName: 'Solo Construction/ソロ構成',
    problem: b('技は増えたのに、ソロ全体としては行き当たりばったりに聞こえる。', 'You have the tools now, but a whole solo still sounds like wandering.'),
    outcome: b('「静かに始める→育てる→着地する」の設計図で、まとまりのある1コーラスを演奏できるようになります。', 'With the blueprint “start quiet → develop → land,” you’ll play one coherent chorus.'),
    reason: b('良いソロには起伏の設計があります。最初から全力だと行き場がなく、ずっと同じ密度だと平坦です。1コーラスの中に小さな物語を作る意識が、そのまま長いソロの設計力になります。', 'Good solos have an arc. Start at full blast and you’ve nowhere to go; stay at one density and it’s flat. Learning to shape one chorus is exactly the skill that scales to longer solos.'),
    realUseCases: [
      b('セッションで回ってくる1〜2コーラスのソロ', 'The one or two choruses you get at a jam'),
      b('どんな長さのソロにも通じる密度設計', 'Density planning for solos of any length'),
    ],
    progressionId: 'blues',
    contentTab: 'scale',
    scaleView: 'scale',
    rules: [
      b('前半(1〜4): 音数少なめ・モチーフ提示', 'Bars 1–4: few notes, state a motif'),
      b('中盤(5〜8): モチーフを展開', 'Bars 5–8: develop it'),
      b('後半(9〜12): 着地して静かに締める', 'Bars 9–12: land and close quietly'),
    ],
    steps: [
      { title: b('設計図を歌う', 'Sing the blueprint'), instruction: b('弾く前に、どこで盛り上げてどこで締めるかを口で歌って決めます。', 'Before playing, sing where you’ll build and where you’ll close.') },
      { title: b('1コーラス通す', 'One chorus'), instruction: b('設計図どおりに1コーラス。うまくいかなくても止まらず最後まで。', 'Play the chorus to your plan. If it wobbles, keep going to the end.') },
      { title: b('2コーラス目', 'Chorus two'), instruction: b('続けてもう1周。今度は1周目と密度を変えます。', 'Take another chorus — this time change the density from the first.') },
    ],
    successSigns: [
      b('ソロに始まり・中間・終わりを感じる', 'Your solo has a beginning, middle and end'),
      b('最後の4小節で音数を落として締められる', 'You can thin out and close in the last four bars'),
      b('2コーラスで違う内容を弾ける', 'Two choruses, two different stories'),
    ],
    commonMistakes: [
      {
        problem: b('中盤で盛り上げようとして音を詰め込みすぎる', 'The “development” turns into note-cramming'),
        advice: b('盛り上げ=音数ではありません。音域を上げる・リズムを細かくする・音量を上げる、のどれか1つで十分です。', 'Intensity ≠ more notes. Raise the register, tighten the rhythm, or play louder — any ONE of these is enough.'),
      },
    ],
    selfCheck: [
      b('設計図を決めてから弾いた', 'I planned before playing'),
      b('前半の音数を我慢できた', 'I kept the opening sparse'),
      b('最後に着地して締められた', 'I landed the ending'),
      b('1つのソロとしてまとまりがあった', 'It held together as one solo'),
    ],
    nextConnection: b('コース修了です!「曲で実践」でミッションを選び、今日の設計図を色々な進行で試しましょう。', 'Course complete! Head to “Play a Tune,” pick a mission, and try your blueprint on other progressions.'),
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
