// 練習開始前の「今回の練習設定」パネル。
// マイ楽器の設定を初期値として表示し、今回だけの変更ができる。
// 明示的に「マイ楽器に保存」しない限り、基本設定は上書きしない。

import { useState } from 'react';
import type { MyInstrumentSettings } from '../state/storage';
import { GUITAR_POSITIONS, type GuitarPosition } from '../theory/guitar';
import { INSTRUMENTS, getInstrument, notationModesOf, type Clef, type NotationMode } from '../theory/instruments';
import { KEYS } from '../theory/notes';
import { pick, t as tr, type Lang } from '../i18n';

interface Props {
  lang: Lang;
  /** 選択中の練習名(レッスン名・ミッション名など) */
  practiceTitle: string;
  session: MyInstrumentSettings;
  onPatch: (patch: Partial<MyInstrumentSettings>) => void;
  onChangeInstrument: (id: string) => void;
  onSaveBase: () => void;
  keyPc: number;
  setKeyPc: (pc: number) => void;
  bpm: number;
  setBpm: (bpm: number) => void;
  /** true: 確認済み(スリム表示) / false: 確認パネルを表示 */
  confirmed: boolean;
  onConfirm: () => void;
  onEdit: () => void;
}

export function notationLabel(lang: Lang, mode: NotationMode): string {
  const key = mode === 'tab' ? 'notationTab' : mode === 'staff-tab' ? 'notationStaffTab' : 'notationStaff';
  return tr(lang, key);
}

export function positionLabel(lang: Lang, pos: GuitarPosition): string {
  switch (pos) {
    case 'open': return tr(lang, 'posOpen');
    case '3': return tr(lang, 'pos3');
    case '5': return tr(lang, 'pos5');
    case '7': return tr(lang, 'pos7');
    case '9': return tr(lang, 'pos9');
    default: return tr(lang, 'posAuto');
  }
}

