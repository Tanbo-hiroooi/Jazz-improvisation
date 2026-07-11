// アプリシェル: ホーム / 自由練習 / 練習コース / 曲で実践 の画面切替と共通設定

import { useCallback, useState } from 'react';
import { CourseScreen } from './screens/CourseScreen';
import { FreePracticeScreen } from './screens/FreePracticeScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SongPracticeScreen } from './screens/SongPracticeScreen';
import { loadJSON, saveJSON, STORAGE_KEYS } from './state/storage';
import type { Clef, PitchMode } from './theory/instruments';
import { loadLang, saveLang, t as tr, type Lang } from './i18n';
import './styles.css';

export type Screen = 'home' | 'free' | 'course' | 'song';

const SCREEN_TITLES: Record<Exclude<Screen, 'home'>, Parameters<typeof tr>[1]> = {
  free: 'homeFreeTitle',
  course: 'homeCourseTitle',
  song: 'homeSongTitle',
};

export default function App() {
  // ---- 表示言語 ----
  const [lang, setLang] = useState<Lang>(loadLang);
  const t = useCallback((key: Parameters<typeof tr>[1]) => tr(lang, key), [lang]);
  const changeLang = (l: Lang) => {
    setLang(l);
    saveLang(l);
  };

  // ---- 画面切替 ----
  const [screen, setScreen] = useState<Screen>('home');
  const [lastScreen, setLastScreen] = useState<Screen | null>(() => loadJSON<Screen | null>(STORAGE_KEYS.lastScreen, null));
  const navigate = (s: Screen) => {
    setScreen(s);
    if (s !== 'home') {
      setLastScreen(s);
      saveJSON(STORAGE_KEYS.lastScreen, s);
    }
  };

  // ---- 楽器などの共通設定(全画面で共有) ----
  const [instrumentId, setInstrumentId] = useState('piano');
  const [clefOverride, setClefOverride] = useState<Clef | null>(null);
  const [pitchMode, setPitchMode] = useState<PitchMode>('concert');

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-row">
          <div className="app-title-row">
            {screen !== 'home' && (
              <button className="btn back-btn" onClick={() => navigate('home')}>← {t('backToHome')}</button>
            )}
            <h1>Jazz Phrase Lab</h1>
            {screen !== 'home' && <span className="key-badge screen-badge">{t(SCREEN_TITLES[screen])}</span>}
          </div>
          <div className="seg-group lang-toggle">
            <button className={`seg${lang === 'ja' ? ' on' : ''}`} onClick={() => changeLang('ja')}>日本語</button>
            <button className={`seg${lang === 'en' ? ' on' : ''}`} onClick={() => changeLang('en')}>English</button>
          </div>
        </div>
        {screen === 'home' && <p className="tagline">{t('tagline')}</p>}
      </header>

      {screen === 'home' && (
        <HomeScreen
          lang={lang}
          onNavigate={navigate}
          lastScreen={lastScreen}
          instrumentId={instrumentId}
          setInstrumentId={setInstrumentId}
          pitchMode={pitchMode}
          setPitchMode={setPitchMode}
        />
      )}
      {screen === 'free' && (
        <FreePracticeScreen
          lang={lang}
          instrumentId={instrumentId}
          setInstrumentId={setInstrumentId}
          clefOverride={clefOverride}
          setClefOverride={setClefOverride}
          pitchMode={pitchMode}
          setPitchMode={setPitchMode}
        />
      )}
      {screen === 'course' && (
        <CourseScreen lang={lang} instrumentId={instrumentId} clefOverride={clefOverride} pitchMode={pitchMode} />
      )}
      {screen === 'song' && (
        <SongPracticeScreen lang={lang} instrumentId={instrumentId} clefOverride={clefOverride} pitchMode={pitchMode} />
      )}

      <footer className="app-footer">
        <p>{t('footer')}</p>
      </footer>
    </div>
  );
}
