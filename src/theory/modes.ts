// 練習ポイント: 表示中のタブから、いま何を練習すべきかのガイドを返す(日英対応)

import type { Lang } from '../i18n';

export type StaffTab = 'chordtones' | 'guidetones' | 'approach' | 'target' | 'scale';

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
  approach: {
    title: 'アプローチノート練習',
    tips: [
      '半音下や上下から「挟んで」コードトーンに入る動きです。装飾の音は軽く、ターゲットをはっきり。',
      '度数表示にすると、どれが飾り(半音)でどれが着地(3度・5度・7度)か一目で分かります。',
      'このエンクロージャーこそ、音階なぞりを「ジャズの線」に変える核心技術。全キーで体に入れましょう。',
    ],
  },
  target: {
    title: 'ターゲット(着地)練習',
    tips: [
      '4拍目の音は「次のコードの3度への半音アプローチ」。小節線を越えて着地する瞬間を意識します。',
      'コードが変わる瞬間に正しい音に居ること — これがコード感のあるアドリブの正体です。',
      '慣れたら前半を自由に弾き、4拍目のアプローチ→次の頭の着地だけ守ってみましょう。',
    ],
  },
  scale: {
    title: 'スケール(音階)練習',
    tips: [
      '各コードで使えるおすすめスケールです。まず上下に往復して、指と耳に馴染ませましょう。',
      'コードトーン(1-3-5-7)は「着地する音」、それ以外は「通り道の音」。度数表示で確認を。',
      '「テンション」表示に切り替えると、9th・11th・13thなどの彩りの音を確認できます。着地に混ぜると一気に大人の響きに。',
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
  approach: {
    title: 'Approach-Note Practice',
    tips: [
      'Slide into chord tones from a half step below, or enclose them from above and below. Keep the ornaments light; make the target clear.',
      'Turn on the degree display to see which notes are decorations (half steps) and which are landings (3rd, 5th, 7th).',
      'Enclosures are the core technique that turns scale-running into jazz lines. Learn them in every key.',
    ],
  },
  target: {
    title: 'Target-Note (Landing) Practice',
    tips: [
      'The note on beat 4 is a half-step approach to the NEXT chord’s 3rd. Feel the landing across the barline.',
      'Being on the right note at the moment the chord changes — that is what “playing the changes” means.',
      'Once comfortable, improvise freely for the first half of the bar and keep only the beat-4 approach and downbeat landing.',
    ],
  },
  scale: {
    title: 'Scale Practice',
    tips: [
      'These are the recommended scales for each chord. Run them up and down until your fingers and ears know them.',
      'Chord tones (1-3-5-7) are landing notes; the rest are passing notes. Check with the degree display.',
      'Switch to the Tensions view to see the color notes (9th, 11th, 13th). Mixing them into your landings instantly sounds more sophisticated.',
    ],
  },
};

export function getPracticeGuide(tab: StaffTab, lang: Lang): PracticeGuide {
  return (lang === 'ja' ? GUIDES_JA : GUIDES_EN)[tab];
}
