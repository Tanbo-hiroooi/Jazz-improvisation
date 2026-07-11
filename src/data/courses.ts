// 練習コース: アプリが順番を決めて段階的に学ぶモードのデータ

import type { StaffTab } from '../theory/modes';
import type { ArpPatternId, ToneRhythmId } from '../theory/phrases';
import type { ProgressionId } from '../theory/progressions';

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  titleEn: string;
  /** 今日のテーマ(1行) */
  theme: string;
  themeEn: string;
  objective: string;
  objectiveEn: string;
  explanation: string;
  explanationEn: string;
  progressionId: ProgressionId;
  /** 譜面に表示する内容 */
  contentTab: StaffTab;
  toneRhythm?: ToneRhythmId;
  arpPattern?: ArpPatternId;
  scaleView?: 'scale' | 'tension';
  rules: { ja: string; en: string }[];
  /** 自由度を少し上げる(制限をひとつ解除) */
  relax: { ja: string; en: string };
  selfCheck: { ja: string; en: string }[];
}

export interface Course {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  difficulty: number;
  lessonIds: string[];
  estimatedSessions: number;
}

export const COURSES: Course[] = [
  {
    id: 'ii-v-i-intro',
    title: 'ii–V–I 入門',
    titleEn: 'Intro to the ii–V–I',
    description: 'ジャズで最も大切な進行を、8つのレッスンで「理解→コードトーン→着地→アプローチ→リズム→モチーフ→アドリブ」へ段階的に進みます。',
    descriptionEn: 'Master jazz’s most important progression in 8 lessons: understand → chord tones → landings → approaches → rhythm → motifs → improvising.',
    difficulty: 1,
    lessonIds: ['l1-understand', 'l2-chordtones', 'l3-guidetones', 'l4-target', 'l5-approach', 'l6-rhythm', 'l7-motif', 'l8-improvise'],
    estimatedSessions: 8,
  },
];

