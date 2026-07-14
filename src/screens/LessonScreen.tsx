// レッスン詳細画面: 悩み → できるようになること → なぜ(折りたたみ) → 進行 →
// STEP統合練習(楽譜・編集・確認・演奏) → 成功サイン → よくある失敗 → チェック → 前後のレッスン → 完了

import { useCallback, useRef, useState } from 'react';
import { appendLog } from '../components/PracticeLogPanel';
import { ChordProgressionView } from '../components/ChordProgressionView';
import { SessionSetupPanel } from '../components/SessionSetupPanel';
import { StepPractice } from '../components/StepPractice';
import type { LabelMode } from '../components/StaffView';
import type { Bi, Lesson } from '../data/courses';
import type { MyInstrumentSettings } from '../state/storage';
import { getInstrument, displayShift, type Clef } from '../theory/instruments';
import { KEYS, mod12, useFlatsForKey } from '../theory/notes';
import { getProgression } from '../theory/progressions';
import { pick, t as tr, type Lang } from '../i18n';
import type { FreePracticeInit } from './FreePracticeScreen';

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
  onReview: (init: FreePracticeInit) => void;
  session: MyInstrumentSettings;
  onPatchSession: (patch: Partial<MyInstrumentSettings>) => void;
  onChangeInstrument: (id: string) => void;
  onSaveBase: () => void;
}

