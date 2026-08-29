// 「フレーズを作る」で作った譜面の保存・読み込み。
// 進行やキーごと保存するため、状態を持つ FreePracticeScreen から使う。

import { useState } from 'react';
import type { SavedPhrase } from '../state/savedPhrases';
import { addSavedPhrase, loadSavedPhrases, removeSavedPhrase } from '../state/savedPhrases';
import { attackCount, type GridPhrase } from '../theory/grid';
import { KEYS } from '../theory/notes';
import { getProgression } from '../theory/progressions';
import { pick, t as tr, type Lang } from '../i18n';

interface Props {
  lang: Lang;
  /** いま編集中のフレーズ(保存対象) */
  phrase: GridPhrase;
  /** 保存時に添える設定。進行名は既定の名前づけにも使う */
  snapshot: Omit<SavedPhrase, 'id' | 'name' | 'savedAt' | 'phrase'>;
  progressionLabel: string;
  keyName: string;
  materialLabel: string;
  onLoad: (saved: SavedPhrase) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SavedPhrasesPanel({
  lang, phrase, snapshot, progressionLabel, keyName, materialLabel, onLoad,
}: Props) {
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);
  const [list, setList] = useState<SavedPhrase[]>(loadSavedPhrases);
  const [name, setName] = useState('');
  const [flash, setFlash] = useState(false);

  /** 一覧で見分けられるよう、保存した進行・キー・小節数を1行にまとめる */
  const describe = (p: SavedPhrase) => {
    const prog = p.menuId === 'custom'
      ? t('customBadge')
      : pick(lang, getProgression(p.menuId).label, getProgression(p.menuId).labelEn);
    const key = p.menuId === 'custom' ? '' : ` / ${KEYS.find((k) => k.pc === p.keyPc)?.name ?? ''}`;
    return `${prog}${key} / ${p.bars}${t('measuresUnit')}`;
  };

  const notes = attackCount(phrase);
  const canSave = notes > 0;

  const defaultName = () => {
    const d = new Date();
    return `${progressionLabel} ${snapshot.bars}${t('measuresUnit')} ${d.getMonth() + 1}/${d.getDate()}`;
  };

  const save = () => {
    if (!canSave) return;
    setList(addSavedPhrase({ ...snapshot, name: name.trim() || defaultName(), phrase }));
    setName('');
    setFlash(true);
    setTimeout(() => setFlash(false), 2000);
  };

  const load = (p: SavedPhrase) => {
    // 編集中に音があるときだけ確認する(空なら失うものがない)
    if (notes > 0 && !window.confirm(t('loadPhraseConfirm'))) return;
    onLoad(p);
  };

  const remove = (p: SavedPhrase) => {
    if (!window.confirm(t('deletePhraseConfirm'))) return;
    setList(removeSavedPhrase(p.id));
  };

  return (
    <section className="panel saved-phrases">
      <h2>💾 {t('savedPhrasesTitle')} {list.length > 0 && <span className="key-badge">{list.length}</span>}</h2>

      <div className="saved-save-row">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={defaultName()}
          aria-label={t('savePhraseNameLabel')}
        />
        <button className="btn primary" onClick={save} disabled={!canSave}>{t('savePhraseBtn')}</button>
      </div>
      {!canSave && <p className="hint-text">{t('savePhraseEmpty')}</p>}
      {flash && <p className="hint-text saved-note" role="status">✓ {t('resultSaved')}</p>}
      <p className="hint-text">{t('savedPhraseHint')}</p>

      {list.length === 0 ? (
        <p className="hint-text">{t('savedListEmpty')}</p>
      ) : (
        <ul className="saved-list">
          {list.map((p) => (
            <li key={p.id} className="saved-item">
              <div className="saved-item-body">
                <strong>{p.name}</strong>
                <span className="hint-text">
                  {describe(p)} ・ {formatDate(p.savedAt)}
                </span>
              </div>
              <div className="saved-item-actions">
                <button className="btn tiny" onClick={() => load(p)}>{t('loadPhraseBtn')}</button>
                <button className="btn tiny danger" onClick={() => remove(p)}>{t('deletePhraseBtn')}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="hint-text">
        {pick(lang, '現在の設定', 'Current')}: {progressionLabel} / {keyName} / {materialLabel} / {snapshot.bars}{t('measuresUnit')}
      </p>
    </section>
  );
}
