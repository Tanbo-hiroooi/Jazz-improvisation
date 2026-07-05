// スウィング設定(リズムパターンの再生に適用)

/** スウィングの強さ: ウラ拍(8分)を何拍ぶん遅らせるか */
export interface SwingOption {
  id: string;
  label: string;
  labelEn: string;
  offset: number;
}

export const SWING_OPTIONS: SwingOption[] = [
  { id: 'none', label: 'なし', labelEn: 'None', offset: 0 },
  { id: 'light', label: '軽め', labelEn: 'Light', offset: 0.09 },
  { id: 'standard', label: '標準(三連)', labelEn: 'Standard (triplet)', offset: 1 / 6 },
  { id: 'hard', label: '強め', labelEn: 'Hard', offset: 0.25 },
];
