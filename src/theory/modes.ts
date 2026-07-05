// 練習ポイント: 表示中のタブから、いま何を練習すべきかのガイドを返す

export type StaffTab = 'chordtones' | 'guidetones' | 'scale';

export interface PracticeGuide {
  title: string;
  tips: string[];
}

const GUIDES: Record<StaffTab, PracticeGuide> = {
  chordtones: {
    title: 'コードトーン練習',
    tips: [
      '各コードの1-3-5-7を、選んだリズムパターンで演奏。まず「どこに音があるか」を体で覚えます。',
      '次に、小節の頭をコードトーンで始めて、自由な順番で並べ替えてみましょう。',
      'メトロノームに合わせて、音を外さないことより「拍に乗る」ことを優先。リズムパターンを変えると同じ音でも別の練習になります。',
    ],
  },
  guidetones: {
    title: 'ガイドトーン練習',
    tips: [
      '各コードの3度と7度だけを、選んだリズムパターンで吹いて(弾いて)みましょう。',
      'コードが変わるとき、ガイドトーンは半音か全音しか動きません。そのなめらかさを耳で確認。',
      '迷ったらここに帰るのがアドリブの背骨です。裏拍やチャールストンのリズムで弾ければ、もうジャズの音になっています。',
    ],
  },
  scale: {
    title: '使える音(スケール)練習',
    tips: [
      '各コードで使えるおすすめスケールです。まず上下に往復して、指と耳に馴染ませましょう。',
      'コードトーン(1-3-5-7)は「着地する音」、それ以外は「通り道の音」。度数表示で確認を。',
      'スケールをなぞるだけではフレーズになりません。リズムを変えたり途中で止まったり、歌うように。',
    ],
  },
};

export function getPracticeGuide(tab: StaffTab): PracticeGuide {
  return GUIDES[tab];
}
