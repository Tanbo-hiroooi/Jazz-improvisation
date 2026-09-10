// 集中モード: 譜面と再生ボタンだけを全画面に出す
// 練習(演奏)する段階では説明・設定・入力グリッドを隠し、譜面を画面いっぱいに使う。

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { t as tr, type Lang } from '../i18n';

interface Props {
  lang: Lang;
  /** 上部に1行だけ出す「いまやること」 */
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function FocusStage({ lang, title, onClose, children }: Props) {
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const root = document.getElementById('root');
    const wasInert = root?.inert ?? false;
    if (root) root.inert = true;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onCloseRef.current(); }
      if (e.key !== 'Tab') return;
      const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button, input, select, summary, [tabindex="0"]') ?? [])]
        .filter(el => !el.matches(':disabled') && el.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        e.preventDefault(); last?.focus();
      } else if (!e.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
        e.preventDefault(); first?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    // 背面のページはスクロールさせない
    document.body.classList.add('focus-open');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('focus-open');
      if (root) root.inert = wasInert;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div ref={dialogRef} tabIndex={-1} className="focus-stage" role="dialog" aria-modal="true" aria-label={t('focusTitle')}>
      <div className="focus-stage-head">
        <p className="focus-stage-title">{title}</p>
        <button className="btn tiny" onClick={onClose}>✕ {t('focusExit')}</button>
      </div>
      {children}
    </div>,
    document.body,
  );
}
