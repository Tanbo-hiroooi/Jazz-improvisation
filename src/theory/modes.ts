// 練習ポイント: 表示中のタブと難易度から、いま何を練習すべきかのガイドを返す
// (以前は独立した「練習モード」セレクタだったが、タブと重複するため統合)

import type { Difficulty } from './phrases';

export type StaffTab = 'phrase' | 'chordtones' | 'guidetones' | 'scale';

export interface PracticeGuide {
  title: string;
  tips: string[];
}

const CHORD_TONE_GUIDE: PracticeGuide = {
  title: 'コードトーン練習',
  tips: [
    '各コードの1-3-5-7を上行・下行で演奏。まず「どこに音があるか」を体で覚えます。',
    '次に、小節の頭をコードトーンで始めて、自由な順番で並べ替えてみましょう。',
    'メトロノームに合わせて、音を外さないことより「拍に乗る」ことを優先。',
  ],
};

const GUIDE_TONE_GUIDE: PracticeGuide = {
  title: 'ガイドトーン練習',
  tips: [
    '各コードの3度と7度だけを2分音符で吹いて(弾いて)みましょう。',
    'コードが変わるとき、ガイドトーンは半音か全音しか動きません。そのなめらかさを耳で確認。',
    '慣れたら3度スタートと7度スタートの両方を試しましょう。迷ったらここに帰るのがアドリブの背骨です。',
  ],
};

const SCALE_GUIDE: PracticeGuide = {
  title: '使える音(スケール)練習',
  tips: [
    '各コードで使えるおすすめスケールです。まず上下に往復して、指と耳に馴染ませましょう。',
    'コードトーン(1-3-5-7)は「着地する音」、それ以外は「通り道の音」。度数表示で確認を。',
    'スケールをなぞるだけではフレーズになりません。リズムを変えたり途中で止まったり、歌うように。',
  ],
};

const PHRASE_GUIDES: Record<Difficulty, PracticeGuide> = {
  beginner: {
    title: '見本を真似する(入門)',
    tips: [
      '見本を聴く→歌う→楽器で真似る、の順で。譜面は答え合わせに使いましょう。',
      '小節の頭の音(コードトーン)を外さないことを最優先に。',
      '1小節ループで1小節ずつ攻略してから、進行全体を通すと定着が早いです。',
    ],
  },
  guide: {
    title: 'ガイドトーンでつなぐ',
    tips: [
      '3度と7度だけのシンプルなライン。音数が少ないぶん、音色とタイム感に集中できます。',
      'コードの変わり目で音がどこへ動いたか、耳で追いかけましょう。',
      '慣れたら前後に飾りの音を1つずつ足して、自分のフレーズに育てます。',
    ],
  },
  rhythm: {
    title: 'リズムで遊ぶ',
    tips: [
      '「Rhythm Only」でリズムだけを聴き、同じリズムを1音だけで再現してみましょう。',
      '「リズム違い」ボタンでパターンを切り替えて、リズムの引き出しを増やします。',
      'ウラ拍から始まるフレーズを恐れないこと。休符もフレーズの一部です。',
    ],
  },
  melodic: {
    title: 'アプローチノートを効かせる',
    tips: [
      'ターゲット(3度)の半音下から入る音に注目して見本を聴きましょう。「度数」表示が便利です。',
      '2小節ループにして、1小節目は見本、2小節目は自分の返事(コール&レスポンス)。',
      '見本の最初の1小節だけ覚えて、次の小節で少し変えて繰り返すのがモチーフ展開の第一歩。',
    ],
  },
  advanced: {
    title: 'ジャズの語彙を盗む(上級)',
    tips: [
      '気に入ったフレーズを丸ごと暗記して、12キー全部で弾けるようにしましょう。',
      '「別メロディー」ボタンで同じリズムの別ラインと比較すると、音選びの意図が見えてきます。',
      '仕上げはStartボタンだけ(コード音+メトロノーム)で自由にアドリブ。迷ったらガイドトーンへ。',
    ],
  },
};

export function getPracticeGuide(tab: StaffTab, difficulty: Difficulty): PracticeGuide {
  switch (tab) {
    case 'chordtones': return CHORD_TONE_GUIDE;
    case 'guidetones': return GUIDE_TONE_GUIDE;
    case 'scale': return SCALE_GUIDE;
    case 'phrase': return PHRASE_GUIDES[difficulty];
  }
}
