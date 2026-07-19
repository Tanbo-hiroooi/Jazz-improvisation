// レッスン詳細画面(3区分構成):
// ① このレッスンでできるようになること → ② STEP統合練習 → ③ できたかチェック
// 補足(なぜ効くのか・よくある失敗)は折りたたみの豆知識へ収納

import { useCallback, useRef, useState } from 'react';
import { appendLog } from '../components/PracticeLogPanel';
import { SessionSetupPanel } from '../components/SessionSetupPanel';
import { StepPractice } from '../components/StepPractice';
import type { LabelMode } from '../components/StaffView';
import type { Bi, Lesson } from '../data/courses';
import type { MyInstrumentSettings } from '../state/storage';
import { getInstrument, displayShift, type Clef } from '../theory/instruments';
import { KEYS, mod12, useFlatsForKey } from '../theory/notes';
import { getProgression } from '../theory/progressions';
import { pick, t as tr, type Lang } from '../i18n';

interface Props {
  lang: Lang;
  lesson: Lesson;
  courseTitle: string;
  chapterTitle: string;
  lessonNumber: number;
  totalLessons: number;
  alreadyDone: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  onComplete: (lessonId: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onBack: () => void;
  session: MyInstrumentSettings;
  onPatchSession: (patch: Partial<MyInstrumentSettings>) => void;
  onChangeInstrument: (id: string) => void;
  onSaveBase: () => void;
}

export function LessonScreen({
  lang, lesson, courseTitle, chapterTitle, lessonNumber, totalLessons, alreadyDone, hasPrev, hasNext,
  onComplete, onPrev, onNext, onBack, session, onPatchSession, onChangeInstrument, onSaveBase,
}: Props) {
  const { instrumentId, pitchMode } = session;
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);
  const p = (x: Bi) => pick(lang, x.ja, x.en);

  const [keyPc, setKeyPc] = useState(0);
  const [bpm, setBpm] = useState(lesson.defaultBpm ?? 80);
  const [countIn, setCountIn] = useState(true);
  const [metronomeOn, setMetronomeOn] = useState(true);
  const [clickPattern, setClickPattern] = useState<'all' | 'backbeat'>(lesson.clickPattern ?? 'all');
  const [compOn, setCompOn] = useState(true);
  const [labelMode, setLabelMode] = useState<LabelMode>('degree');
  const [checks, setChecks] = useState<boolean[]>(() => lesson.selfCheck.map(() => false));
  const [memo, setMemo] = useState('');
  const [completedNow, setCompletedNow] = useState(false);
  const [stepDirty, setStepDirty] = useState(false);
  const [stepProgress, setStepProgress] = useState({ allStepsDone: false, pendingCount: 0 });
  const [practiceGen, setPracticeGen] = useState(0);
  const [setupConfirmed, setSetupConfirmed] = useState(false);
  const practiceRef = useRef<HTMLElement>(null);

  const stopRef = useRef<() => void>(() => {});
  const registerStop = useCallback((fn: (() => void) | null) => {
    stopRef.current = fn ?? (() => {});
  }, []);
  const stopActive = () => stopRef.current();

  const progression = getProgression(lesson.progressionId);
  const instrument = getInstrument(instrumentId);
  const clef: Clef = session.clefOverride && instrument.clefs.includes(session.clefOverride) ? session.clefOverride : instrument.defaultClef;
  const effNotation = instrumentId === 'guitar' ? session.notationMode : 'staff';
  const shift = displayShift(instrument, pitchMode);
  const flats = useFlatsForKey(mod12(keyPc + shift));

  const hasUnsaved = stepDirty || memo.trim().length > 0;
  const guardNav = (action: () => void) => {
    if (hasUnsaved && !window.confirm(t('unsavedNavConfirm'))) return;
    stopActive();
    action();
  };

  // キー変更の一元管理: どの経路(STEP内・設定パネル・はしご)でもここを通る
  const changeKey = (pc: number) => {
    if (pc === keyPc) return;
    if (stepDirty && !window.confirm(t('keyChangeConfirm'))) return;
    stopActive();
    setKeyPc(pc);
  };

  const complete = () => {
    stopActive();
    onComplete(lesson.id);
    const checked = checks.filter(Boolean).length;
    appendLog({
      menu: courseTitle,
      key: KEYS.find((k) => k.pc === keyPc)!.name,
      bpm,
      instrument: instrument.label,
      mode: p(lesson.title),
      difficulty: `${t('selfCheckTitle')} ${checked}/${lesson.selfCheck.length}`,
      memo: memo.trim(),
    });
    setCompletedNow(true);
    setStepDirty(false);
  };

