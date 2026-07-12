// レッスン詳細画面: 悩み → できるようになること → なぜ(折りたたみ) → 進行 →
// 使う音 → ルール → STEP → 練習 → 成功サイン → よくある失敗 → チェック → 次へ → 完了

import { useMemo, useRef, useState } from 'react';
import { appendLog } from '../components/PracticeLogPanel';
import { ChordProgressionView } from '../components/ChordProgressionView';
import { StaffView, type ChordDisplay, type LabelMode } from '../components/StaffView';
import { PhraseComposer } from '../components/PhraseComposer';
import { SessionSetupPanel } from '../components/SessionSetupPanel';
import type { Bi, Lesson } from '../data/courses';
import type { MyInstrumentSettings } from '../state/storage';
import { usePracticePlayback } from '../hooks/usePracticePlayback';
import { chordSymbol } from '../theory/chords';
import { getInstrument, displayShift, type Clef } from '../theory/instruments';
import { KEYS, mod12, useFlatsForKey } from '../theory/notes';
import {
  approachAsNotes,
  chordTonesAsNotes,
  guideTonesAsNotes,
  scaleAsNotes,
  targetAsNotes,
  tensionsAsNotes,
  type NoteEvent,
} from '../theory/phrases';
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
  hasNext: boolean;
  onComplete: (lessonId: string) => void;
  onNext: () => void;
  onBack: () => void;
  onReview: (init: FreePracticeInit) => void;
  session: MyInstrumentSettings;
  onPatchSession: (patch: Partial<MyInstrumentSettings>) => void;
  onChangeInstrument: (id: string) => void;
  onSaveBase: () => void;
}