export function SessionSetupPanel({
  lang, practiceTitle, session, onPatch, onChangeInstrument, onSaveBase,
  keyPc, setKeyPc, bpm, setBpm, confirmed, onConfirm, onEdit,
}: Props) {
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);
  const [editing, setEditing] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const instrument = getInstrument(session.instrumentId);
  const isGuitar = session.instrumentId === 'guitar';
  const clef: Clef = session.clefOverride && instrument.clefs.includes(session.clefOverride)
    ? session.clefOverride
    : instrument.defaultClef;
  const clefName = clef === 'grand' ? 'Grand Staff' : clef === 'treble' ? 'Treble Clef' : 'Bass Clef';
  const notationText = isGuitar
    ? `${notationLabel(lang, session.notationMode)}${session.notationMode !== 'staff' ? `・${positionLabel(lang, session.guitarPosition)}` : ''}`
    : clefName;

  const saveBase = () => {
    onSaveBase();
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  if (confirmed) {
    return (
      <div className="session-bar">
        <span className="session-bar-text">
          🎷 {t('sessionInstrument')}: <strong>{instrument.label}</strong>
          <span className="session-bar-sub"> — {notationText} / {session.pitchMode === 'written' ? t('written') : t('concert')}</span>
        </span>
        <button className="btn" onClick={onEdit}>{t('changeBtn')}</button>
      </div>
    );
  }

  return (
    <section className="panel session-setup">
      <h2>{t('sessionSetupTitle')}</h2>
      <dl className="session-summary">
        <div><dt>{t('practiceLabel')}</dt><dd>{practiceTitle}</dd></div>
        <div><dt>{t('instrumentLabel')}</dt><dd>{instrument.label}</dd></div>
        <div><dt>{t('notationLabel')}</dt><dd>{notationText}</dd></div>
        <div><dt>{t('displayShort')}</dt><dd>{session.pitchMode === 'written' ? t('written') : t('concert')}</dd></div>
        <div><dt>{t('keyLabel')}</dt><dd>{KEYS.find((k) => k.pc === keyPc)!.name}</dd></div>
        <div><dt>BPM</dt><dd>{bpm}</dd></div>
      </dl>

      {editing && (
        <div className="session-editor">
          <div className="field-row">
            <div className="field">
              <label htmlFor="session-instrument">{t('instrumentLabel')}</label>
              <select id="session-instrument" value={session.instrumentId} onChange={(e) => onChangeInstrument(e.target.value)}>
                {INSTRUMENTS.map((i) => (
                  <option key={i.id} value={i.id}>{i.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t('pitchLabel')}</label>
              <div className="seg-group">
                <button className={`seg${session.pitchMode === 'concert' ? ' on' : ''}`} onClick={() => onPatch({ pitchMode: 'concert' })}>{t('concert')}</button>
                <button className={`seg${session.pitchMode === 'written' ? ' on' : ''}`} onClick={() => onPatch({ pitchMode: 'written' })}>{t('written')}</button>
              </div>
            </div>
          </div>

          {instrument.clefs.length > 1 && (
            <div className="field">
              <label>{t('clefLabel')}</label>
              <div className="seg-group">
                {instrument.clefs.map((c) => (
                  <button key={c} className={`seg${clef === c ? ' on' : ''}`} onClick={() => onPatch({ clefOverride: c })}>
                    {c === 'grand' ? 'Grand' : c === 'treble' ? 'Treble' : 'Bass'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isGuitar && (
            <div className="field">
              <label>{t('notationLabel')}</label>
              <div className="seg-group">
                {notationModesOf(instrument).map((m) => (
                  <button key={m} className={`seg${session.notationMode === m ? ' on' : ''}`} onClick={() => onPatch({ notationMode: m })}>
                    {notationLabel(lang, m)}
                  </button>
                ))}
              </div>
              {session.notationMode !== 'staff' && (
                <div className="sub-field">
                  <label>{t('positionLabel')}</label>
                  <div className="seg-group wrap">
                    {GUITAR_POSITIONS.map((p) => (
                      <button key={p} className={`seg${session.guitarPosition === p ? ' on' : ''}`} onClick={() => onPatch({ guitarPosition: p })}>
                        {positionLabel(lang, p)}
                      </button>
                    ))}
                  </div>
                  <label className="toggle" style={{ marginTop: 8 }}>
                    <input
                      type="checkbox"
                      checked={session.guitarOpenStrings}
                      onChange={(e) => onPatch({ guitarOpenStrings: e.target.checked })}
                    />
                    {t('openStringsLabel')}
                  </label>
                  <p className="hint-text">{t('tuningLabel')}: {t('tuningStandard')}</p>
                </div>
              )}
            </div>
          )}

          <div className="field-row">
            <div className="field">
              <label htmlFor="session-key">{t('keyLabel')}</label>
              <select id="session-key" value={keyPc} onChange={(e) => setKeyPc(Number(e.target.value))}>
                {KEYS.map((k) => (
                  <option key={k.pc} value={k.pc}>{k.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="session-bpm">{t('tempoLabel')}: <strong>{bpm} BPM</strong></label>
              <input id="session-bpm" type="range" min={40} max={220} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
            </div>
          </div>

          <button className="btn" onClick={saveBase}>{t('saveAsMyInstrument')}</button>
          {savedFlash && <span className="saved-note"> ✓ {t('resultSaved')}</span>}
        </div>
      )}

      <div className="session-actions">
        <button className="btn big start" onClick={onConfirm}>▶ {t('startWithThis')}</button>
        <button className="btn" onClick={() => setEditing(!editing)}>{editing ? '▲' : '▼'} {t('changeSettings')}</button>
      </div>
      <p className="hint-text">{pick(lang, 'ここでの変更は今回の練習だけに使われ、マイ楽器は上書きされません。', 'Changes here apply to this session only — they won’t overwrite My Instrument.')}</p>
    </section>
  );
}
