// STEP統合練習パネル(拍グリッド版)
// - 固定STEP: 譜例の再生+自分の楽器での演奏(訪問で達成)
// - 編集STEP: 拍グリッドで作る課題(形式条件+操作課題をdraftから毎レンダー導出)
// - テンポ/キーのはしご: クリアしたらユーザーが自分で上げる(ゲートにはしない)

import { useEffect, useMemo, useRef, useState } from 'react';
import { GridEditor } from './GridEditor';
import { StaffView, type ChordDisplay, type LabelMode } from './StaffView';
import { VolumeControls } from './VolumeControls';
import type { Bi, Lesson, StepContent, StepEditable } from '../data/courses';
import { usePracticePlayback, type PlaybackOverrides } from '../hooks/usePracticePlayback';
import { chordSymbol } from '../theory/chords';
import {
  attackPositions,
  fullSignature,
  gridMatchesPalettes,
  gridToNoteEvents,
  initialGrid,
  palettesForGrid,
  validateGrid,
  GRID_ACTION_LABEL,
  type GridPhrase,
} from '../theory/grid';
import type { GuitarPosition } from '../theory/guitar';
import type { Clef, NotationMode } from '../theory/instruments';
import { KEYS, mod12 } from '../theory/notes';
import {
  approachAsNotes,
  approachPairAsNotes,
  blueNoteDemoAsNotes,
  bluesRiffAsNotes,
  chordTonesAsNotes,
  degreePathAsNotes,
  enclosureAsNotes,
  guideTonesAsNotes,
  landingWithApproachAsNotes,
  sampleMotifAsNotes,
  scaleAsNotes,
  targetAsNotes,
  tensionsAsNotes,
  type NoteEvent,
  type ToneRhythmId,
} from '../theory/phrases';
import { changeMeasures, type Progression } from '../theory/progressions';
import { loadCourseProgress, saveCourseProgress } from '../state/storage';
import { pick, t as tr, type Lang } from '../i18n';

/** STEPのcontent設定から、説明と完全に一致する音だけを生成する */
function generateStepNotes(content: StepContent, progression: Progression, keyPc: number): NoteEvent[] {
  let notes: NoteEvent[];
  const rhythm = content.rhythm ?? 'basic';
  switch (content.source) {
    case 'root': notes = degreePathAsNotes(progression, keyPc, ['root'], rhythm); break;
    case 'third': notes = degreePathAsNotes(progression, keyPc, ['third'], rhythm); break;
    case 'seventh': notes = degreePathAsNotes(progression, keyPc, ['seventh'], rhythm); break;
    case 'custom-path': notes = degreePathAsNotes(progression, keyPc, content.path?.length ? content.path : ['root'], rhythm); break;
    case 'guide-tones': notes = guideTonesAsNotes(progression, keyPc, rhythm as ToneRhythmId); break;
    case 'target': notes = targetAsNotes(progression, keyPc); break;
    case 'approach': notes = approachAsNotes(progression, keyPc); break;
    case 'approach-pair': notes = approachPairAsNotes(progression, keyPc, content.targetDegree ?? 'third', content.approachFrom ?? 'below'); break;
    case 'enclosure': notes = enclosureAsNotes(progression, keyPc, content.targetDegree ?? 'third'); break;
    case 'landing-approach': notes = landingWithApproachAsNotes(progression, keyPc, content.targetDegree ?? 'third'); break;
    case 'sample-motif': notes = sampleMotifAsNotes(progression, keyPc, content.motifVariant ?? 'repeat'); break;
    case 'blues-riff': notes = bluesRiffAsNotes(progression, keyPc); break;
    case 'blue-note-demo': notes = blueNoteDemoAsNotes(progression, keyPc); break;
    case 'scale': notes = scaleAsNotes(progression, keyPc); break;
    case 'tension': notes = tensionsAsNotes(progression, keyPc); break;
    case 'chord-tones': default: notes = chordTonesAsNotes(progression, keyPc, rhythm as ToneRhythmId, content.arpPattern ?? 'up'); break;
  }
  let allowed: number[] | null = null;
  if (content.activeOnChordChangesOnly) allowed = changeMeasures(progression);
  else if (content.activeMeasures) allowed = content.activeMeasures;
  if (allowed) {
    const set = new Set(allowed);
    notes = notes.filter((n) => set.has(Math.floor(n.start / 4 + 0.0001)));
  }
  return notes;
}