export function LessonScreen({
  lang, lesson, courseTitle, chapterTitle, lessonNumber, totalLessons, alreadyDone, hasNext,
  onComplete, onNext, onBack, onReview, session, onPatchSession, onChangeInstrument, onSaveBase,
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
  const [currentStep, setCurrentStep] = useState(0);
  const [checks, setChecks] = useState<boolean[]>(() => lesson.selfCheck.map(() => false));
  const [memo, setMemo] = useState('');
  const [completedNow, setCompletedNow] = useState(false);
  // 練習開始前の設定確認(マイ楽器を初期値に、今回だけの変更が可能)
  const [setupConfirmed, setSetupConfirmed] = useState(false);
  const practiceRef = useRef<HTMLElement>(null);

  const progression = getProgression(lesson.progressionId);
  const instrument = getInstrument(instrumentId);
  const clef: Clef = session.clefOverride && instrument.clefs.includes(session.clefOverride) ? session.clefOverride : instrument.defaultClef;
  const effNotation = instrumentId === 'guitar' ? session.notationMode : 'staff';
  const shift = displayShift(instrument, pitchMode);
  const flats = useFlatsForKey(mod12(keyPc + shift));

  const displayedNotes: NoteEvent[] = useMemo(() => {
    switch (lesson.contentTab) {
      case 'guidetones': return guideTonesAsNotes(progression, keyPc, lesson.toneRhythm ?? 'basic');
      case 'approach': return approachAsNotes(progression, keyPc);
      case 'target': return targetAsNotes(progression, keyPc);
      case 'scale': return lesson.scaleView === 'tension' ? tensionsAsNotes(progression, keyPc) : scaleAsNotes(progression, keyPc);
      default: return chordTonesAsNotes(progression, keyPc, lesson.toneRhythm ?? 'basic', lesson.arpPattern ?? 'up');
    }
  }, [lesson, progression, keyPc]);

  const chordDisplays: ChordDisplay[] = useMemo(
    () =>
      progression.chords.map((c) => {
        const rootPc = mod12(keyPc + c.rootOffset + shift);
        return { measure: c.measure, beat: c.beat, symbol: chordSymbol(rootPc, c.quality, flats), rootPc, quality: c.quality };
      }),
    [progression, keyPc, shift, flats],
  );

  const { playing, position, currentNoteIndex, startPlayback, stopAll } = usePracticePlayback({
    progression, effKeyPc: keyPc, displayedNotes, bpm, countIn,
    loopEnabled: true, metronomeOn, compOn, swing: 1 / 6, loopRange: 'full', selectedMeasure: 0,
  });

  const complete = () => {
    stopAll();
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
  };

  const retry = () => {
    setChecks(lesson.selfCheck.map(() => false));
    setCompletedNow(false);
    practiceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const review = () => {
    stopAll();
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
        <button className="btn" onClick={() => { stopAll(); onBack(); }}>← {t('backToCourse')}</button>
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
        setKeyPc={setKeyPc}
        bpm={bpm}
        setBpm={setBpm}
        confirmed={setupConfirmed}
        onConfirm={() => setSetupConfirmed(true)}
        onEdit={() => { stopAll(); setSetupConfirmed(false); }}
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

      {/* 7. コード進行 */}
      <section className="panel">
        <h2>{t('lessonProgressionTitle')} <span className="key-badge">{pick(lang, progression.label, progression.labelEn)}</span></h2>
        <ChordProgressionView
          progression={progression}
          keyPc={keyPc}
          shift={shift}
          flats={flats}
          currentMeasure={position ? position.measure : null}
          currentBeat={position?.beat ?? 0}
          selectedMeasure={0}
          onSelectMeasure={() => {}}
          lang={lang}
        />
      </section>

      {/* 8. 今回使う音 */}
      <section className="panel">
        <div className="staff-head">
          <h2>{t('usableNotesTitle')}</h2>
          <div className="seg-group">
            <button className={`seg${labelMode === 'none' ? ' on' : ''}`} onClick={() => setLabelMode('none')}>{t('labelNone')}</button>
            <button className={`seg${labelMode === 'name' ? ' on' : ''}`} onClick={() => setLabelMode('name')}>C D E</button>
            <button className={`seg${labelMode === 'degree' ? ' on' : ''}`} onClick={() => setLabelMode('degree')}>{t('labelDegree')}</button>
          </div>
        </div>
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
        <div className="staff-card">
          <StaffView
            notes={displayedNotes}
            measures={progression.measures}
            clef={clef}
            shift={shift}
            flats={flats}
            labelMode={labelMode}
            chords={chordDisplays}
            currentIndex={currentNoteIndex}
            notation={effNotation}
            guitarPosition={session.guitarPosition}
            guitarOpenStrings={session.guitarOpenStrings}
          />
        </div>
      </section>

      {/* 9-11. ルール / STEP / 練習 */}
      <section className="panel" ref={practiceRef}>
        <h2>{t('practiceTitle')}</h2>

        <div className="lesson-block">
          <span className="lesson-step-label">📌 {t('rulesTitle')}</span>
          <div className="rule-chips">
            {lesson.rules.map((r, i) => (
              <span key={i} className="rule-chip">{p(r)}</span>
            ))}
          </div>
        </div>

        <div className="lesson-block">
          <span className="lesson-step-label">🪜 {t('stepsTitle')}</span>
          <div className="seg-group step-tabs">
            {lesson.steps.map((_, i) => (
              <button key={i} className={`seg${currentStep === i ? ' on' : ''}`} onClick={() => setCurrentStep(i)}>
                {t('stepLabel')} {i + 1}
              </button>
            ))}
          </div>
          <div className="step-card">
            <span className="step-card-title">{t('stepLabel')} {currentStep + 1}: {p(lesson.steps[currentStep].title)}</span>
            <p className="step-card-text">{p(lesson.steps[currentStep].instruction)}</p>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="lesson-key">{t('keyLabel')}</label>
            <select id="lesson-key" value={keyPc} onChange={(e) => setKeyPc(Number(e.target.value))}>
              {KEYS.map((k) => (
                <option key={k.pc} value={k.pc}>{k.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="lesson-bpm">{t('tempoLabel')}: <strong>{bpm} BPM</strong></label>
            <input
              id="lesson-bpm"
              type="range" min={40} max={220} value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="transport-main">
          {playing ? (
            <button className="btn big stop" onClick={stopAll}>■ Stop</button>
          ) : (
            <button className="btn big start" onClick={() => startPlayback('backing')}>▶ Start</button>
          )}
          <button
            className={`btn big example${playing === 'example' ? ' active' : ''}`}
            onClick={() => (playing === 'example' ? stopAll() : startPlayback('example'))}
          >
            ♪ {t('checkThisNote')}
          </button>
        </div>
        <div className="transport-opts">
          <label className="toggle"><input type="checkbox" checked={countIn} onChange={(e) => setCountIn(e.target.checked)} /> 4 Count In</label>
          <label className="toggle"><input type="checkbox" checked={metronomeOn} onChange={(e) => setMetronomeOn(e.target.checked)} /> {t('metronome')}</label>
          <label className="toggle"><input type="checkbox" checked={compOn} onChange={(e) => setCompOn(e.target.checked)} /> {t('compSound')}</label>
        </div>
      </section>

      {/* フレーズ作成(レッスンに編集課題がある場合) */}
      {lesson.editor && (
        <PhraseComposer
          lang={lang}
          session={session}
          keyPc={keyPc}
          chordOptions={progression.chords
            .filter((c, i, arr) => arr.findIndex((x) => x.rootOffset === c.rootOffset && x.quality === c.quality) === i)
            .map((c) => ({ rootOffset: c.rootOffset, quality: c.quality }))}
          material={lesson.editor.material}
          level={lesson.editor.level}
          taskText={p(lesson.editor.task)}
          initialBpm={bpm}
        />
      )}

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

      {/* 14-16. 今日のチェック / 次へのつながり / 完了 */}
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

        <div className="lesson-complete-row">
          {completedNow ? (
            <>
              <span className="saved-note">✓ {t('lessonCompleted')}</span>
              {hasNext && <button className="btn big start" onClick={onNext}>{t('nextLesson')} →</button>}
              <button className="btn" onClick={retry}>{t('retryPractice')}</button>
              <button className="btn" onClick={onBack}>{t('backToCourse')}</button>
            </>
          ) : (
            <>
              <button className="btn big primary complete-btn" onClick={complete}>✓ {t('completeLesson')}</button>
              <button className="btn" onClick={retry}>{t('retryPractice')}</button>
              <button className="btn" onClick={review}>{t('reviewInFree')}</button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
