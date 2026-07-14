// アプリシェル: ホーム / 自由練習 / 練習コース / 曲で実践 の画面切替と共通設定

import { useCallback, useState } from 'react';
import { CourseScreen } from './screens/CourseScreen';
import { FreePracticeScreen, type FreePracticeInit } from './screens/FreePracticeScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SongPracticeScreen } from './screens/SongPracticeScreen';
import { loadJSON, saveJSON, loadMyInstrument, saveMyInstrument, STORAGE_KEYS, type MyInstrumentSettings } from './state/storage';
import { defaultNotationOf, getInstrument } from './theory/instruments';
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
  // コースで選択中のレッスン(自由練習で復習→戻る、のために App が保持)
  const [courseLessonId, setCourseLessonId] = useState<string | null>(null);
  // レッスンから自由練習へ引き継ぐ設定(nullなら通常の自由練習)
  const [freeInit, setFreeInit] = useState<FreePracticeInit | null>(null);
  const navigate = (s: Screen) => {
    setScreen(s);
    if (s === 'free') setFreeInit(null); // 通常導線ではまっさらな自由練習
    if (s !== 'home') {
      setLastScreen(s);
      saveJSON(STORAGE_KEYS.lastScreen, s);
    }
  };

  // レッスン→自由練習(設定引き継ぎ・復帰導線あり)
  const startReview = (init: FreePracticeInit) => {
    setFreeInit(init);
    setScreen('free');
  };
  const returnToLesson = () => {
    setFreeInit(null);
    setScreen('course'); // courseLessonId が保持されているので同じレッスンに戻る
  };

  // ---- 楽器設定 ----
  // 「マイ楽器」(基本設定・永続化)と「今回の練習設定」(セッション)はstate上でも分離する。
  // セッション中の変更(自由練習などでの一時的な楽器変更)はマイ楽器を上書きせず、
  // 明示的に保存したときだけ baseInstrument(ホームの表示)にも反映する。
  const [session, setSession] = useState<MyInstrumentSettings>(loadMyInstrument);
  const [baseInstrument, setBaseInstrument] = useState<MyInstrumentSettings>(loadMyInstrument);
  const patchSession = (patch: Partial<MyInstrumentSettings>) => setSession((s) => ({ ...s, ...patch }));

  /** 楽器変更時の付随初期値(譜表・譜面表示・ギター設定) */
  const instrumentDefaults = (id: string): Partial<MyInstrumentSettings> => {
    const inst = getInstrument(id);
    return { instrumentId: id, clefOverride: null, notationMode: defaultNotationOf(inst), guitarPosition: 'auto', guitarOpenStrings: true };
  };

  /** セッションの楽器変更: マイ楽器と同じ楽器ならその保存値を採用 */
  const changeSessionInstrument = (id: string) => {
    const base = loadMyInstrument();
    if (base.instrumentId === id) {
      patchSession({
        instrumentId: id,
        clefOverride: base.clefOverride,
        notationMode: base.notationMode,
        guitarPosition: base.guitarPosition,
        guitarOpenStrings: base.guitarOpenStrings,
      });
    } else {
      patchSession(instrumentDefaults(id));
    }
  };

  /** 現在のセッション設定をマイ楽器として保存(ユーザーが明示的に選んだときだけ) */
  const saveSessionAsBase = () => {
    saveMyInstrument(session);
    setBaseInstrument(session);
  };

  /** ホームのマイ楽器編集: 基本設定を更新し、セッションにも反映 */
  const updateBase = (patch: Partial<MyInstrumentSettings>) => {
    setBaseInstrument((b) => {
      const next = { ...b, ...patch };
      saveMyInstrument(next);
      return next;
    });
    setSession((s) => ({ ...s, ...patch }));
  };
  const changeBaseInstrument = (id: string) => updateBase(instrumentDefaults(id));

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-row">
          <div className="app-title-row">
            {screen !== 'home' && (
              <button className="btn back-btn" onClick={() => navigate('home')}>← {t('backToHome')}</button>
            )}
            <div className="app-title-block">
              <h1>First Chorus</h1>
              <span className="app-subtitle">{t('appSubtitle')}</span>
            </div>
            {screen !== 'home' && <span className="key-badge screen-badge">{t(SCREEN_TITLES[screen])}</span>}
          </div>
          <div className="seg-group lang-toggle">
            <button className={`seg${lang === 'ja' ? ' on' : ''}`} aria-pressed={lang === 'ja'} onClick={() => changeLang('ja')}>日本語</button>
            <button className={`seg${lang === 'en' ? ' on' : ''}`} aria-pressed={lang === 'en'} onClick={() => changeLang('en')}>English</button>
          </div>
        </div>
      </header>

      {screen === 'home' && (
        <HomeScreen
          lang={lang}
          onNavigate={navigate}
          lastScreen={lastScreen}
          baseInstrument={baseInstrument}
          onUpdateBase={updateBase}
          onChangeBaseInstrument={changeBaseInstrument}
        />
      )}
      {screen === 'free' && (
        <FreePracticeScreen
          key={freeInit ? `review-${courseLessonId}` : 'free'}
          lang={lang}
          session={session}
          onPatchSession={patchSession}
          onChangeInstrument={changeSessionInstrument}
          onSaveBase={saveSessionAsBase}
          initial={freeInit}
          onReturnToLesson={freeInit ? returnToLesson : undefined}
        />
      )}
      {screen === 'course' && (
        <CourseScreen
          lang={lang}
          session={session}
          onPatchSession={patchSession}
          onChangeInstrument={changeSessionInstrument}
          onSaveBase={saveSessionAsBase}
          selectedLessonId={courseLessonId}
          onSelectLesson={setCourseLessonId}
          onReview={startReview}
        />
      )}
      {screen === 'song' && (
        <SongPracticeScreen
          lang={lang}
          session={session}
          onPatchSession={patchSession}
          onChangeInstrument={changeSessionInstrument}
          onSaveBase={saveSessionAsBase}
        />
      )}

      <footer className="app-footer">
        <p>{t('footer')}</p>
      </footer>
    </div>
  );
}