  const retry = () => {
    if (hasUnsaved && !window.confirm(t('unsavedNavConfirm'))) return;
    stopActive();
    setChecks(lesson.selfCheck.map(() => false));
    setCompletedNow(false);
    setStepDirty(false);
    setPracticeGen((g) => g + 1);
    practiceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <main className="lesson-main">
      <div className="lesson-header">
        <button className="btn" onClick={() => guardNav(onBack)}>← {t('backToCourse')}</button>
        <span className="key-badge">{chapterTitle}</span>
        <span className="key-badge">{lessonNumber} / {totalLessons}{alreadyDone ? ` ✓ ${t('doneBadge')}` : ''}</span>
      </div>

      <SessionSetupPanel
        lang={lang}
        practiceTitle={p(lesson.title)}
        session={session}
        onPatch={onPatchSession}
        onChangeInstrument={onChangeInstrument}
        onSaveBase={onSaveBase}
        keyPc={keyPc}
        setKeyPc={changeKey}
        bpm={bpm}
        setBpm={setBpm}
        confirmed={setupConfirmed}
        onConfirm={() => setSetupConfirmed(true)}
        onEdit={() => { stopActive(); setSetupConfirmed(false); }}
      />

      {/* ① このレッスンでできるようになること */}
      <section className="panel">
        <h2 className="lesson-title">{p(lesson.title)}</h2>
        {lesson.technicalName && <p className="lesson-technical">{lesson.technicalName}</p>}
        {lesson.estimatedMinutes && <p className="hint-text">⏱ {t('estimatedLabel')} {lesson.estimatedMinutes}{t('minutesUnit')}</p>}
        <div className="outcome-box">
          <span className="outcome-label">🎯 {t('outcomeTitle')}</span>
          <p className="outcome-text">{p(lesson.outcome)}</p>
        </div>
        {lesson.trivia && (
          <details className="why-details">
            <summary>💡 {t('triviaTitle')}</summary>
            <div className="why-body">
              {lesson.trivia.why && (
                <div className="why-row">
                  <span className="why-label">{t('whyGain')}</span>
                  <p>{p(lesson.trivia.why)}</p>
                </div>
              )}
              {lesson.trivia.mistakes && lesson.trivia.mistakes.length > 0 && (
                <div className="why-row">
                  <span className="why-label">{t('mistakesTitle')}</span>
                  <ul>
                    {lesson.trivia.mistakes.map((m, i) => (
                      <li key={i}>{p(m)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </details>
        )}
      </section>

      {/* ② STEP統合練習 */}
      <section ref={practiceRef}>
        <StepPractice
          key={`${lesson.id}-${practiceGen}`}
          lang={lang}
          lesson={lesson}
          progression={progression}
          keyPc={keyPc}
          setKeyPc={changeKey}
          shift={shift}
          flats={flats}
          clef={clef}
          notation={effNotation}
          guitarPosition={session.guitarPosition}
          guitarOpenStrings={session.guitarOpenStrings}
          bpm={bpm}
          setBpm={setBpm}
          countIn={countIn}
          setCountIn={setCountIn}
          metronomeOn={metronomeOn}
          setMetronomeOn={setMetronomeOn}
          clickPattern={clickPattern}
          setClickPattern={setClickPattern}
          compOn={compOn}
          setCompOn={setCompOn}
          labelMode={labelMode}
          setLabelMode={setLabelMode}
          onDirtyChange={setStepDirty}
          onProgressChange={setStepProgress}
          registerStop={registerStop}
        />
      </section>

      {/* ③ できたかチェック */}
      <section className="panel">
        <h2>☑ {t('todayCheck')}</h2>
        <ul className="check-list">
          {lesson.selfCheck.map((c, i) => (
            <li key={i}>
              <label className="toggle check-item">
                <input
                  type="checkbox"
                  checked={checks[i]}
                  onChange={(e) => setChecks(checks.map((v, j) => (j === i ? e.target.checked : v)))}
                />
                {p(c)}
              </label>
            </li>
          ))}
        </ul>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder={t('memoPlaceholder')}
          rows={2}
        />

        <div className="lesson-prev-next-row">
          <button className="btn" onClick={() => guardNav(onPrev)} disabled={!hasPrev}>← {t('prevLesson')}</button>
          <span className="hint-text">{hasPrev ? '' : t('isFirstLessonNote')}</span>
          <button className="btn" onClick={() => guardNav(onNext)} disabled={!hasNext}>{t('nextLesson')} →</button>
        </div>
        {!hasNext && <p className="hint-text">{t('isLastLessonNote')}</p>}

        <div className="lesson-complete-row">
          {completedNow ? (
            <>
              <span className="saved-note">✓ {t('lessonCompleted')}</span>
              {hasNext && <button className="btn big start" onClick={() => guardNav(onNext)}>{t('nextLesson')} →</button>}
              <button className="btn" onClick={retry}>{t('retryPractice')}</button>
              <button className="btn" onClick={() => guardNav(onBack)}>{t('backToCourse')}</button>
            </>
          ) : (
            <>
              <button className="btn big primary complete-btn" onClick={complete} disabled={!stepProgress.allStepsDone}>
                ✓ {t('completeLesson')}
              </button>
              <button className="btn" onClick={retry}>{t('retryPractice')}</button>
            </>
          )}
        </div>
        {!completedNow && !stepProgress.allStepsDone && (
          <p className="hint-text">🔒 {t('completeGateHint').replace('{n}', String(stepProgress.pendingCount))}</p>
        )}
      </section>
    </main>
  );
}
