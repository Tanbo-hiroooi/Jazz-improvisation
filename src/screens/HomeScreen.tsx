// ホーム画面: ブランド表示 / 3区分カード / マイ楽器(基本設定) / 練習履歴

import { useState } from 'react';
import { PracticeLogPanel } from '../components/PracticeLogPanel';
import { notationLabel, positionLabel } from '../components/SessionSetupPanel';
import type { MyInstrumentSettings } from '../state/storage';
import { GUITAR_POSITIONS } from '../theory/guitar';
import { INSTRUMENTS, getInstrument, notationModesOf, type Clef } from '../theory/instruments';
import { pick, t as tr, type Lang } from '../i18n';
import type { Screen } from '../App';

interface Props {
  lang: Lang;
  onNavigate: (screen: Screen) => void;
  lastScreen: Screen | null;
  session: MyInstrumentSettings;
  /** マイ楽器(基本設定)の更新: 保存され、セッションにも反映される */
  onUpdateBase: (patch: Partial<MyInstrumentSettings>) => void;
  onChangeBaseInstrument: (id: string) => void;
}

export function HomeScreen({ lang, onNavigate, lastScreen, session, onUpdateBase, onChangeBaseInstrument }: Props) {
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);
  const [editing, setEditing] = useState(false);

  const instrument = getInstrument(session.instrumentId);
  const isGuitar = session.instrumentId === 'guitar';
  const clef: Clef = session.clefOverride && instrument.clefs.includes(session.clefOverride)
    ? session.clefOverride
    : instrument.defaultClef;
  const clefName = clef === 'grand' ? 'Grand Staff' : clef === 'treble' ? 'Treble Clef' : 'Bass Clef';
  const summary = [
    pick(lang, instrument.transposeLabel, instrument.transposeLabelEn),
    isGuitar ? notationLabel(lang, session.notationMode) : clefName,
    session.pitchMode === 'written' ? t('written') : t('concert'),
  ].join('・');

  const cards: { screen: Screen; icon: string; title: string; desc: string }[] = [
    { screen: 'free', icon: '🎯', title: t('homeFreeTitle'), desc: t('homeFreeDesc') },
    { screen: 'course', icon: '🪜', title: t('homeCourseTitle'), desc: t('homeCourseDesc') },
    { screen: 'song', icon: '🎷', title: t('homeSongTitle'), desc: t('homeSongDesc') },
  ];

  return (
    <main className="home">
      <div className="home-hero">
        <span className="home-hero-title">First Chorus</span>
        <span className="home-hero-sub">{t('appSubtitle')}</span>
        <span className="home-hero-catch">{t('appCatch')}</span>
      </div>

      <div className="home-cards">
        {cards.map((c) => (
          <button key={c.screen} className="home-card" onClick={() => onNavigate(c.screen)}>
            <span className="home-card-icon">{c.icon}</span>
            <span className="home-card-title">{c.title}</span>
            <span className="home-card-desc">{c.desc}</span>
          </button>
        ))}
      </div>

      {lastScreen && lastScreen !== 'home' && (
        <button className="btn continue-btn" onClick={() => onNavigate(lastScreen)}>
          ▶ {t('homeContinue')}
        </button>
      )}

      <section className="panel">
        <h2>{t('myInstrument')}</h2>
        <div className="my-instrument-row">
          <div className="my-instrument-summary">
            <strong>{instrument.label}</strong>
            <span className="hint-text">{summary}</span>
          </div>
          <button className="btn" onClick={() => setEditing(!editing)}>{editing ? '▲' : ''} {t('changeBtn')}</button>
        </div>

        {editing && (
          <div className="session-editor">
            <div className="field-row">
              <div className="field">
                <label htmlFor="home-instrument">{t('instrumentLabel')}</label>
                <select id="home-instrument" value={session.instrumentId} onChange={(e) => onChangeBaseInstrument(e.target.value)}>
                  {INSTRUMENTS.map((i) => (
                    <option key={i.id} value={i.id}>{i.label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>{t('pitchLabel')}</label>
                <div className="seg-group">
                  <button className={`seg${session.pitchMode === 'concert' ? ' on' : ''}`} onClick={() => onUpdateBase({ pitchMode: 'concert' })}>{t('concert')}</button>
                  <button className={`seg${session.pitchMode === 'written' ? ' on' : ''}`} onClick={() => onUpdateBase({ pitchMode: 'written' })}>{t('written')}</button>
                </div>
              </div>
            </div>

            {instrument.clefs.length > 1 && (
              <div className="field">
                <label>{t('clefLabel')}</label>
                <div className="seg-group">
                  {instrument.clefs.map((c) => (
                    <button key={c} className={`seg${clef === c ? ' on' : ''}`} onClick={() => onUpdateBase({ clefOverride: c })}>
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
                    <button key={m} className={`seg${session.notationMode === m ? ' on' : ''}`} onClick={() => onUpdateBase({ notationMode: m })}>
                      {notationLabel(lang, m)}
                    </button>
                  ))}
                </div>
                {session.notationMode !== 'staff' && (
                  <div className="sub-field">
                    <label>{t('positionLabel')}</label>
                    <div className="seg-group wrap">
                      {GUITAR_POSITIONS.map((p) => (
                        <button key={p} className={`seg${session.guitarPosition === p ? ' on' : ''}`} onClick={() => onUpdateBase({ guitarPosition: p })}>
                          {positionLabel(lang, p)}
                        </button>
                      ))}
                    </div>
                    <label className="toggle" style={{ marginTop: 8 }}>
                      <input
                        type="checkbox"
                        checked={session.guitarOpenStrings}
                        onChange={(e) => onUpdateBase({ guitarOpenStrings: e.target.checked })}
                      />
                      {t('openStringsLabel')}
                    </label>
                    <p className="hint-text">{t('tuningLabel')}: {t('tuningStandard')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <PracticeLogPanel lang={lang} />
    </main>
  );
}