/** STEPごとの編集状態(グリッド+Undo履歴)。keyPcは生成時のキー */
export interface StepDraftState {
  keyPc: number;
  history: GridPhrase[];
  hIdx: number;
}

/** 編集課題の小節数ぶんの進行(コード表示・伴奏・パレットに使う) */
function progressionSlice(progression: Progression, bars: number): Progression {
  if (bars >= progression.measures) return progression;
  return {
    ...progression,
    measures: bars,
    chords: progression.chords.filter((c) => c.measure < bars),
  };
}

interface ResolvedEditable {
  prog: Progression;
  initial: GridPhrase;
  grid: GridPhrase;
  usable: boolean;
  result: ReturnType<typeof validateGrid>;
}

/** 編集STEPの現在状態をdraftとルールから解決する(親の達成判定と子の表示が共有する) */
function resolveEditable(
  editable: StepEditable,
  progression: Progression,
  keyPc: number,
  flats: boolean,
  draft: StepDraftState | null,
): ResolvedEditable {
  const prog = progressionSlice(progression, editable.bars);
  const initial = initialGrid(editable.initial, editable.bars, prog, keyPc, editable.material, flats, editable.initialDivision ?? 2);
  const palettes = palettesForGrid(prog, keyPc, editable.bars, editable.material, flats);
  const usable = !!draft
    && draft.keyPc === keyPc
    && draft.history[draft.hIdx].bars.length === editable.bars
    && gridMatchesPalettes(draft.history[draft.hIdx], palettes);
  const grid = usable ? draft!.history[draft!.hIdx] : initial;
  const result = validateGrid(grid, editable.conditions, editable.requiredAction, initial, { progression: prog, keyPc });
  return { prog, initial, grid, usable, result };
}

interface SharedProps {
  lang: Lang;
  progression: Progression;
  keyPc: number;
  shift: number;
  flats: boolean;
  clef: Clef;
  notation: NotationMode;
  guitarPosition: GuitarPosition;
  guitarOpenStrings: boolean;
  bpm: number;
  countIn: boolean;
  metronomeOn: boolean;
  clickPattern: 'all' | 'backbeat';
  compOn: boolean;
  labelMode: LabelMode;
  setLabelMode: (m: LabelMode) => void;
  registerStop: (fn: (() => void) | null) => void;
}