export const LESSONS: Lesson[] = [
  {
    id: 'l1-understand',
    courseId: 'ii-v-i-intro',
    title: 'Lesson 1: 進行を理解する',
    titleEn: 'Lesson 1: Understand the progression',
    theme: 'ii・V・Iの役割を知り、コードが変わる瞬間を追う',
    themeEn: 'Know the roles of ii, V and I, and follow each change',
    objective: 'コード名と進行の流れを、見て・聴いて追えるようになる。',
    objectiveEn: 'Follow the chord names and flow by eye and ear.',
    explanation:
      'ii(準備)→V(緊張)→I(解決)は、ジャズの文章でいう「起→承→結」です。まずは弾かずに、伴奏を聴きながら進行表のハイライトを目で追い、コードが変わる瞬間に手拍子してみましょう。譜面には各コードの構成音(ルートから順)を表示しています。',
    explanationEn:
      'ii (setup) → V (tension) → I (resolution) is the sentence structure of jazz. Before playing, just listen: watch the highlighted measure and clap exactly when the chord changes. The staff shows each chord’s tones from the root.',
    progressionId: 'ii-V-I',
    contentTab: 'chordtones',
    toneRhythm: 'basic',
    rules: [
      { ja: 'まだ自由に弾かない。ルート(最初の音)だけ弾いてよい', en: 'Don’t improvise yet — you may play only the root (the first note)' },
      { ja: 'コードが変わる瞬間に合図(手拍子/足)を入れる', en: 'Mark each chord change (clap or tap your foot)' },
      { ja: '小節番号を見失わない', en: 'Never lose track of the measure number' },
    ],
    relax: { ja: '慣れたら、ルートを好きなオクターブで弾いてみる。', en: 'Once comfortable, play the roots in any octave you like.' },
    selfCheck: [
      { ja: 'コードが変わる瞬間が分かった', en: 'I could feel each chord change' },
      { ja: '今どの小節かを見失わなかった', en: 'I never lost my place in the form' },
      { ja: 'ii→V→Iの「解決」の感じが聴き取れた', en: 'I could hear the ii→V→I resolution' },
    ],
  },
  {
    id: 'l2-chordtones',
    courseId: 'ii-v-i-intro',
    title: 'Lesson 2: コードトーン',
    titleEn: 'Lesson 2: Chord tones',
    theme: '各コードの1・3・5・7度を体で覚える',
    themeEn: 'Learn each chord’s 1-3-5-7 by feel',
    objective: 'コードトーンの場所を覚え、少ない音で演奏できるようになる。',
    objectiveEn: 'Know where the chord tones live and play sparsely.',
    explanation:
      '譜面の4分音符が各コードの1・3・5・7度です。まず譜面どおりに弾き、次に「1小節に2音だけ」の制限で自分の順番で弾いてみましょう。音を減らすほど、1音の responsibility(責任)が増えます。',
    explanationEn:
      'The quarter notes are each chord’s 1-3-5-7. First play them as written; then improvise with only two notes per measure, in any order. The fewer the notes, the more each one matters.',
    progressionId: 'ii-V-I',
    contentTab: 'chordtones',
    toneRhythm: 'basic',
    arpPattern: 'up',
    rules: [
      { ja: '使用音はコードトーンのみ', en: 'Chord tones only' },
      { ja: '1小節に2音だけ使う', en: 'Only two notes per measure' },
      { ja: '必ず休符を入れる', en: 'Always include rests' },
    ],
    relax: { ja: '2音制限を3〜4音まで緩めてよい。', en: 'Relax the limit to 3–4 notes per measure.' },
    selfCheck: [
      { ja: '各コードの1・3・5・7の場所が分かった', en: 'I know where each chord’s 1-3-5-7 are' },
      { ja: '2音だけでも音楽に聴こえた', en: 'Even two notes sounded musical' },
      { ja: '休符を怖がらずに使えた', en: 'I used rests without fear' },
    ],
  },
  {
    id: 'l3-guidetones',
    courseId: 'ii-v-i-intro',
    title: 'Lesson 3: ガイドトーン',
    titleEn: 'Lesson 3: Guide tones',
    theme: '3度と7度で進行をつなぐ',
    themeEn: 'Connect the changes with 3rds & 7ths',
    objective: 'コードの変わり目で、最も近いガイドトーンへ動けるようになる。',
    objectiveEn: 'Move to the nearest guide tone at every change.',
    explanation:
      'Dm7→G7→Cmaj7では、F→F→E、C→B→Bのように、3度と7度は半音か全音しか動きません。譜面の2分音符ラインを弾いて、この「なめらかな糸」を耳に焼き付けましょう。1コードにつき1音から始めてOKです。',
    explanationEn:
      'Over Dm7→G7→Cmaj7 the guide tones barely move: F→F→E and C→B→B. Play the half-note line and burn this smooth thread into your ears. Starting with one note per chord is fine.',
    progressionId: 'ii-V-I',
    contentTab: 'guidetones',
    toneRhythm: 'basic',
    rules: [
      { ja: '使用音は3度と7度のみ', en: '3rds and 7ths only' },
      { ja: '次のコードでは一番近いガイドトーンへ', en: 'Move to the nearest guide tone at each change' },
      { ja: '1コードにつき1〜2音', en: 'One or two notes per chord' },
    ],
    relax: { ja: 'ガイドトーンの前後に1音だけ飾りを足してよい。', en: 'Add one ornamental note around a guide tone.' },
    selfCheck: [
      { ja: '3度・7度の位置がすぐに分かった', en: 'I found the 3rds & 7ths quickly' },
      { ja: '半音・全音のなめらかな動きを感じた', en: 'I felt the smooth half/whole-step motion' },
      { ja: 'コードの変わり目を音で表現できた', en: 'My notes expressed the chord changes' },
    ],
  },
  {
    id: 'l4-target',
    courseId: 'ii-v-i-intro',
    title: 'Lesson 4: ターゲットノート',
    titleEn: 'Lesson 4: Target notes',
    theme: '次のコードの3度に着地する',
    themeEn: 'Land on the next chord’s 3rd',
    objective: 'コードが変わったことを、メロディーの中で表現できるようにする。',
    objectiveEn: 'Express the chord change inside the melody itself.',
    explanation:
      '譜面の各小節は「3度→7度→(次のコードの3度への半音アプローチ)」の形です。4拍目の音が次の小節の頭に「吸い込まれる」感覚を確かめてください。着地したら長めに伸ばして、正解の響きを味わいます。',
    explanationEn:
      'Each measure shows 3rd → 7th → a chromatic approach to the NEXT chord’s 3rd. Feel how beat 4 gets pulled into the next downbeat. After landing, hold the note and savor the sound of being right.',
    progressionId: 'ii-V-I',
    contentTab: 'target',
    rules: [
      { ja: 'ターゲットは次のコードの3度', en: 'Target: the next chord’s 3rd' },
      { ja: '1拍目に着地して長めに演奏', en: 'Land on beat 1 and hold' },
      { ja: '着地までの音数は3音以内', en: 'At most 3 notes on the way to each landing' },
    ],
    relax: { ja: '着地音を7度に変えて響きを聴き比べる。', en: 'Try landing on the 7th and compare the color.' },
    selfCheck: [
      { ja: '次のコードの3度を事前に把握できた', en: 'I knew the next 3rd before it arrived' },
      { ja: '1拍目にきちんと着地できた', en: 'I landed cleanly on beat 1' },
      { ja: '着地音の「解決感」を味わえた', en: 'I could taste the resolution of the landing' },
    ],
  },
  {
    id: 'l5-approach',
    courseId: 'ii-v-i-intro',
    title: 'Lesson 5: アプローチ',
    titleEn: 'Lesson 5: Approach notes',
    theme: '半音でターゲットに滑り込む',
    themeEn: 'Slide into targets by half step',
    objective: 'アプローチ音を短く処理し、ターゲットを際立たせる。',
    objectiveEn: 'Keep approaches short so targets shine.',
    explanation:
      '譜面には「半音下から3度へ」「上下から挟んで(エンクロージャー)」の形を表示しています。重要なのは、アプローチ音は短く・弱く、ターゲットは長く・はっきり。最初は1フレーズに1回だけ入れましょう。',
    explanationEn:
      'The staff shows “half step below → 3rd” and enclosures. The key: approach notes short and light, targets long and clear. Use just one approach per phrase at first.',
    progressionId: 'ii-V-I',
    contentTab: 'approach',
    rules: [
      { ja: 'アプローチ音は短く(8分音符以下)', en: 'Approach notes short (8th note or less)' },
      { ja: 'ターゲットはコードトーン(3度か7度)', en: 'Targets are chord tones (3rd or 7th)' },
      { ja: '強拍でアプローチ音を伸ばさない', en: 'Never sustain an approach note on a strong beat' },
      { ja: '1フレーズにアプローチは1回だけ', en: 'One approach per phrase' },
    ],
    relax: { ja: 'エンクロージャー(上下挟み)を1回入れてみる。', en: 'Add one enclosure (above & below).' },
    selfCheck: [
      { ja: 'アプローチ音を短く弾けた', en: 'My approach notes stayed short' },
      { ja: 'ターゲットがはっきり聴こえた', en: 'The targets came through clearly' },
      { ja: '半音の「引力」を感じた', en: 'I felt the chromatic pull' },
    ],
  },
  {
    id: 'l6-rhythm',
    courseId: 'ii-v-i-intro',
    title: 'Lesson 6: リズム',
    titleEn: 'Lesson 6: Rhythm',
    theme: '同じ音でも、リズムでジャズになる',
    themeEn: 'Same notes, jazz rhythm',
    objective: '裏拍と休符を使って、単調さから抜け出す。',
    objectiveEn: 'Escape monotony with upbeats and rests.',
    explanation:
      '譜面は「裏拍だけ」のパターンです。使う音は同じ3音(1・3・5度など)に固定して、(1)裏拍から始める、(2)1拍目を休む、(3)必ず休符を入れる、の3条件でフレーズを作ってください。',
    explanationEn:
      'The staff shows an offbeat-only pattern. Fix your notes to the same three (e.g. 1, 3, 5) and build phrases with: (1) start on an upbeat, (2) rest on beat 1, (3) always include rests.',
    progressionId: 'ii-V-I',
    contentTab: 'chordtones',
    toneRhythm: 'offbeat',
    rules: [
      { ja: '使用音は3音だけに固定', en: 'Lock yourself to the same 3 notes' },
      { ja: '裏拍から始める', en: 'Start on an upbeat' },
      { ja: '1拍目を休む小節を作る', en: 'Make some measures rest on beat 1' },
    ],
    relax: { ja: 'チャールストンのリズム(付点4分+8分)も試す。', en: 'Try the Charleston rhythm too.' },
    selfCheck: [
      { ja: '裏拍から自然に入れた', en: 'I entered naturally on upbeats' },
      { ja: 'リズムが単調にならなかった', en: 'My rhythm didn’t get monotonous' },
      { ja: '休符もフレーズの一部にできた', en: 'Rests became part of my phrases' },
    ],
  },
  {
    id: 'l7-motif',
    courseId: 'ii-v-i-intro',
    title: 'Lesson 7: モチーフ',
    titleEn: 'Lesson 7: Motifs',
    theme: '短い種を育てて4小節をつなぐ',
    themeEn: 'Grow a small seed across four bars',
    objective: '2〜4音のモチーフを繰り返し、少しずつ変化させる。',
    objectiveEn: 'Repeat a 2–4 note motif with small variations.',
    explanation:
      '最初の2小節で短いモチーフ(2〜4音)を作り、次の2小節では「リズムだけ変える」か「最後の音だけ変える」。Cmaj7に入ったら、モチーフの音をコードに合うように1音だけ調整してみましょう。',
    explanationEn:
      'Invent a 2–4 note motif in the first two bars. In the next two, change only its rhythm or its last note. When Cmaj7 arrives, adjust just one note to fit the chord.',
    progressionId: 'ii-V-I',
    contentTab: 'chordtones',
    toneRhythm: 'basic',
    rules: [
      { ja: 'モチーフは2〜4音', en: 'Motif of 2–4 notes' },
      { ja: '繰り返すときに変えるのは1カ所だけ', en: 'Change only one element per repeat' },
      { ja: '4小節をひとまとまりにする', en: 'Shape the four bars as one statement' },
    ],
    relax: { ja: 'モチーフを1オクターブ上に移動して繰り返す。', en: 'Repeat the motif an octave higher.' },
    selfCheck: [
      { ja: 'モチーフを覚えて繰り返せた', en: 'I remembered and repeated my motif' },
      { ja: '変化は1カ所に抑えられた', en: 'I limited changes to one element' },
      { ja: '4小節がひとつの話に聴こえた', en: 'The four bars told one story' },
    ],
  },
  {
    id: 'l8-improvise',
    courseId: 'ii-v-i-intro',
    title: 'Lesson 8: 短いアドリブ',
    titleEn: 'Lesson 8: A short improvisation',
    theme: 'これまでの道具で、8小節を自由に',
    themeEn: 'Eight free bars with all your tools',
    objective: 'コードトーン・着地・休符を組み合わせ、まとまりのある短いソロを演奏する。',
    objectiveEn: 'Combine chord tones, landings and rests into one coherent mini-solo.',
    explanation:
      '仕上げです。進行を2周(8小節)続けて演奏します。1周目は音数少なめ+ガイドトーン中心、2周目はアプローチやモチーフを加えて盛り上げ、最後はIの3度か5度に着地して終わりましょう。譜面はスケール表示にしてあります(着地音はコードトーン)。',
    explanationEn:
      'The finale: play two choruses (8 bars) in a row. Keep chorus 1 sparse and guide-tone based; build chorus 2 with approaches and motifs, then end by landing on the I chord’s 3rd or 5th. The staff shows the scales — land on chord tones.',
    progressionId: 'ii-V-I',
    contentTab: 'scale',
    scaleView: 'scale',
    rules: [
      { ja: '2周続けて演奏(合計8小節)', en: 'Play two choruses in a row (8 bars)' },
      { ja: '1周目は音数少なめ、2周目で展開', en: 'Sparse first chorus, develop in the second' },
      { ja: '最後はIコードのコードトーンに着地', en: 'End on a chord tone of the I chord' },
    ],
    relax: { ja: 'テンポを少し上げるか、別のキーで挑戦。', en: 'Raise the tempo a bit, or try another key.' },
    selfCheck: [
      { ja: 'フォームを見失わなかった', en: 'I never lost the form' },
      { ja: '1周目と2周目で内容を変えられた', en: 'My two choruses differed' },
      { ja: 'ソロとしてまとまりがあった', en: 'It held together as one solo' },
      { ja: '最後にきれいに着地できた', en: 'I landed the ending cleanly' },
    ],
  },
];

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
