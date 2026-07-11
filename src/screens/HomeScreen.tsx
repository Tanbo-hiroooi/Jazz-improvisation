// ホーム画面: 自由練習 / 練習コース / 曲で実践 の3区分+履歴・楽器設定

import { PracticeLogPanel } from '../components/PracticeLogPanel';
import { INSTRUMENTS, getInstrument, type PitchMode } from '../theory/instruments';
import { pick, t as tr, type Lang } from '../i18n';
import type { Screen } from '../App';

interface Props {
  lang: Lang;
  onNavigate: (screen: Screen) => void;
  lastScreen: Screen | null;
  instrumentId: string;
  setInstrumentId: (id: string) => void;
  pitchMode: PitchMode;
  setPitchMode: (m: PitchMode) => void;
}

export function HomeScreen({ lang, onNavigate, lastScreen, instrumentId, setInstrumentId, pitchMode, setPitchMode }: Props) {
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);
  const instrument = getInstrument(instrumentId);

  const cards: { screen: Screen; icon: string; title: string; desc: string }[] = [
    { screen: 'free', icon: '🎯', title: t('homeFreeTitle'), desc: t('homeFreeDesc') },
    { screen: 'course', icon: '🪜', title: t('homeCourseTitle'), desc: t('homeCourseDesc') },
    { screen: 'song', icon: '🎷', title: t('homeSongTitle'), desc: t('homeSongDesc') },
  ];

  return (
    <main className="home">
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
        <h2>{t('homeSettings')}</h2>
        <div className="field-row">
          <div className="field">
            <label htmlFor="home-instrument">{t('instrumentLabel')}</label>
            <select id="home-instrument" value={instrumentId} onChange={(e) => setInstrumentId(e.target.value)}>
              {INSTRUMENTS.map((i) => (
                <option key={i.id} value={i.id}>{i.label}</option>
              ))}
            </select>
            <p className="hint-text">{pick(lang, instrument.transposeLabel, instrument.transposeLabelEn)}</p>
          </div>
          <div className="field">
            <label>{t('pitchLabel')}</label>
            <div className="seg-group">
              <button className={`seg${pitchMode === 'concert' ? ' on' : ''}`} onClick={() => setPitchMode('concert')}>{t('concert')}</button>
              <button className={`seg${pitchMode === 'written' ? ' on' : ''}`} onClick={() => setPitchMode('written')}>{t('written')}</button>
            </div>
          </div>
        </div>
      </section>

      <PracticeLogPanel lang={lang} />
    </main>
  );
}
