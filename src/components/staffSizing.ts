// 譜面に割り当てられる高さ
// 「画面に空きがあるのに、演奏しながら譜面をスクロールする」状態を避けるため、
// 譜面はこの高さに収まるまで自動で縮める(StaffView の fitHeight)。

/** 集中モード: 見出し・再生ボタン・オプションのぶんを引いた残り */
export function focusFitHeight(): number {
  return Math.max(180, window.innerHeight - 190);
}

/**
 * 通常表示で譜面に与えている高さ。styles.css の `.staff-sticky` の max-height と対応させること
 * (デスクトップ min(78vh, 760px) / 640px以下 min(62vh, 520px))。見出しのぶんを引く。
 */
export function staffBoxHeight(): number {
  const narrow = window.innerWidth <= 640;
  const cap = narrow
    ? Math.min(window.innerHeight * 0.62, 520)
    : Math.min(window.innerHeight * 0.78, 760);
  return Math.max(180, Math.round(cap - 46));
}
