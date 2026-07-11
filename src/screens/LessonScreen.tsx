// レッスン画面: テーマ→目的→進行→使える音→ルール→練習→自己評価→完了 の共通構成

import { useMemo, useState } from 'react';
import { appendLog } from '../components/PracticeLogPanel';
import { ChordProgressionView } from '../components/ChordProgressionView';
import { StaffView, type ChordDisplay, type LabelMode } from '../components/StaffView';
import type { Lesson } from '../data/courses';
import { usePracticePlayback } from '../hooks/usePracticePlayback';
import { chordSymbol } from '../theory/chords';
import { getInstrument, displayShift, type Clef, type PitchMode } from '../theory/instruments';
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

interface Props {
  lang: Lang;
  lesson: Lesson;
  courseTitle: string;
  lessonNumber: number;
  totalLessons: number;
  alreadyDone: boolean;
  hasNext: boolean;
  onComplete: (lessonId: string) => void;
  onNext: () => void;
  onBack: () => void;
  instrumentId: string;
  clefOverride: Clef | null;
  pitchMode: PitchMode;
}

export function LessonScreen({
  lang, lesson, courseTitle, lessonNumber, totalLessons, alreadyDone, hasNext,
  onComplete, onNext, onBack, instrumentId, clefOverride, pitchMode,
}: Props) {
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);

  const [keyPc, setKeyPc] = useState(0);
  const [bpm, setBpm] = useState(90);
  const [countIn, setCountIn] = useState(true);
  const [metronomeOn, setMetronomeOn] = useState(true);
  const [compOn, setCompOn] = useState(true);
  const [labelMode, setLabelMode] = useState<LabelMode>('degree');
  const [checks, setChecks] = useState<boolean[]>(() => lesson.selfCheck.map(() => false));
  const [memo, setMemo] = useState('');
  const [completedNow, setCompletedNow] = useState(false);

  const progression = getProgression(lesson.progressionId);
  const instrument = getInstrument(instrumentId);
  const clef: Clef = clefOverride && instrument.clefs.includes(clefOverride) ? clefOverride : instrument.defaultClef;
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
      mode: pick(lang, lesson.title, lesson.titleEn),
      difficulty: `${t('selfCheckTitle')} ${checked}/${lesson.selfCheck.length}`,
      memo: memo.trim(),
    });
    setCompletedNow(true);
  };

  return (
    <main className="lesson-main">
      <div className="lesson-header">
        <button className="btn" onClick={() => { stopAll(); onBack(); }}>← {t('backToCourse')}</button>
        <span className="key-badge">{lessonNumber} / {totalLessons}{alreadyDone ? ` ✓ ${t('doneBadge')}` : ''}</span>
      </div>

      <section className="panel">
        <h2>{pick(lang, lesson.title, lesson.titleEn)}</h2>
        <div className="lesson-theme">
          <span className="lesson-step-label">{t('themeTitle')}</span>
          <p className="lesson-theme-text">{pick(lang, lesson.theme, lesson.themeEn)}</p>
        </div>
        <div className="lesson-block">
          <span className="lesson-step-label">{t('objectiveTitle')}</span>
          <p>{pick(lang, lesson.objective, lesson.objectiveEn)}</p>
        </div>
        <p className="lesson-explanation">{pick(lang, lesson.explanation, lesson.explanationEn)}</p>
      </section>

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

      <section className="panel">
        <div className="staff-head">
          <h2>{t('usableNotesTitle')}</h2>
          <div className="seg-group">
            <button className={`seg${labelMode === 'none' ? ' on' : ''}`} onClick={() => setLabelMode('none')}>{t('labelNone')}</button>
            <button className={`seg${labelMode === 'name' ? ' on' : ''}`} onClick={() => setLabelMode('name')}>C D E</button>
            <button className={`seg${labelMode === 'degree' ? ' on' : ''}`} onClick={() => setLabelMode('degree')}>{t('labelDegree')}</button>
          </div>
        </div>
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
          />
        </div>
      </section>

      <section className="panel">
        <h2>{t('rulesTitle')}</h2>
        <div className="rule-chips">
          {lesson.rules.map((r, i) => (
            <span key={i} className="rule-chip">{pick(lang, r.ja, r.en)}</span>
          ))}
        </div>
        <p className="hint-text relax-hint">💡 {t('relaxTitle')}: {pick(lang, lesson.relax.ja, lesson.relax.en)}</p>
      </section>

      <section className="panel">
        <h2>{t('practiceTitle')}</h2>
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
            ♪ {t('checkNotes')}
          </button>
        </div>
        <div className="transport-opts">
          <label className="toggle"><input type="checkbox" checked={countIn} onChange={(e) => setCountIn(e.target.checked)} /> 4 Count In</label>
          <label className="toggle"><input type="checkbox" checked={metronomeOn} onChange={(e) => setMetronomeOn(e.target.checked)} /> {t('metronome')}</label>
          <label className="toggle"><input type="checkbox" checked={compOn} onChange={(e) => setCompOn(e.target.checked)} /> {t('compSound')}</label>
        </div>
      </section>

      <section className="panel">
        <h2>{t('selfCheckTitle')}</h2>
        <ul className="check-list">
          {lesson.selfCheck.map((c, i) => (
            <li key={i}>
              <label className="toggle check-item">
                <input
                  type="checkbox"
                  checked={checks[i]}
                  onChange={(e) => setChecks(checks.map((v, j) => (j === i ? e.target.checked : v)))}
                />
                {pick(lang, c.ja, c.en)}
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
        <div className="lesson-complete-row">
          {completedNow ? (
            <>
              <span className="saved-note">✓ {t('lessonCompleted')}</span>
              {hasNext && <button className="btn big start" onClick={onNext}>{t('nextLesson')} →</button>}
              <button className="btn" onClick={onBack}>{t('backToCourse')}</button>
            </>
          ) : (
            <button className="btn big primary complete-btn" onClick={complete}>✓ {t('completeLesson')}</button>
          )}
        </div>
      </section>
    </main>
  );
}
