// 集中モード: 譜面と再生ボタンだけを全画面に出す
// 練習(演奏)する段階では説明・設定・入力グリッドを隠し、譜面を画面いっぱいに使う。

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { t as tr, type Lang } from '../i18n';

interface Props {
  lang: Lang;
  /** 上部に1行だけ出す「いまやること」 */
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * 集中モードで譜面に使える高さ。
 * 見出し(28px)+再生ボタン(53px)+オプション(56px)+余白 の実測から約190pxを引く。
 */
export function focusFitHeight(): number {
  return Math.max(180, window.innerHeight - 190);
}

export function FocusStage({ lang, title, onClose, children }: Props) {
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    // 背面のページはスクロールさせない
    document.body.classList.add('focus-open');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('focus-open');
    };
  }, [onClose]);

  return createPortal(
    <div className="focus-stage" role="dialog" aria-modal="true" aria-label={t('focusTitle')}>
      <div className="focus-stage-head">
        <p className="focus-stage-title">{title}</p>
        <button className="btn tiny" onClick={onClose}>✕ {t('focusExit')}</button>
      </div>
      {children}
    </div>,
    document.body,
  );
}
