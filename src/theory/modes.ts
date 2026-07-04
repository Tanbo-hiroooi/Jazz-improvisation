// 練習モードの定義: それぞれ推奨の表示タブ・難易度・練習ポイントを持つ

import type { Difficulty } from './phrases';

export type StaffTab = 'phrase' | 'chordtones' | 'guidetones' | 'scale';

export interface PracticeMode {
  id: string;
  label: string;
  tab: StaffTab;
  difficulty: Difficulty;
  tips: string[];
}

export const PRACTICE_MODES: PracticeMode[] = [
  {
    id: 'guide-tone-line',
    label: 'ガイドトーンライン',
    tab: 'guidetones',
    difficulty: 'guide',
    tips: [
      '各コードの3度と7度だけを全音符・2分音符で吹いて(弾いて)みましょう。',
      'コードが変わるとき、ガイドトーンは半音か全音しか動きません。そのなめらかさを耳で確認。',
      '慣れたら3度スタートと7度スタートの両方を試しましょう。',
    ],
  },
  {
    id: 'chord-tone-phrase',
    label: 'コードトーンフレーズ',
    tab: 'chordtones',
    difficulty: 'beginner',
    tips: [
      '各コードの1-3-5-7を上行・下行で演奏。まず「どこに音があるか」を体で覚えます。',
      '次に、小節の頭をコードトーンで始めて、自由な順番で並べ替えてみましょう。',
      'メトロノームに合わせて、音を外さないことより「拍に乗る」ことを優先。',
    ],
  },
  {
    id: 'rhythm-variation',
    label: 'リズムバリエーション',
    tab: 'phrase',
    difficulty: 'rhythm',
    tips: [
      '「Rhythm Only」でリズムだけを聴き、同じリズムを1音(ルート)だけで再現。',
      '「リズム違い」ボタンで別パターンに切り替えて、リズムの引き出しを増やします。',
      'ウラ拍から始まるフレーズを恐れないこと。休符もフレーズの一部です。',
    ],
  },
  {
    id: 'motif-development',
    label: 'モチーフ展開',
    tab: 'phrase',
    difficulty: 'melodic',
    tips: [
      '見本の最初の1小節(モチーフ)だけ覚えて、次の小節で少し変えて繰り返しましょう。',
      '「別メロディー」ボタンは同じリズムのまま音を変えた例です。モチーフ展開のヒントに。',
      '1小節ループで同じモチーフを音を1つずつ変えながら回すのが効果的。',
    ],
  },
  {
    id: 'approach-notes',
    label: 'アプローチノート',
    tab: 'phrase',
    difficulty: 'melodic',
    tips: [
      'ターゲット(3度)の半音下から入る音を意識して見本を聴きましょう。',
      '「度数」表示にすると、どの音がコードトーンで、どの音がアプローチ音か分かります。',
      '自分でも「半音下→ターゲット」を色々なコードトーンで試してみましょう。',
    ],
  },
  {
    id: 'call-response',
    label: 'コール&レスポンス',
    tab: 'phrase',
    difficulty: 'rhythm',
    tips: [
      '2小節ループにして、最初の1小節は見本を聴き、次の1小節で自分が「返事」します。',
      '返事は見本の真似でOK。慣れたらリズムだけ真似して音を変えてみましょう。',
      '間違えても止まらない。ループに乗り続けることが一番の練習です。',
    ],
  },
  {
    id: 'free-improvisation',
    label: '自由アドリブ',
    tab: 'phrase',
    difficulty: 'advanced',
    tips: [
      'メトロノーム+コード音だけで(Startボタン)、自由にアドリブしてみましょう。',
      '迷ったらガイドトーン(3度・7度)に帰る。それだけで「ジャズの音」になります。',
      '弾けたフレーズより「歌えたフレーズ」を大事に。録音しなくても、練習ログにメモを。',
    ],
  },
];
