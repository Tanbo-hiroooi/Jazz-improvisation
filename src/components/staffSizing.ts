// 譜面に割り当てられる高さ
// 「画面に空きがあるのに、演奏しながら譜面をスクロールする」状態を避けるため、
// 譜面はこの高さに収まるまで自動で縮める(StaffView の fitHeight)。

/**
 * 通常表示は画面の高さから、全画面はflexで確定したカードから求める。
 * 見出しの折り返しとカードのpaddingも実測して差し引く。
 */
export function staffBoxHeight(container: HTMLElement): number {
  const card = container.parentElement;
  const style = card ? getComputedStyle(card) : null;
  const padding = style ? parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) : 16;
  if (card?.closest('.focus-stage')) return Math.max(1, card.clientHeight - padding);
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const narrow = window.innerWidth <= 640;
  const cap = narrow
    ? Math.min(viewportHeight * 0.62, 520)
    : Math.min(viewportHeight * 0.78, 760);
  const heading = card?.closest('.staff-sticky')?.querySelector('.staff-head');
  const headingHeight = heading ? heading.getBoundingClientRect().height + 10 : 0;
  return Math.max(1, cap - headingHeight - padding - 8);
}