export function LessonScreen({
  lang, lesson, courseTitle, chapterTitle, lessonNumber, totalLessons, alreadyDone, hasPrev, hasNext,
  onComplete, onPrev, onNext, onBack, onReview, session, onPatchSession, onChangeInstrument, onSaveBase,
}: Props) {
  const { instrumentId, pitchMode } = session;
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);
  const p = (x: Bi) => pick(lang, x.ja, x.en);

  const [keyPc, setKeyPc] = useState(0);
  const [bpm, setBpm] = useState(90);
  const [countIn, setCountIn] = useState(true);
  const [metronomeOn, setMetronomeOn] = useState(true);
  const [compOn, setCompOn] = useState(true);
  const [labelMode, setLabelMode] = useState<LabelMode>('degree');
  const [checks, setChecks] = useState<boolean[]>(() => lesson.selfCheck.map(() => false));
  const [memo, setMemo] = useState('');
  const [completedNow, setCompletedNow] = useState(false);
  const [stepDirty, setStepDirty] = useState(false);
  // STEP達成状況(レッスン完了のハードゲート用)
  const [stepProgress, setStepProgress] = useState({ allStepsDone: false, pendingCount: 0 });
  // 「もう一度練習する」でSTEP練習を完全リセットするためのキー(StepPracticeを再マウントさせる)
  const [practiceGen, setPracticeGen] = useState(0);
  // 練習開始前の設定確認(マイ楽器を初期値に、今回だけの変更が可能)
  const [setupConfirmed, setSetupConfirmed] = useState(false);
  const practiceRef = useRef<HTMLElement>(null);

  // 現在アクティブなSTEPの再生停止関数(StepPractice配下のbodyが登録する)。
  // 複数のusePracticePlaybackが同時に競合しないよう、常に「今アクティブな1つ」だけを指す。
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

  // キー変更の一元管理(§1): STEP内のキー選択・設定パネルのどちらから変更しても
  // ここを通る。編集中の下書きがあれば確認し、承認時のみ変更する(下書きの破棄は
  // StepPractice が keyPc の変化を検知して全STEP分行う)。
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

  // 「もう一度練習する」: 自己評価・完了表示だけでなく、STEP練習(現在位置・編集フレーズ・
  // Undo履歴)も先頭から作り直す。編集中の内容がある場合は先に確認する。
  const retry = () => {
    if (hasUnsaved && !window.confirm(t('unsavedNavConfirm'))) return;
    stopActive();
    setChecks(lesson.selfCheck.map(() => false));
    setCompletedNow(false);
    setStepDirty(false);
    setPracticeGen((g) => g + 1);
    practiceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const review = () => {
    if (hasUnsaved && !window.confirm(t('unsavedNavConfirm'))) return;
    stopActive();
    onReview({
      progressionId: lesson.progressionId,
      keyPc,
      bpm,
      tab: lesson.contentTab,
      toneRhythm: lesson.toneRhythm,
      arpPattern: lesson.arpPattern,
      scaleView: lesson.scaleView,
    });
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

      {/* 1-4. タイトル / 専門用語 / 悩み / できるようになること */}
      <section className="panel">
        <h2 className="lesson-title">{p(lesson.title)}</h2>
        {lesson.technicalName && <p className="lesson-technical">{lesson.technicalName}</p>}
        {lesson.estimatedMinutes && <p className="hint-text">⏱ {t('estimatedLabel')} {lesson.estimatedMinutes}{t('minutesUnit')}</p>}

        <div className="lesson-block">
          <span className="lesson-step-label">😣 {t('problemTitle')}</span>
          <p className="lesson-problem">{p(lesson.problem)}</p>
        </div>

        <div className="outcome-box">
          <span className="outcome-label">🎯 {t('outcomeTitle')}</span>
          <p className="outcome-text">{p(lesson.outcome)}</p>
        </div>

        {/* 5-6. なぜこの練習? (折りたたみ) */}
        <details className="why-details">
          <summary>💡 {t('whyButton')}</summary>
          <div className="why-body">
            <div className="why-row">
              <span className="why-label">{t('whyProblem')}</span>
              <p>{p(lesson.problem)}</p>
            </div>
            <div className="why-row">
              <span className="why-label">{t('whyGain')}</span>
              <p>{p(lesson.reason)}</p>
            </div>
            <div className="why-row">
              <span className="why-label">{t('whyUse')}</span>
              <ul>
                {lesson.realUseCases.map((u, i) => (
                  <li key={i}>{p(u)}</li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      </section>

      {/* 7. コード進行(全体像) */}
      <section className="panel">
        <h2>{t('lessonProgressionTitle')} <span className="key-badge">{pick(lang, progression.label, progression.labelEn)}</span></h2>
        <ChordProgressionView
          progression={progression}
          keyPc={keyPc}
          shift={shift}
          flats={flats}
          currentMeasure={null}
          currentBeat={0}
          selectedMeasure={0}
          onSelectMeasure={() => {}}
          lang={lang}
        />
        {lesson.usableNotes && (
          <div className="usable-notes">
            <span className="lesson-step-label">{t('usableNotesExample')}</span>
            <ul>
              {lesson.usableNotes.map((u, i) => (
                <li key={i}><strong>{u.chord}</strong>: {u.notes}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="lesson-block">
          <span className="lesson-step-label">🏁 {t('lessonGoalTitle')}</span>
          <div className="rule-chips">
            {lesson.rules.map((r, i) => (
              <span key={i} className="rule-chip">{p(r)}</span>
            ))}
          </div>
          <p className="hint-text">{t('lessonGoalHint')}</p>
        </div>
      </section>

      {/* 9-11. STEP統合練習: 今のSTEPの目的・楽譜・編集・確認・演奏 */}
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
          compOn={compOn}
          setCompOn={setCompOn}
          labelMode={labelMode}
          setLabelMode={setLabelMode}
          onDirtyChange={setStepDirty}
          onProgressChange={setStepProgress}
          registerStop={registerStop}
        />
      </section>

      {/* 12-13. 成功サイン / よくある失敗 */}
      <section className="panel">
        <h2>✨ {t('successTitle')}</h2>
        <ul className="success-list">
          {lesson.successSigns.map((s, i) => (
            <li key={i}>{p(s)}</li>
          ))}
        </ul>
        <details className="mistake-details">
          <summary>🤔 {t('mistakesTitle')}</summary>
          <div className="why-body">
            {lesson.commonMistakes.map((m, i) => (
              <div key={i} className="mistake-item">
                <p className="mistake-problem">「{p(m.problem)}」</p>
                <p className="mistake-advice"><strong>{t('mistakeAdvice')}:</strong> {p(m.advice)}</p>
              </div>
            ))}
          </div>
        </details>
      </section>

      {/* 14-16. 今日のチェック / 前後のレッスン / 完了 */}
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

        {lesson.nextConnection && (
          <div className="next-connection">
            <span className="lesson-step-label">🔗 {t('nextConnectionTitle')}</span>
            <p>{p(lesson.nextConnection)}</p>
          </div>
        )}

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
              <button className="btn" onClick={review}>{t('reviewInFree')}</button>
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