function LabelModeToggle({ lang, labelMode, setLabelMode }: { lang: Lang; labelMode: LabelMode; setLabelMode: (m: LabelMode) => void }) {
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);
  const opts: { id: LabelMode; label: string }[] = [
    { id: 'none', label: t('labelNone') },
    { id: 'name', label: 'C D E' },
    { id: 'degree', label: t('labelDegree') },
  ];
  return (
    <div className="seg-group" role="group" aria-label={t('staffTitle')}>
      {opts.map((o) => (
        <button key={o.id} className={`seg${labelMode === o.id ? ' on' : ''}`} aria-pressed={labelMode === o.id} onClick={() => setLabelMode(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function chordDisplaysFor(prog: Progression, keyPc: number, shift: number, flats: boolean): ChordDisplay[] {
  return prog.chords.map((c) => {
    const rootPc = mod12(keyPc + c.rootOffset + shift);
    return { measure: c.measure, beat: c.beat, symbol: chordSymbol(rootPc, c.quality, flats), rootPc, quality: c.quality };
  });
}

function FixedStepBody({
  lang, content, progression, keyPc, shift, flats, clef, notation, guitarPosition, guitarOpenStrings,
  bpm, countIn, metronomeOn, clickPattern, compOn, labelMode, setLabelMode, registerStop,
}: SharedProps & { content: StepContent }) {
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);

  const displayedNotes = useMemo(() => generateStepNotes(content, progression, keyPc), [content, progression, keyPc]);
  const chordDisplays = useMemo(() => chordDisplaysFor(progression, keyPc, shift, flats), [progression, keyPc, shift, flats]);

  const { playing, currentNoteIndex, startPlayback, stopAll } = usePracticePlayback({
    progression, effKeyPc: keyPc, displayedNotes, bpm, countIn,
    loopEnabled: true, metronomeOn, clickPattern, compOn, swing: 1 / 6, loopRange: 'full', selectedMeasure: 0,
  });

  useEffect(() => {
    registerStop(stopAll);
    return () => registerStop(null);
  }, [stopAll, registerStop]);

  return (
    <>
      <div className="staff-head">
        <h4>{t('staffTitle')}</h4>
        <LabelModeToggle lang={lang} labelMode={labelMode} setLabelMode={setLabelMode} />
      </div>
      <div className="staff-card">
        <StaffView
          notes={displayedNotes} measures={progression.measures} clef={clef} shift={shift} flats={flats}
          labelMode={labelMode} chords={chordDisplays} currentIndex={currentNoteIndex}
          notation={notation} guitarPosition={guitarPosition} guitarOpenStrings={guitarOpenStrings}
        />
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
    </>
  );
}

interface EditableStepBodyProps extends SharedProps {
  editable: StepEditable;
  draft: StepDraftState | null;
  onDraftChange: (next: StepDraftState) => void;
}

function EditableStepBody({
  lang, editable, progression, keyPc, shift, flats, clef, notation, guitarPosition, guitarOpenStrings,
  bpm, countIn, metronomeOn, clickPattern, compOn, labelMode, setLabelMode, registerStop,
  draft, onDraftChange,
}: EditableStepBodyProps) {
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);

  const resolved = useMemo(
    () => resolveEditable(editable, progression, keyPc, flats, draft),
    [editable, progression, keyPc, flats, draft],
  );
  const { prog, initial, grid, usable, result: validation } = resolved;

  // draftが無い/不整合(初回・キー変更直後)なら、初期グリッドを正規のdraftとして保存
  useEffect(() => {
    if (!usable) onDraftChange({ keyPc, history: [initial], hIdx: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usable, keyPc]);

  const hIdx = usable ? draft!.hIdx : 0;
  const history = usable ? draft!.history : [initial];

  const changeGrid = (next: GridPhrase) => {
    const trimmed = history.slice(0, hIdx + 1);
    onDraftChange({ keyPc, history: [...trimmed, next], hIdx: trimmed.length });
  };
  const undo = () => onDraftChange({ keyPc, history, hIdx: Math.max(0, hIdx - 1) });
  const redo = () => onDraftChange({ keyPc, history, hIdx: Math.min(history.length - 1, hIdx + 1) });
  const reset = () => {
    if (window.confirm(t('resetConfirm'))) onDraftChange({ keyPc, history: [initial], hIdx: 0 });
  };

  const displayedNotes = useMemo(() => gridToNoteEvents(grid), [grid]);
  const chordDisplays = useMemo(() => chordDisplaysFor(prog, keyPc, shift, flats), [prog, keyPc, shift, flats]);

  const { playing, currentNoteIndex, startPlayback, stopAll } = usePracticePlayback({
    progression: prog, effKeyPc: keyPc, displayedNotes, bpm, countIn,
    loopEnabled: true, metronomeOn, clickPattern, compOn, swing: 1 / 6, loopRange: 'full', selectedMeasure: 0,
  });

  useEffect(() => {
    registerStop(stopAll);
    return () => registerStop(null);
  }, [stopAll, registerStop]);

  const check = (overrides: PlaybackOverrides) => startPlayback('example', overrides);

  // 達成チェックリスト(操作課題+形式条件)
  const reqItems: { key: string; label: string; met: boolean }[] = [];
  if (editable.requiredAction) {
    reqItems.push({
      key: 'action',
      label: pick(lang, GRID_ACTION_LABEL[editable.requiredAction].ja, GRID_ACTION_LABEL[editable.requiredAction].en),
      met: validation.actionCompleted || fullSignature(grid) !== fullSignature(initial),
    });
  }
  const condErrors = new Set(validation.errors.map((e) => e.code));
  const c = editable.conditions ?? {};
  if (c.minNotes !== undefined) reqItems.push({ key: 'minNotes', label: pick(lang, `音符を${c.minNotes}個以上`, `At least ${c.minNotes} notes`), met: !condErrors.has('minNotes') });
  if (c.minRestBeats !== undefined) reqItems.push({ key: 'minRest', label: pick(lang, `休みを合計${c.minRestBeats}拍以上`, `${c.minRestBeats}+ beats of rest`), met: !condErrors.has('minRest') });
  if (c.minRestBeatsPerBar !== undefined) reqItems.push({ key: 'restPerBar', label: pick(lang, `各小節に${c.minRestBeatsPerBar}拍以上の休み`, `${c.minRestBeatsPerBar}+ rest beat(s) per bar`), met: !condErrors.has('restPerBar') });
  if (c.requireCrossBarHold) reqItems.push({ key: 'crossBar', label: pick(lang, '小節線をまたぐ音', 'A note across a barline'), met: !condErrors.has('crossBar') });
  if (c.requireOffbeatAttack) reqItems.push({ key: 'offbeat', label: pick(lang, '裏拍から始まる音', 'A note starting on an offbeat'), met: !condErrors.has('offbeat') });
  if (c.requireTriplet) reqItems.push({ key: 'triplet', label: pick(lang, '3連の拍を使う', 'Use a triplet beat'), met: !condErrors.has('triplet') });
  if (c.requireSixteenth) reqItems.push({ key: 'sixteenth', label: pick(lang, '16分の拍を使う', 'Use a 16th beat'), met: !condErrors.has('sixteenth') });
  if (c.requireArticulation) reqItems.push({ key: 'artic', label: pick(lang, '表情記号を1つ以上', 'Use an articulation'), met: !condErrors.has('artic') });
  if (c.requireEndOn3rd) reqItems.push({ key: 'end3rd', label: pick(lang, '最後の音は3度で着地', 'End on the 3rd'), met: !condErrors.has('end3rd') });

  return (
    <>
      <div className="staff-head">
        <h4>{t('staffTitle')}</h4>
        <LabelModeToggle lang={lang} labelMode={labelMode} setLabelMode={setLabelMode} />
      </div>
      <div className="staff-card">
        <StaffView
          notes={displayedNotes} measures={prog.measures} clef={clef} shift={shift} flats={flats}
          labelMode={labelMode} chords={chordDisplays} currentIndex={currentNoteIndex}
          notation={notation} guitarPosition={guitarPosition} guitarOpenStrings={guitarOpenStrings}
        />
      </div>

      <GridEditor
        lang={lang}
        grid={grid}
        onChange={changeGrid}
        progression={prog}
        keyPc={keyPc}
        flats={flats}
        material={editable.material}
        divisions={editable.divisions}
        fixedRhythm={editable.fixedRhythm}
        fixedPitch={editable.fixedPitch}
        allowArticulation={editable.allowArticulation}
        currentIndex={currentNoteIndex >= 0 && currentNoteIndex < attackPositions(grid).length ? currentNoteIndex : -1}
      />

      {reqItems.length > 0 && (
        <ul className="req-checklist">
          {reqItems.map((r) => (
            <li key={r.key} className={r.met ? 'met' : 'unmet'}>{r.met ? '✓' : '○'} {r.label}</li>
          ))}
        </ul>
      )}
      {validation.errors.length > 0 && (
        <div className="step-validation-warning">
          {validation.errors.map((e) => (
            <p key={e.code} className="beats-warning">⚠ {pick(lang, e.message.ja, e.message.en)}</p>
          ))}
          {!validation.stepCompleted && (
            <p className="hint-text">{t('partialPlaybackHint')}</p>
          )}
        </div>
      )}

      <div className="transport-opts composer-undo-row">
        <div className="seg-group">
          <button className="seg" onClick={undo} disabled={hIdx === 0} aria-label={t('undoBtn')}>↩ {t('undoBtn')}</button>
          <button className="seg" onClick={redo} disabled={hIdx >= history.length - 1} aria-label={t('redoBtn')}>↪ {t('redoBtn')}</button>
          <button className="seg" onClick={reset} aria-label={t('resetPhrase')}>⟲ {t('resetPhrase')}</button>
        </div>
      </div>

      <div className="transport-main">
        {playing ? (
          <button className="btn big stop" onClick={stopAll}>■ Stop</button>
        ) : (
          <>
            <button className="btn big example" onClick={() => check({ compOn: false })}>♪ {t('checkSingle')}</button>
            <button className="btn big example" onClick={() => check({ compOn: true })}>♪ {t('checkWithChord')}</button>
            <button className="btn big start" onClick={() => startPlayback('backing')}>▶ Start</button>
          </>
        )}
      </div>
      <p className="hint-text">{t('playSelfHint')}</p>
    </>
  );
}

interface Props {
  lang: Lang;
  lesson: Lesson;
  progression: Progression;
  keyPc: number;
  setKeyPc: (pc: number) => void;
  shift: number;
  flats: boolean;
  clef: Clef;
  notation: NotationMode;
  guitarPosition: GuitarPosition;
  guitarOpenStrings: boolean;
  bpm: number;
  setBpm: (bpm: number) => void;
  countIn: boolean;
  setCountIn: (v: boolean) => void;
  metronomeOn: boolean;
  setMetronomeOn: (v: boolean) => void;
  clickPattern: 'all' | 'backbeat';
  setClickPattern: (p: 'all' | 'backbeat') => void;
  compOn: boolean;
  setCompOn: (v: boolean) => void;
  labelMode: LabelMode;
  setLabelMode: (m: LabelMode) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onProgressChange?: (progress: { allStepsDone: boolean; pendingCount: number }) => void;
  registerStop: (fn: (() => void) | null) => void;
}

export function StepPractice({
  lang, lesson, progression, keyPc, setKeyPc, shift, flats, clef, notation, guitarPosition, guitarOpenStrings,
  bpm, setBpm, countIn, setCountIn, metronomeOn, setMetronomeOn, clickPattern, setClickPattern,
  compOn, setCompOn, labelMode, setLabelMode, onDirtyChange, onProgressChange, registerStop,
}: Props) {
  const t = (key: Parameters<typeof tr>[1]) => tr(lang, key);
  const p = (x: Bi) => pick(lang, x.ja, x.en);
  const [currentStep, setCurrentStep] = useState(0);
  const [drafts, setDrafts] = useState<Record<number, StepDraftState>>({});
  const initialVisited = (): Record<number, boolean> => (lesson.steps[0]?.editable ? {} : { 0: true });
  const [visitedFixed, setVisitedFixed] = useState<Record<number, boolean>>(initialVisited);
  // はしご達成(localStorage保存)
  const [ladderDone, setLadderDone] = useState<string[]>(() => loadCourseProgress().ladders?.[lesson.id] ?? []);
  const step = lesson.steps[currentStep];
  const total = lesson.steps.length;
  const activeDraft = drafts[currentStep] ?? null;

  useEffect(() => {
    setCurrentStep(0);
    setDrafts({});
    setVisitedFixed(initialVisited());
    setLadderDone(loadCourseProgress().ladders?.[lesson.id] ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);

  // キーが実際に変わったときだけ全draftを破棄(初回・再マウントではしない)
  const prevKeyRef = useRef(keyPc);
  useEffect(() => {
    if (prevKeyRef.current !== keyPc) {
      prevKeyRef.current = keyPc;
      setDrafts({});
    }
  }, [keyPc]);

  useEffect(() => {
    onDirtyChange?.(Object.values(drafts).some((d) => d.hIdx > 0));
  }, [drafts, onDirtyChange]);

  // 達成状態はdraftとルールから毎レンダー導出(状態同期バグを構造的に防ぐ)
  const stepCompletion = useMemo(
    () => lesson.steps.map((s, i) => {
      if (!s.editable) return !!visitedFixed[i];
      return resolveEditable(s.editable, progression, keyPc, flats, drafts[i] ?? null).result.stepCompleted;
    }),
    [lesson.steps, visitedFixed, drafts, progression, keyPc, flats],
  );
  const currentDone = stepCompletion[currentStep];
  const pendingCount = stepCompletion.filter((done) => !done).length;

  useEffect(() => {
    onProgressChange?.({ allStepsDone: pendingCount === 0, pendingCount });
  }, [pendingCount, onProgressChange]);

  const goToStep = (i: number) => {
    if (i === currentStep) return;
    setCurrentStep(i);
    if (!lesson.steps[i].editable) setVisitedFixed((d) => ({ ...d, [i]: true }));
  };

  const toggleLadder = (token: string) => {
    const progress = loadCourseProgress();
    const cur = progress.ladders?.[lesson.id] ?? [];
    const next = cur.includes(token) ? cur.filter((x) => x !== token) : [...cur, token];
    const updated = { ...progress, ladders: { ...(progress.ladders ?? {}), [lesson.id]: next } };
    saveCourseProgress(updated);
    setLadderDone(next);
  };

  const fallbackContent: StepContent = { source: 'chord-tones', rhythm: 'basic' };

  return (
    <section className="panel step-practice">
      <h2>{t('practiceTitle')}</h2>

      <div className="step-tablist" role="tablist" aria-label={t('stepsTitle')}>
        {lesson.steps.map((s, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={currentStep === i}
            className={`step-dot${currentStep === i ? ' on' : ''}${stepCompletion[i] ? ' past' : ''}`}
            onClick={() => goToStep(i)}
          >
            <span className="step-dot-num">{stepCompletion[i] ? '✓' : i + 1}</span>
            <span className="step-dot-title">{p(s.title)}</span>
          </button>
        ))}
      </div>
      <p className="step-progress-label">{t('stepLabel')} {currentStep + 1} / {total}</p>

      <div className="step-head">
        <h3>{p(step.title)}</h3>
        <span className="lesson-step-label">🎯 {t('stepGoalLabel')}</span>
        <p className="step-card-text">{p(step.instruction)}</p>
        {step.rules && step.rules.length > 0 && (
          <div className="step-rules">
            <span className="lesson-step-label">📌 {t('stepRulesTitle')}</span>
            <div className="rule-chips">
              {step.rules.map((r, i) => (
                <span key={i} className="rule-chip">{p(r)}</span>
              ))}
            </div>
          </div>
        )}
        {step.editable && <p className="hint-text editable-task">📝 {p(step.editable.task)}</p>}
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="step-key">{t('keyLabel')}</label>
          <select id="step-key" value={keyPc} onChange={(e) => setKeyPc(Number(e.target.value))}>
            {KEYS.map((k) => (
              <option key={k.pc} value={k.pc}>{k.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="step-bpm">{t('tempoLabel')}: <strong>{bpm} BPM</strong></label>
          <input id="step-bpm" type="range" min={40} max={220} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
        </div>
      </div>

      {(lesson.tempoLadder || lesson.keyLadder) && (
        <div className="ladder-panel">
          {lesson.tempoLadder && (
            <div className="ladder-row">
              <span className="opt-label">🪜 {t('tempoLadderLabel')}:</span>
              <div className="seg-group">
                {lesson.tempoLadder.map((v) => {
                  const token = `bpm:${v}`;
                  const done = ladderDone.includes(token);
                  return (
                    <button
                      key={v}
                      className={`seg${bpm === v ? ' on' : ''}`}
                      aria-pressed={bpm === v}
                      onClick={() => setBpm(v)}
                    >
                      {done ? '✓' : ''}{v}
                    </button>
                  );
                })}
                <button className="seg" onClick={() => toggleLadder(`bpm:${bpm}`)}>
                  {ladderDone.includes(`bpm:${bpm}`) ? t('ladderUnclear') : t('ladderClear')}
                </button>
              </div>
            </div>
          )}
          {lesson.keyLadder && (
            <div className="ladder-row">
              <span className="opt-label">🗝 {t('keyLadderLabel')}:</span>
              <div className="seg-group">
                {lesson.keyLadder.map((pc) => {
                  const token = `key:${pc}`;
                  const done = ladderDone.includes(token);
                  const name = KEYS.find((k) => k.pc === pc)?.name ?? String(pc);
                  return (
                    <button
                      key={pc}
                      className={`seg${keyPc === pc ? ' on' : ''}`}
                      aria-pressed={keyPc === pc}
                      onClick={() => setKeyPc(pc)}
                    >
                      {done ? '✓' : ''}{name}
                    </button>
                  );
                })}
                <button className="seg" onClick={() => toggleLadder(`key:${keyPc}`)}>
                  {ladderDone.includes(`key:${keyPc}`) ? t('ladderUnclear') : t('ladderClear')}
                </button>
              </div>
            </div>
          )}
          <p className="hint-text">{t('ladderHint')}</p>
        </div>
      )}

      {step.editable ? (
        <EditableStepBody
          key={currentStep}
          lang={lang} editable={step.editable} progression={progression} keyPc={keyPc} shift={shift} flats={flats}
          clef={clef} notation={notation} guitarPosition={guitarPosition} guitarOpenStrings={guitarOpenStrings}
          bpm={bpm} countIn={countIn} metronomeOn={metronomeOn} clickPattern={clickPattern} compOn={compOn}
          labelMode={labelMode} setLabelMode={setLabelMode}
          registerStop={registerStop}
          draft={activeDraft}
          onDraftChange={(next) => setDrafts((d) => ({ ...d, [currentStep]: next }))}
        />
      ) : (
        <FixedStepBody
          key={currentStep}
          lang={lang} content={step.content ?? fallbackContent} progression={progression} keyPc={keyPc} shift={shift} flats={flats}
          clef={clef} notation={notation} guitarPosition={guitarPosition} guitarOpenStrings={guitarOpenStrings}
          bpm={bpm} countIn={countIn} metronomeOn={metronomeOn} clickPattern={clickPattern} compOn={compOn}
          labelMode={labelMode} setLabelMode={setLabelMode}
          registerStop={registerStop}
        />
      )}

      <div className="transport-opts">
        <label className="toggle"><input type="checkbox" checked={countIn} onChange={(e) => setCountIn(e.target.checked)} /> 4 Count In</label>
        <label className="toggle"><input type="checkbox" checked={metronomeOn} onChange={(e) => setMetronomeOn(e.target.checked)} /> {t('metronome')}</label>
        <label className="toggle">
          <input type="checkbox" checked={clickPattern === 'backbeat'} onChange={(e) => setClickPattern(e.target.checked ? 'backbeat' : 'all')} />
          {t('backbeatClick')}
        </label>
        <label className="toggle"><input type="checkbox" checked={compOn} onChange={(e) => setCompOn(e.target.checked)} /> {t('compSound')}</label>
      </div>

      <VolumeControls lang={lang} />

      <div className="step-footer-nav">
        <button className="btn" onClick={() => goToStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0}>
          ← {t('prevStep')}
        </button>
        <span className="hint-text">{step.editable && !currentDone ? t('stepBlockedHint') : t('stepDoneHint')}</span>
        <button
          className="btn"
          onClick={() => goToStep(Math.min(total - 1, currentStep + 1))}
          disabled={currentStep === total - 1 || (!!step.editable && !currentDone)}
        >
          {t('nextStep')} →
        </button>
      </div>
    </section>
  );
}
