// 練習ポイント: 表示中のタブから、いま何を練習すべきかのガイドを返す(日英対応)

import type { Lang } from '../i18n';

export type StaffTab = 'chordtones' | 'guidetones' | 'scale';

export interface PracticeGuide {
  title: string;
  tips: string[];
}

const GUIDES_JA: Record<StaffTab, PracticeGuide> = {
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

const GUIDES_EN: Record<StaffTab, PracticeGuide> = {
  chordtones: {
    title: 'Chord-Tone Practice',
    tips: [
      'Play the 1-3-5-7 of each chord with the selected rhythm pattern. First, learn where the notes live.',
      'Then start each measure on a chord tone and rearrange the order freely.',
      'With the metronome, staying in time matters more than avoiding wrong notes. Changing the rhythm pattern turns the same notes into a new exercise.',
    ],
  },
  guidetones: {
    title: 'Guide-Tone Practice',
    tips: [
      'Play only the 3rd and 7th of each chord with the selected rhythm pattern.',
      'When the chord changes, guide tones move only by a half or whole step. Listen for that smoothness.',
      'This is the backbone of improvising — return here whenever you get lost. Play them on offbeats or a Charleston rhythm and you already sound like jazz.',
    ],
  },
  scale: {
    title: 'Available Notes (Scale) Practice',
    tips: [
      'These are the recommended scales for each chord. Run them up and down until your fingers and ears know them.',
      'Chord tones (1-3-5-7) are landing notes; the rest are passing notes. Check with the degree display.',
      'Running scales isn’t a phrase yet — vary the rhythm, pause, and make it sing.',
    ],
  },
};

export function getPracticeGuide(tab: StaffTab, lang: Lang): PracticeGuide {
  return (lang === 'ja' ? GUIDES_JA : GUIDES_EN)[tab];
}
