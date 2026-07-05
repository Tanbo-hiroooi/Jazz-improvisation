// スウィング設定(リズムパターンの再生に適用)

/** スウィングの強さ: ウラ拍(8分)を何拍ぶん遅らせるか */
export interface SwingOption {
  id: string;
  label: string;
  offset: number;
}

export const SWING_OPTIONS: SwingOption[] = [
  { id: 'none', label: 'なし', offset: 0 },
  { id: 'light', label: '軽め', offset: 0.09 },
  { id: 'standard', label: '標準(三連)', offset: 1 / 6 },
  { id: 'hard', label: '強め', offset: 0.25 },
];
